import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/user/status/route';
import { requireAuthSession } from '@/lib/session';
import { creditService } from '@/lib/credits';

vi.mock('@/lib/session', () => ({
  requireAuthSession: vi.fn(),
}));

vi.mock('@/lib/credits', () => ({
  creditService: {
    getBalance: vi.fn(),
  },
}));

const mockedRequireAuthSession = vi.mocked(requireAuthSession);
const mockedGetBalance = vi.mocked(creditService.getBalance);

describe('GET /api/user/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne le solde v2 de l’utilisateur connecté', async () => {
    mockedRequireAuthSession.mockResolvedValue({
      user: { id: 'user-1', email: 'laurent@example.com' },
    } as never);

    mockedGetBalance.mockResolvedValue({
      userId: 'user-1',
      freeCredits: 140,
      paidCredits: 20,
      totalCredits: 160,
      nextFreeResetAt: '2026-08-16T22:00:00.000Z',
      dailyFreeLimit: 15,
    });

    const response = await GET();
    const data = (await response.json()) as {
      freeCredits: number;
      paidCredits: number;
      totalCredits: number;
      freeGenerationsRemaining: number;
      email: string;
    };

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      email: 'laurent@example.com',
      freeCredits: 140,
      paidCredits: 20,
      totalCredits: 160,
      freeGenerationsRemaining: 1,
    });
  });
});
