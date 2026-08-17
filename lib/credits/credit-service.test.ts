import { AiUsageStatus, CreditLedgerEntryType, CreditPool, Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCreditService } from '@/lib/credits/credit-service';
import { InsufficientCreditsError } from '@/lib/credits/errors';

type BalanceRow = {
  userId: string;
  email: string;
  credits: number;
  freeCredits: number;
  paidCredits: number;
  freeResetAt: Date | null;
};

type LedgerRow = {
  id: string;
  userId: string;
  accountEmail: string;
  amount: number;
  pool: CreditPool | null;
  type: CreditLedgerEntryType;
  idempotencyKey: string | null;
  aiUsageId?: string | null;
  adminUserId?: string | null;
  reason?: string | null;
};

type UsageRow = {
  id: string;
  userId: string;
  provider: string;
  model: string;
  operation: string;
  status: AiUsageStatus;
  idempotencyKey: string;
  creditsCharged: number;
  freeCharged: number;
  paidCharged: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  errorCode: string | null;
};

function increment(current: number, data: unknown): number {
  if (data && typeof data === 'object' && 'increment' in data) {
    return current + Number((data as { increment: number }).increment);
  }
  if (data && typeof data === 'object' && 'decrement' in data) {
    return current - Number((data as { decrement: number }).decrement);
  }
  return Number(data);
}

function createMemoryDb() {
  const balances = new Map<string, BalanceRow>();
  const ledger = new Map<string, LedgerRow>();
  const usages = new Map<string, UsageRow>();
  let seq = 1;

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'user-1' ? { email: 'owner@example.com' } : null,
    },
    creditBalance: {
      findUnique: async ({ where }: { where: { userId: string } }) => balances.get(where.userId) ?? null,
      create: async ({ data }: { data: BalanceRow }) => {
        if (balances.has(data.userId)) {
          throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' });
        }
        balances.set(data.userId, { ...data });
        return balances.get(data.userId)!;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const current = balances.get(String(where.userId));
        if (!current) {
          return { count: 0 };
        }
        const freeGte = (where.freeCredits as { gte?: number } | undefined)?.gte;
        const paidGte = (where.paidCredits as { gte?: number } | undefined)?.gte;
        if (typeof freeGte === 'number' && current.freeCredits < freeGte) {
          return { count: 0 };
        }
        if (typeof paidGte === 'number' && current.paidCredits < paidGte) {
          return { count: 0 };
        }
        const or = where.OR as Array<Record<string, unknown>> | undefined;
        if (or) {
          const resetAt = current.freeResetAt;
          const matches = or.some((clause) => {
            if (clause.freeResetAt === null) {
              return resetAt === null;
            }
            const lte = (clause.freeResetAt as { lte?: Date } | undefined)?.lte;
            return Boolean(lte && resetAt && resetAt.getTime() <= lte.getTime());
          });
          if (!matches) {
            return { count: 0 };
          }
        }
        current.freeCredits = increment(current.freeCredits, data.freeCredits ?? current.freeCredits);
        current.paidCredits = increment(current.paidCredits, data.paidCredits ?? current.paidCredits);
        if (data.freeResetAt instanceof Date) {
          current.freeResetAt = data.freeResetAt;
        }
        if (current.freeCredits < 0 || current.paidCredits < 0) {
          throw new Error('negative balance');
        }
        return { count: 1 };
      },
    },
    creditLedgerEntry: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
        [...ledger.values()].find((row) => row.idempotencyKey === where.idempotencyKey) ?? null,
      create: async ({ data }: { data: LedgerRow }) => {
        if (data.idempotencyKey && [...ledger.values()].some((row) => row.idempotencyKey === data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' });
        }
        const row = { ...data, id: `l${seq++}` };
        ledger.set(row.id, row);
        return row;
      },
      createMany: async ({ data }: { data: LedgerRow[] }) => {
        for (const row of data) {
          await prisma.creditLedgerEntry.create({ data: row });
        }
        return { count: data.length };
      },
    },
    aiUsage: {
      findUnique: async ({ where }: { where: { idempotencyKey?: string; id?: string } }) => {
        if (where.id) {
          return usages.get(where.id) ?? null;
        }
        return [...usages.values()].find((row) => row.idempotencyKey === where.idempotencyKey) ?? null;
      },
      create: async ({ data }: { data: Partial<UsageRow> }) => {
        if (data.idempotencyKey && [...usages.values()].some((row) => row.idempotencyKey === data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' });
        }
        const row: UsageRow = {
          id: `u${seq++}`,
          userId: String(data.userId),
          provider: String(data.provider),
          model: String(data.model),
          operation: String(data.operation),
          status: data.status as AiUsageStatus,
          idempotencyKey: String(data.idempotencyKey),
          creditsCharged: Number(data.creditsCharged),
          freeCharged: Number(data.freeCharged),
          paidCharged: Number(data.paidCharged),
          inputTokens: Number(data.inputTokens || 0),
          outputTokens: Number(data.outputTokens || 0),
          estimatedCost: Number(data.estimatedCost || 0),
          errorCode: data.errorCode ?? null,
        };
        usages.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<UsageRow> }) => {
        const current = usages.get(where.id);
        if (!current) {
          throw new Error('missing');
        }
        Object.assign(current, data);
        return current;
      },
    },
  };

  return { prisma, balances, ledger, usages };
}

describe('CreditService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, FREE_DAILY_CREDITS: '15', CREDIT_TZ: 'Europe/Paris' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('crée un quota quotidien au premier accès sans accumulation', async () => {
    const { prisma, balances } = createMemoryDb();
    let now = new Date('2026-08-15T10:00:00.000+02:00');
    const service = createCreditService({ prisma: prisma as never, now: () => now });

    const first = await service.ensureDailyFreeCredits('user-1');
    expect(first.freeCredits).toBe(15);
    expect(first.paidCredits).toBe(0);

    balances.get('user-1')!.freeCredits = 60;
    const sameDay = await service.ensureDailyFreeCredits('user-1');
    expect(sameDay.freeCredits).toBe(60);

    now = new Date('2026-08-16T00:30:00.000+02:00');
    const nextDay = await service.ensureDailyFreeCredits('user-1');
    expect(nextDay.freeCredits).toBe(15);
  });

  it('consomme free avant paid et traverse les deux pools', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.freeCredits = 3;
    balances.get('user-1')!.paidCredits = 20;

    const reservation = await service.reserve({
      userId: 'user-1',
      operation: 'GENERATE_LETTER',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'op-1',
      cost: 5,
    });

    expect(reservation.freeCharged).toBe(3);
    expect(reservation.paidCharged).toBe(2);
    expect(balances.get('user-1')!.freeCredits).toBe(0);
    expect(balances.get('user-1')!.paidCredits).toBe(18);
  });

  it('refuse un solde insuffisant et ne passe jamais négatif', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.freeCredits = 2;
    balances.get('user-1')!.paidCredits = 2;

    await expect(
      service.reserve({
        userId: 'user-1',
        operation: 'GENERATE_LETTER',
        provider: 'mock',
        model: 'mock-ai',
        idempotencyKey: 'op-low',
        cost: 10,
      })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);

    expect(balances.get('user-1')!.freeCredits).toBe(2);
    expect(balances.get('user-1')!.paidCredits).toBe(2);
  });

  it('restaure les bons pools au rollback', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.freeCredits = 4;
    balances.get('user-1')!.paidCredits = 6;

    const reservation = await service.reserve({
      userId: 'user-1',
      operation: 'ASK_QUESTION',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'rb-1',
      cost: 5,
    });
    await service.rollback({ usageId: reservation.usageId, reason: 'provider_error' });

    expect(balances.get('user-1')!.freeCredits).toBe(4);
    expect(balances.get('user-1')!.paidCredits).toBe(6);
  });

  it('est idempotent pour une même opération IA et un même achat', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.paidCredits = 50;

    const first = await service.reserve({
      userId: 'user-1',
      operation: 'GENERATE_LETTER',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'same-op',
      cost: 10,
    });
    const second = await service.reserve({
      userId: 'user-1',
      operation: 'GENERATE_LETTER',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'same-op',
      cost: 10,
    });
    expect(second.usageId).toBe(first.usageId);
    expect(balances.get('user-1')!.paidCredits + balances.get('user-1')!.freeCredits).toBe(55);

    await service.addPurchasedCredits({
      userId: 'user-1',
      amount: 10,
      idempotencyKey: 'stripe:session:abc',
      sessionId: 'abc',
    });
    await service.addPurchasedCredits({
      userId: 'user-1',
      amount: 10,
      idempotencyKey: 'stripe:session:abc',
      sessionId: 'abc',
    });
    expect(balances.get('user-1')!.paidCredits).toBe(60);
  });

  it('enregistre settle avec tokens et coût, sans contenu sensible', async () => {
    const { prisma, balances, usages } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    const reservation = await service.reserve({
      userId: 'user-1',
      operation: 'GENERATE_LETTER',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'usage-1',
      cost: 10,
    });
    await service.settle({
      usageId: reservation.usageId,
      inputTokens: 120,
      outputTokens: 240,
      estimatedCost: 162000,
    });
    const usage = usages.get(reservation.usageId)!;
    expect(usage.status).toBe(AiUsageStatus.SETTLED);
    expect(usage.inputTokens).toBe(120);
    expect(usage).not.toHaveProperty('letter');
    expect(usage).not.toHaveProperty('prompt');
    expect(usage).not.toHaveProperty('emailVersion');
    expect(JSON.stringify(usage)).not.toMatch(/"prompt"|"emailVersion"/);
    expect(balances.get('user-1')!.freeCredits).toBe(5);
  });

  it('empêche deux réservations concurrentes de dépasser le solde', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.freeCredits = 10;
    balances.get('user-1')!.paidCredits = 0;

    const results = await Promise.allSettled([
      service.reserve({
        userId: 'user-1',
        operation: 'GENERATE_LETTER',
        provider: 'mock',
        model: 'mock-ai',
        idempotencyKey: 'c1',
        cost: 8,
      }),
      service.reserve({
        userId: 'user-1',
        operation: 'GENERATE_LETTER',
        provider: 'mock',
        model: 'mock-ai',
        idempotencyKey: 'c2',
        cost: 8,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(balances.get('user-1')!.freeCredits).toBe(2);
    expect(balances.get('user-1')!.freeCredits).toBeGreaterThanOrEqual(0);
  });

  it('n’applique un cadeau admin qu’une fois avec la même clé', async () => {
    const { prisma, balances, ledger } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    await service.adminGift({
      userId: 'user-1',
      amount: 25,
      adminUserId: 'admin-1',
      reason: 'test',
      idempotencyKey: 'gift-1',
    });
    await service.adminGift({
      userId: 'user-1',
      amount: 25,
      adminUserId: 'admin-1',
      reason: 'test',
      idempotencyKey: 'gift-1',
    });
    expect(balances.get('user-1')!.paidCredits).toBe(25);
    const gifts = [...ledger.values()].filter((row) => row.type === 'ADMIN_GIFT');
    expect(gifts).toHaveLength(1);
    expect(gifts[0]).toMatchObject({
      amount: 25,
      pool: 'PAID',
      adminUserId: 'admin-1',
      reason: 'test',
    });
  });

  it('écrit un ajustement admin dans le ledger', async () => {
    const { prisma, balances, ledger } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.paidCredits = 10;

    await service.adminAdjust({
      userId: 'user-1',
      amount: -4,
      pool: 'PAID',
      adminUserId: 'admin-1',
      reason: 'correction',
      idempotencyKey: 'adj-1',
    });

    expect(balances.get('user-1')!.paidCredits).toBe(6);
    expect([...ledger.values()].filter((row) => row.type === 'ADMIN_ADJUSTMENT')).toHaveLength(1);
  });

  it('autorise deux réservations concurrentes si le solde suffit', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.freeCredits = 20;
    balances.get('user-1')!.paidCredits = 0;

    const results = await Promise.allSettled([
      service.reserve({
        userId: 'user-1',
        operation: 'ASK_QUESTION',
        provider: 'mock',
        model: 'mock-ai',
        idempotencyKey: 'ok1',
        cost: 8,
      }),
      service.reserve({
        userId: 'user-1',
        operation: 'ASK_QUESTION',
        provider: 'mock',
        model: 'mock-ai',
        idempotencyKey: 'ok2',
        cost: 8,
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(balances.get('user-1')!.freeCredits).toBe(4);
  });

  it('peut réserver à nouveau après rollback avec la même clé', async () => {
    const { prisma, balances } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.freeCredits = 10;

    const first = await service.reserve({
      userId: 'user-1',
      operation: 'ASK_QUESTION',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'retry-op',
      cost: 4,
    });
    await service.rollback({ usageId: first.usageId, reason: 'provider_error' });
    expect(balances.get('user-1')!.freeCredits).toBe(10);

    const second = await service.reserve({
      userId: 'user-1',
      operation: 'ASK_QUESTION',
      provider: 'mock',
      model: 'mock-ai',
      idempotencyKey: 'retry-op',
      cost: 4,
    });
    expect(second.status).toBe(AiUsageStatus.RESERVED);
    expect(balances.get('user-1')!.freeCredits).toBe(6);
  });

  it('écrit un remboursement paid sans le rejouer', async () => {
    const { prisma, balances, ledger } = createMemoryDb();
    const service = createCreditService({
      prisma: prisma as never,
      now: () => new Date('2026-08-15T10:00:00.000+02:00'),
    });
    await service.ensureDailyFreeCredits('user-1');
    balances.get('user-1')!.paidCredits = 40;

    await service.refundPaidCredits({
      userId: 'user-1',
      amount: 10,
      idempotencyKey: 'refund:session:abc',
      sessionId: 'abc',
      reason: 'stripe_refund',
    });
    await service.refundPaidCredits({
      userId: 'user-1',
      amount: 10,
      idempotencyKey: 'refund:session:abc',
      sessionId: 'abc',
      reason: 'stripe_refund',
    });

    expect(balances.get('user-1')!.paidCredits).toBe(30);
    expect([...ledger.values()].filter((row) => row.type === 'REFUND')).toHaveLength(1);
  });
});
