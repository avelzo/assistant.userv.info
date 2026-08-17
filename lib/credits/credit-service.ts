import {
  AiOperation,
  AiUsageStatus,
  CreditLedgerEntrySource,
  CreditLedgerEntryType,
  CreditPool,
  Prisma,
  type CreditBalance,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { aiUsageRetentionDays } from '@/lib/retention';
import { getAiCreditCost, getCreditTimeZone, getDailyFreeCredits, type AiCreditOperation } from '@/lib/credits/config';
import { CreditConflictError, InsufficientCreditsError } from '@/lib/credits/errors';
import { nextCreditResetAt } from '@/lib/credits/timezone';

const RESERVE_ATTEMPTS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CreditBalanceView = {
  userId: string;
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  nextFreeResetAt: string;
  dailyFreeLimit: number;
};

export type Reservation = {
  usageId: string;
  idempotencyKey: string;
  status: AiUsageStatus;
  creditsCharged: number;
  freeCharged: number;
  paidCharged: number;
  alreadySettled: boolean;
};

type PrismaLike = {
  user: {
    findUnique: typeof defaultPrisma.user.findUnique;
  };
  creditBalance: {
    findUnique: typeof defaultPrisma.creditBalance.findUnique;
    create: typeof defaultPrisma.creditBalance.create;
    updateMany: typeof defaultPrisma.creditBalance.updateMany;
  };
  creditLedgerEntry: {
    findUnique: typeof defaultPrisma.creditLedgerEntry.findUnique;
    create: typeof defaultPrisma.creditLedgerEntry.create;
    createMany: typeof defaultPrisma.creditLedgerEntry.createMany;
  };
  aiUsage: {
    findUnique: typeof defaultPrisma.aiUsage.findUnique;
    create: typeof defaultPrisma.aiUsage.create;
    update: typeof defaultPrisma.aiUsage.update;
  };
};

export type CreditServiceDeps = {
  prisma?: PrismaLike;
  now?: () => Date;
};

function isUniqueError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function toView(balance: CreditBalance, dailyFreeLimit: number): CreditBalanceView {
  return {
    userId: balance.userId,
    freeCredits: balance.freeCredits,
    paidCredits: balance.paidCredits,
    totalCredits: balance.freeCredits + balance.paidCredits,
    nextFreeResetAt: (balance.freeResetAt ?? new Date()).toISOString(),
    dailyFreeLimit,
  };
}

function splitCost(freeCredits: number, paidCredits: number, cost: number): { free: number; paid: number } {
  const free = Math.min(cost, Math.max(0, freeCredits));
  const paid = cost - free;
  return { free, paid };
}

export function createCreditService(deps: CreditServiceDeps = {}) {
  const db = (deps.prisma ?? defaultPrisma) as PrismaLike;
  const now = deps.now ?? (() => new Date());

  async function getUserEmail(userId: string): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new Error('Compte introuvable.');
    }
    return user.email;
  }

  async function ensureDailyFreeCredits(userId: string): Promise<CreditBalanceView> {
    const dailyFreeLimit = getDailyFreeCredits();
    const timeZone = getCreditTimeZone();
    const current = now();
    const nextReset = nextCreditResetAt(current, timeZone);
    const email = await getUserEmail(userId);

    let balance = await db.creditBalance.findUnique({ where: { userId } });

    if (!balance) {
      try {
        balance = await db.creditBalance.create({
          data: {
            userId,
            email,
            credits: 0,
            freeCredits: dailyFreeLimit,
            paidCredits: 0,
            freeResetAt: nextReset,
          },
        });
        await db.creditLedgerEntry.create({
          data: {
            userId,
            accountEmail: email,
            amount: dailyFreeLimit,
            pool: CreditPool.FREE,
            type: CreditLedgerEntryType.FREE_DAILY,
            source: CreditLedgerEntrySource.MIGRATION,
            label: 'Quota quotidien de crédits gratuits',
            idempotencyKey: `free-daily:${userId}:${nextReset.toISOString()}`,
            metadata: { previousFreeCredits: 0 },
          },
        });
      } catch (error) {
        if (!isUniqueError(error)) {
          throw error;
        }
        balance = await db.creditBalance.findUnique({ where: { userId } });
      }
    }

    if (!balance) {
      throw new Error('Solde introuvable.');
    }

    const needsReset = !balance.freeResetAt || balance.freeResetAt.getTime() <= current.getTime();
    if (!needsReset) {
      return toView(balance, dailyFreeLimit);
    }

    const previousFree = balance.freeCredits;
    const reset = await db.creditBalance.updateMany({
      where: {
        userId,
        OR: [{ freeResetAt: null }, { freeResetAt: { lte: current } }],
      },
      data: {
        freeCredits: dailyFreeLimit,
        freeResetAt: nextReset,
      },
    });

    if (reset.count === 1) {
      const net = dailyFreeLimit - previousFree;
      try {
        await db.creditLedgerEntry.create({
          data: {
            userId,
            accountEmail: email,
            amount: net,
            pool: CreditPool.FREE,
            type: CreditLedgerEntryType.FREE_DAILY,
            source: CreditLedgerEntrySource.MIGRATION,
            label: 'Renouvellement du quota quotidien',
            idempotencyKey: `free-daily:${userId}:${nextReset.toISOString()}`,
            metadata: {
              previousFreeCredits: previousFree,
              discarded: Math.max(0, previousFree),
              granted: dailyFreeLimit,
            },
          },
        });
      } catch (error) {
        if (!isUniqueError(error)) {
          throw error;
        }
      }
    }

    const fresh = await db.creditBalance.findUnique({ where: { userId } });
    if (!fresh) {
      throw new Error('Solde introuvable.');
    }
    return toView(fresh, dailyFreeLimit);
  }

  async function getBalance(userId: string): Promise<CreditBalanceView> {
    return ensureDailyFreeCredits(userId);
  }

  async function reserve(params: {
    userId: string;
    operation: AiCreditOperation;
    provider: string;
    model: string;
    idempotencyKey: string;
    cost?: number;
    dossierId?: string | null;
  }): Promise<Reservation> {
    const existing = await db.aiUsage.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing?.status === AiUsageStatus.SETTLED) {
      return {
        usageId: existing.id,
        idempotencyKey: existing.idempotencyKey,
        status: existing.status,
        creditsCharged: existing.creditsCharged,
        freeCharged: existing.freeCharged,
        paidCharged: existing.paidCharged,
        alreadySettled: true,
      };
    }

    if (existing?.status === AiUsageStatus.RESERVED) {
      return {
        usageId: existing.id,
        idempotencyKey: existing.idempotencyKey,
        status: existing.status,
        creditsCharged: existing.creditsCharged,
        freeCharged: existing.freeCharged,
        paidCharged: existing.paidCharged,
        alreadySettled: false,
      };
    }

    const cost = params.cost ?? getAiCreditCost(params.operation);
    if (cost < 0) {
      throw new Error('Coût de crédits invalide.');
    }

    const email = await getUserEmail(params.userId);
    const expiresAt = new Date(now().getTime() + aiUsageRetentionDays() * DAY_MS);

    for (let attempt = 0; attempt < RESERVE_ATTEMPTS; attempt += 1) {
      const balance = await ensureDailyFreeCredits(params.userId);
      if (balance.totalCredits < cost) {
        throw new InsufficientCreditsError(cost, balance.totalCredits);
      }

      const split = splitCost(balance.freeCredits, balance.paidCredits, cost);
      const updated = await db.creditBalance.updateMany({
        where: {
          userId: params.userId,
          freeCredits: { gte: split.free },
          paidCredits: { gte: split.paid },
        },
        data: {
          freeCredits: { decrement: split.free },
          paidCredits: { decrement: split.paid },
        },
      });

      if (updated.count !== 1) {
        continue;
      }

      const restoreSplit = async () => {
        await db.creditBalance.updateMany({
          where: { userId: params.userId },
          data: {
            freeCredits: { increment: split.free },
            paidCredits: { increment: split.paid },
          },
        });
      };

      const ledgerCycle =
        existing && (existing.status === AiUsageStatus.ROLLED_BACK || existing.status === AiUsageStatus.FAILED)
          ? `r${existing.id}:${existing.errorCode || 'retry'}`
          : 'init';

      let usage;
      try {
        usage =
          existing && (existing.status === AiUsageStatus.ROLLED_BACK || existing.status === AiUsageStatus.FAILED)
            ? await db.aiUsage.update({
                where: { id: existing.id },
                data: {
                  status: AiUsageStatus.RESERVED,
                  provider: params.provider,
                  model: params.model,
                  operation: params.operation as AiOperation,
                  creditsCharged: cost,
                  freeCharged: split.free,
                  paidCharged: split.paid,
                  inputTokens: 0,
                  outputTokens: 0,
                  estimatedCost: 0,
                  errorCode: null,
                  ...(params.dossierId ? { dossierId: params.dossierId } : {}),
                },
              })
            : await db.aiUsage.create({
                data: {
                  userId: params.userId,
                  provider: params.provider,
                  model: params.model,
                  operation: params.operation as AiOperation,
                  status: AiUsageStatus.RESERVED,
                  idempotencyKey: params.idempotencyKey,
                  creditsCharged: cost,
                  freeCharged: split.free,
                  paidCharged: split.paid,
                  expiresAt,
                  ...(params.dossierId ? { dossierId: params.dossierId } : {}),
                },
              });
      } catch (error) {
        await restoreSplit();
        if (isUniqueError(error)) {
          const raced = await db.aiUsage.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
          });
          if (raced) {
            return {
              usageId: raced.id,
              idempotencyKey: raced.idempotencyKey,
              status: raced.status,
              creditsCharged: raced.creditsCharged,
              freeCharged: raced.freeCharged,
              paidCharged: raced.paidCharged,
              alreadySettled: raced.status === AiUsageStatus.SETTLED,
            };
          }
        }
        throw error;
      }

      const ledgerRows = [
        split.free > 0
          ? {
              userId: params.userId,
              accountEmail: email,
              amount: -split.free,
              pool: CreditPool.FREE,
              type: CreditLedgerEntryType.AI_USAGE,
              source: CreditLedgerEntrySource.GENERATION,
              label: `Réservation IA ${params.operation}`,
              aiUsageId: usage.id,
              idempotencyKey: `${params.idempotencyKey}:${ledgerCycle}:free`,
            }
          : null,
        split.paid > 0
          ? {
              userId: params.userId,
              accountEmail: email,
              amount: -split.paid,
              pool: CreditPool.PAID,
              type: CreditLedgerEntryType.AI_USAGE,
              source: CreditLedgerEntrySource.GENERATION,
              label: `Réservation IA ${params.operation}`,
              aiUsageId: usage.id,
              idempotencyKey: `${params.idempotencyKey}:${ledgerCycle}:paid`,
            }
          : null,
      ].filter(Boolean);

      for (const row of ledgerRows) {
        try {
          await db.creditLedgerEntry.create({ data: row as never });
        } catch (error) {
          if (!isUniqueError(error)) {
            await restoreSplit();
            throw error;
          }
        }
      }

      return {
        usageId: usage.id,
        idempotencyKey: params.idempotencyKey,
        status: AiUsageStatus.RESERVED,
        creditsCharged: cost,
        freeCharged: split.free,
        paidCharged: split.paid,
        alreadySettled: false,
      };
    }

    throw new CreditConflictError();
  }

  async function settle(params: {
    usageId: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    model?: string;
  }): Promise<Reservation> {
    const current = await db.aiUsage.findUnique({ where: { id: params.usageId } });
    if (!current) {
      throw new Error('Usage IA introuvable.');
    }
    if (current.status === AiUsageStatus.SETTLED) {
      return {
        usageId: current.id,
        idempotencyKey: current.idempotencyKey,
        status: current.status,
        creditsCharged: current.creditsCharged,
        freeCharged: current.freeCharged,
        paidCharged: current.paidCharged,
        alreadySettled: true,
      };
    }
    if (current.status !== AiUsageStatus.RESERVED) {
      throw new Error('Impossible de solder un usage non réservé.');
    }

    const usage = await db.aiUsage.update({
      where: { id: params.usageId },
      data: {
        status: AiUsageStatus.SETTLED,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        estimatedCost: params.estimatedCost,
        model: params.model,
      },
    });

    return {
      usageId: usage.id,
      idempotencyKey: usage.idempotencyKey,
      status: usage.status,
      creditsCharged: usage.creditsCharged,
      freeCharged: usage.freeCharged,
      paidCharged: usage.paidCharged,
      alreadySettled: true,
    };
  }

  async function rollback(params: { usageId: string; reason?: string }): Promise<Reservation> {
    const usage = await db.aiUsage.findUnique({ where: { id: params.usageId } });
    if (!usage) {
      throw new Error('Usage IA introuvable.');
    }

    if (usage.status === AiUsageStatus.ROLLED_BACK || usage.status === AiUsageStatus.FAILED) {
      return {
        usageId: usage.id,
        idempotencyKey: usage.idempotencyKey,
        status: usage.status,
        creditsCharged: usage.creditsCharged,
        freeCharged: usage.freeCharged,
        paidCharged: usage.paidCharged,
        alreadySettled: false,
      };
    }

    if (usage.status === AiUsageStatus.SETTLED) {
      throw new Error('Impossible d’annuler un usage déjà soldé.');
    }

    const email = await getUserEmail(usage.userId);

    if (usage.freeCharged > 0 || usage.paidCharged > 0) {
      await db.creditBalance.updateMany({
        where: { userId: usage.userId },
        data: {
          freeCredits: { increment: usage.freeCharged },
          paidCredits: { increment: usage.paidCharged },
        },
      });
    }

    if (usage.freeCharged > 0) {
      try {
        await db.creditLedgerEntry.create({
          data: {
            userId: usage.userId,
            accountEmail: email,
            amount: usage.freeCharged,
            pool: CreditPool.FREE,
            type: CreditLedgerEntryType.ROLLBACK,
            source: CreditLedgerEntrySource.GENERATION,
            label: 'Annulation de réservation IA',
            aiUsageId: usage.id,
            reason: params.reason,
            idempotencyKey: `${usage.idempotencyKey}:rollback:free`,
          },
        });
      } catch (error) {
        if (!isUniqueError(error)) {
          throw error;
        }
      }
    }

    if (usage.paidCharged > 0) {
      try {
        await db.creditLedgerEntry.create({
          data: {
            userId: usage.userId,
            accountEmail: email,
            amount: usage.paidCharged,
            pool: CreditPool.PAID,
            type: CreditLedgerEntryType.ROLLBACK,
            source: CreditLedgerEntrySource.GENERATION,
            label: 'Annulation de réservation IA',
            aiUsageId: usage.id,
            reason: params.reason,
            idempotencyKey: `${usage.idempotencyKey}:rollback:paid`,
          },
        });
      } catch (error) {
        if (!isUniqueError(error)) {
          throw error;
        }
      }
    }

    const updated = await db.aiUsage.update({
      where: { id: usage.id },
      data: {
        status: AiUsageStatus.ROLLED_BACK,
        errorCode: params.reason ?? 'provider_error',
      },
    });

    return {
      usageId: updated.id,
      idempotencyKey: updated.idempotencyKey,
      status: updated.status,
      creditsCharged: updated.creditsCharged,
      freeCharged: updated.freeCharged,
      paidCharged: updated.paidCharged,
      alreadySettled: false,
    };
  }

  async function addPurchasedCredits(params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    sessionId?: string;
    stripeEventId?: string;
    packId?: string;
    label?: string;
  }): Promise<{ credited: boolean; balance: CreditBalanceView }> {
    const existing = await db.creditLedgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return { credited: false, balance: await getBalance(params.userId) };
    }

    if (params.amount <= 0) {
      throw new Error('Montant d’achat invalide.');
    }

    await ensureDailyFreeCredits(params.userId);
    const email = await getUserEmail(params.userId);

    try {
      await db.creditLedgerEntry.create({
        data: {
          userId: params.userId,
          accountEmail: email,
          amount: params.amount,
          pool: CreditPool.PAID,
          type: CreditLedgerEntryType.PURCHASE,
          source: CreditLedgerEntrySource.STRIPE,
          label: params.label ?? `${params.amount} crédits achetés`,
          sessionId: params.sessionId,
          stripeEventId: params.stripeEventId,
          packId: params.packId,
          idempotencyKey: params.idempotencyKey,
        },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        return { credited: false, balance: await getBalance(params.userId) };
      }
      throw error;
    }

    await db.creditBalance.updateMany({
      where: { userId: params.userId },
      data: {
        paidCredits: { increment: params.amount },
      },
    });

    return { credited: true, balance: await getBalance(params.userId) };
  }

  async function adminGift(params: {
    userId: string;
    amount: number;
    adminUserId: string;
    reason: string;
    idempotencyKey?: string;
  }): Promise<CreditBalanceView> {
    if (params.amount <= 0) {
      throw new Error('Montant invalide.');
    }
    if (!params.reason.trim()) {
      throw new Error('Une raison est obligatoire.');
    }

    await ensureDailyFreeCredits(params.userId);
    const email = await getUserEmail(params.userId);
    const idempotencyKey = params.idempotencyKey || `admin-gift:${params.adminUserId}:${params.userId}:${now().toISOString()}`;

    try {
      await db.creditLedgerEntry.create({
        data: {
          userId: params.userId,
          accountEmail: email,
          amount: params.amount,
          pool: CreditPool.PAID,
          type: CreditLedgerEntryType.ADMIN_GIFT,
          source: CreditLedgerEntrySource.ADMIN,
          label: 'Cadeau administrateur',
          adminUserId: params.adminUserId,
          reason: params.reason.trim(),
          idempotencyKey,
        },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        return getBalance(params.userId);
      }
      throw error;
    }

    await db.creditBalance.updateMany({
      where: { userId: params.userId },
      data: { paidCredits: { increment: params.amount } },
    });

    return getBalance(params.userId);
  }

  async function adminAdjust(params: {
    userId: string;
    amount: number;
    pool: 'FREE' | 'PAID';
    adminUserId: string;
    reason: string;
    idempotencyKey?: string;
  }): Promise<CreditBalanceView> {
    if (!params.amount || params.amount === 0) {
      throw new Error('Montant invalide.');
    }
    if (!params.reason.trim()) {
      throw new Error('Une raison est obligatoire.');
    }

    await ensureDailyFreeCredits(params.userId);
    const email = await getUserEmail(params.userId);
    const pool = params.pool === 'FREE' ? CreditPool.FREE : CreditPool.PAID;
    const idempotencyKey =
      params.idempotencyKey || `admin-adjust:${params.adminUserId}:${params.userId}:${now().toISOString()}`;

    if (params.amount < 0) {
      const balance = await db.creditBalance.findUnique({ where: { userId: params.userId } });
      const available = pool === CreditPool.FREE ? balance?.freeCredits ?? 0 : balance?.paidCredits ?? 0;
      if (available + params.amount < 0) {
        throw new InsufficientCreditsError(Math.abs(params.amount), available);
      }
    }

    try {
      await db.creditLedgerEntry.create({
        data: {
          userId: params.userId,
          accountEmail: email,
          amount: params.amount,
          pool,
          type: CreditLedgerEntryType.ADMIN_ADJUSTMENT,
          source: CreditLedgerEntrySource.ADMIN,
          label: 'Ajustement administrateur',
          adminUserId: params.adminUserId,
          reason: params.reason.trim(),
          idempotencyKey,
        },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        return getBalance(params.userId);
      }
      throw error;
    }

    const field = pool === CreditPool.FREE ? 'freeCredits' : 'paidCredits';
    const updated =
      params.amount < 0
        ? await db.creditBalance.updateMany({
            where: {
              userId: params.userId,
              [field]: { gte: Math.abs(params.amount) },
            },
            data: { [field]: { increment: params.amount } },
          })
        : await db.creditBalance.updateMany({
            where: { userId: params.userId },
            data: { [field]: { increment: params.amount } },
          });

    if (updated.count !== 1 && params.amount < 0) {
      throw new InsufficientCreditsError(Math.abs(params.amount), 0);
    }

    return getBalance(params.userId);
  }

  async function refundPaidCredits(params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    reason?: string;
    sessionId?: string;
  }): Promise<CreditBalanceView> {
    if (params.amount <= 0) {
      throw new Error('Montant de remboursement invalide.');
    }

    const existing = await db.creditLedgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return getBalance(params.userId);
    }

    await ensureDailyFreeCredits(params.userId);
    const email = await getUserEmail(params.userId);

    try {
      await db.creditLedgerEntry.create({
        data: {
          userId: params.userId,
          accountEmail: email,
          amount: -params.amount,
          pool: CreditPool.PAID,
          type: CreditLedgerEntryType.REFUND,
          source: CreditLedgerEntrySource.STRIPE,
          label: 'Remboursement',
          sessionId: params.sessionId,
          reason: params.reason,
          idempotencyKey: params.idempotencyKey,
        },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        return getBalance(params.userId);
      }
      throw error;
    }

    const updated = await db.creditBalance.updateMany({
      where: {
        userId: params.userId,
        paidCredits: { gte: params.amount },
      },
      data: {
        paidCredits: { decrement: params.amount },
      },
    });

    if (updated.count !== 1) {
      throw new InsufficientCreditsError(params.amount, 0);
    }

    return getBalance(params.userId);
  }

  return {
    getBalance,
    ensureDailyFreeCredits,
    reserve,
    settle,
    rollback,
    addPurchasedCredits,
    adminGift,
    adminAdjust,
    refundPaidCredits,
  };
}

export const creditService = createCreditService();
