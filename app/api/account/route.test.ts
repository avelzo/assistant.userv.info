import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

type MockSession = { user: { id?: string; email: string } } | null;

async function loadRouteModule(session: MockSession = { user: { id: 'user-1', email: 'laurent@example.com' } }) {
  vi.resetModules();

  vi.doMock('next/server', () => ({
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  }));

  vi.doMock('@/lib/session', () => ({
    requireAuthSession: vi.fn().mockResolvedValue(session),
  }));

  vi.doMock('@prisma/client', () => ({
    CreditLedgerEntrySource: { STRIPE: 'STRIPE', GENERATION: 'GENERATION' },
    GenerationBillingType: {
      FREE: 'FREE',
      CREDIT: 'CREDIT',
      LEGACY_PREMIUM: 'LEGACY_PREMIUM',
      ADMIN: 'ADMIN',
    },
  }));

  vi.doMock('@/lib/credits', () => ({
    creditService: {
      getBalance: vi.fn().mockResolvedValue({
        userId: 'user-1',
        freeCredits: 15,
        paidCredits: 3,
        totalCredits: 18,
        dailyFreeLimit: 15,
        nextFreeResetAt: '2026-08-16T22:00:00.000Z',
      }),
    },
  }));

  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'laurent@example.com',
          firstname: 'Laurent',
          lastname: 'Hunaut',
        }),
        update: vi.fn().mockResolvedValue({
          email: 'laurent@example.com',
          firstname: 'Laurent',
          lastname: 'Hunaut',
        }),
      },
      creditLedgerEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ledger-1',
            amount: -1,
            source: 'GENERATION',
            label: 'Lettre CAF',
            createdAt: new Date('2026-04-05T10:30:00.000Z'),
          },
        ]),
      },
      letterGeneration: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'gen-1',
            category: 'CAF',
            recipient: 'CAF de Paris',
            subject: 'Réexamen du dossier',
            details: 'Je souhaite demander un réexamen de ma situation.',
            letter: 'Voici le courrier généré.',
            emailVersion: 'Voici la version email.',
            createdAt: new Date('2026-04-05T10:30:00.000Z'),
          },
        ]),
      },
    },
  }));

  return import('@/app/api/account/route');
}

describe('GET /api/account', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('retourne les crédits et les lettres générées récentes', async () => {
    const { GET } = await loadRouteModule();
    const response = await GET();
    const data = (await response.json()) as {
      account: {
        email: string;
        firstname: string;
        lastname: string;
        credits: number;
        freeCredits: number;
        paidCredits: number;
      };
      history: Array<{ id: string; label: string }>;
      generations: Array<{
        id: string;
        category: string;
        recipient: string;
        subject: string;
        detailsPreview: string;
        letter: string;
        emailVersion: string;
        createdAt: string;
      }>;
    };

    expect(response.status).toBe(200);
    expect(data.account).toMatchObject({
      email: 'laurent@example.com',
      firstname: 'Laurent',
      lastname: 'Hunaut',
      credits: 18,
      freeCredits: 15,
      paidCredits: 3,
    });
    expect(data.history).toHaveLength(1);
    expect(data.generations).toEqual([
      {
        id: 'gen-1',
        category: 'CAF',
        recipient: 'CAF de Paris',
        subject: 'Réexamen du dossier',
        detailsPreview: 'Je souhaite demander un réexamen de ma situation.',
        letter: 'Voici le courrier généré.',
        emailVersion: 'Voici la version email.',
        dossierId: null,
        createdAt: '2026-04-05T10:30:00.000Z',
      },
    ]);
  });
});

describe('POST /api/account', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse une modification sans session', async () => {
    const { POST } = await loadRouteModule(null);
    const response = await POST(
      new Request('http://localhost/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'attacker@example.com',
          firstname: 'A',
          lastname: 'B',
        }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('refuse un changement d’email', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request('http://localhost/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'autre@example.com',
          firstname: 'Laurent',
          lastname: 'Hunaut',
        }),
      })
    );

    expect(response.status).toBe(400);
  });
});
