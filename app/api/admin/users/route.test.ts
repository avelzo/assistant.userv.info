import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const giftMock = vi.fn();
const findManyMock = vi.fn();
const findUniqueMock = vi.fn();
const dashboardMock = vi.fn();

async function loadAdminRoutes(session: {
  ok: boolean;
  status: 401 | 403 | 200;
  session: { user: { id: string; email: string; role?: string } } | null;
}) {
  vi.resetModules();
  giftMock.mockReset();
  findManyMock.mockReset();
  findUniqueMock.mockReset();
  dashboardMock.mockReset();
  giftMock.mockResolvedValue({
    userId: '507f1f77bcf86cd799439011',
    freeCredits: 150,
    paidCredits: 25,
    totalCredits: 175,
  });
  findManyMock.mockResolvedValue([]);
  findUniqueMock.mockResolvedValue({
    id: '507f1f77bcf86cd799439011',
    email: 'laurent@userv.info',
    role: 'user',
    banned: false,
    emailVerified: true,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    creditBalance: { freeCredits: 150, paidCredits: 0 },
  });
  dashboardMock.mockResolvedValue({
    range: '7d',
    currency: 'USD',
    totals: { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: '0.000000 USD', creditsCharged: 0 },
    byOperation: [],
  });

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
    requireAdminSession: vi.fn().mockResolvedValue(session),
  }));
  vi.doMock('@/lib/credits', () => ({
    creditService: {
      adminGift: giftMock,
      getBalance: vi.fn().mockResolvedValue({
        freeCredits: 150,
        paidCredits: 25,
        totalCredits: 175,
      }),
    },
  }));
  vi.doMock('@/lib/admin/ai-usage-stats', async () => {
    const actual = await vi.importActual<typeof import('@/lib/admin/ai-usage-stats')>('@/lib/admin/ai-usage-stats');
    return { ...actual, getAiUsageDashboard: dashboardMock };
  });
  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: { findMany: findManyMock, findUnique: findUniqueMock },
      aiUsage: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 0 },
          _sum: { creditsCharged: 0, estimatedCost: 0 },
        }),
      },
      creditLedgerEntry: { findMany: vi.fn().mockResolvedValue([]) },
    },
  }));

  return {
    gift: await import('@/app/api/admin/credits/gift/route'),
    users: await import('@/app/api/admin/users/route'),
    ai: await import('@/app/api/admin/ai-usage/route'),
  };
}

describe('API admin utilisateurs / crédits / IA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('exige ADMIN pour offrir des crédits', async () => {
    const { gift } = await loadAdminRoutes({
      ok: false,
      status: 403,
      session: { user: { id: 'u1', email: 'user@test.com', role: 'user' } },
    });
    const response = await gift.POST(
      new Request('http://localhost/api/admin/credits/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: '507f1f77bcf86cd799439011', amount: 10, reason: 'test' }),
      })
    );
    expect(response.status).toBe(403);
    expect(giftMock).not.toHaveBeenCalled();
  });

  it('offre des crédits paid via le service existant', async () => {
    const { gift } = await loadAdminRoutes({
      ok: true,
      status: 200,
      session: { user: { id: 'admin1', email: 'admin@test.com', role: 'admin' } },
    });
    const response = await gift.POST(
      new Request('http://localhost/api/admin/credits/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '507f1f77bcf86cd799439011',
          amount: 10,
          reason: 'Geste commercial',
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(giftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '507f1f77bcf86cd799439011',
        amount: 10,
        adminUserId: 'admin1',
        reason: 'Geste commercial',
      })
    );
  });

  it('masque les e-mails dans la liste utilisateurs', async () => {
    const { users } = await loadAdminRoutes({
      ok: true,
      status: 200,
      session: { user: { id: 'admin1', email: 'admin@test.com', role: 'admin' } },
    });
    findManyMock.mockResolvedValue([
      {
        id: '507f1f77bcf86cd799439011',
        email: 'laurent@userv.info',
        role: 'user',
        banned: false,
        emailVerified: true,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        creditBalance: { freeCredits: 150, paidCredits: 13 },
      },
    ]);
    const response = await users.GET(new Request('http://localhost/api/admin/users?q=laurent'));
    expect(response.status).toBe(200);
    const data = (await response.json()) as { users: Array<{ emailMasked: string; email?: string }> };
    expect(data.users[0]?.emailMasked).toBe('la***@userv.info');
    expect(data.users[0]?.email).toBeUndefined();
    expect(data.users[0]).toMatchObject({
      recentCreditsCharged: 0,
      lastActivityAt: null,
    });
  });

  it('refuse un USER sur le dashboard IA', async () => {
    const { ai } = await loadAdminRoutes({
      ok: false,
      status: 403,
      session: { user: { id: 'u1', email: 'user@test.com', role: 'user' } },
    });
    const response = await ai.GET(new Request('http://localhost/api/admin/ai-usage?range=7d'));
    expect(response.status).toBe(403);
    expect(dashboardMock).not.toHaveBeenCalled();
  });
});
