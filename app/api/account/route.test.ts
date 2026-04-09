import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

type MockSession = { user: { email: string } } | null;

async function loadRouteModule(session: MockSession = { user: { email: 'laurent@example.com' } }) {
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

  vi.doMock('next-auth', () => ({
    getServerSession: vi.fn().mockResolvedValue(session),
  }));

  vi.doMock('@/lib/auth', () => ({ authOptions: {} }));

  vi.doMock('@prisma/client', () => ({
    CreditLedgerEntrySource: { STRIPE: 'STRIPE', GENERATION: 'GENERATION' },
    GenerationBillingType: {
      FREE: 'FREE',
      CREDIT: 'CREDIT',
      LEGACY_PREMIUM: 'LEGACY_PREMIUM',
      ADMIN: 'ADMIN',
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
      },
      creditBalance: {
        findUnique: vi.fn().mockResolvedValue({ credits: 3 }),
      },
      creditLedgerEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ledger-1',
            delta: -1,
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
      account: { email: string; firstname: string; lastname: string; credits: number };
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
    expect(data.account).toEqual({
      email: 'laurent@example.com',
      firstname: 'Laurent',
      lastname: 'Hunaut',
      credits: 3,
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
        createdAt: '2026-04-05T10:30:00.000Z',
      },
    ]);
  });
});