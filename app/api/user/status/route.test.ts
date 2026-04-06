import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/user/status/route';
import { prisma } from '@/lib/prisma';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    creditBalance: {
      findUnique: vi.fn(),
    },
    letterGeneration: {
      count: vi.fn(),
    },
  },
}));

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  creditBalance: { findUnique: ReturnType<typeof vi.fn> };
  letterGeneration: { count: ReturnType<typeof vi.fn> };
};

describe('GET /api/user/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_FREE_GENERATIONS = '1';
  });

  it('retourne 0 génération gratuite restante si un usage gratuit historique existe', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: 'laurent@example.com' },
    } as never);

    mockedPrisma.user.findUnique.mockResolvedValue({
      email: 'laurent@example.com',
      freeGenerationsUsed: 0,
    });

    mockedPrisma.creditBalance.findUnique.mockResolvedValue({
      credits: 2,
    });

    mockedPrisma.letterGeneration.count.mockResolvedValue(1);

    const response = await GET();
    const data = (await response.json()) as {
      freeGenerationsRemaining: number;
      paidCredits: number;
      email: string;
    };

    expect(response.status).toBe(200);
    expect(data).toEqual({
      freeGenerationsRemaining: 0,
      paidCredits: 2,
      email: 'laurent@example.com',
    });
  });
});
