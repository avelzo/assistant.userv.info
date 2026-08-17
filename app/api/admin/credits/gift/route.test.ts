import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadRouteModule(session: {
  ok: boolean;
  status: 401 | 403 | 200;
  session: { user: { id: string; email: string; role?: string } } | null;
}) {
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
    requireAdminSession: vi.fn().mockResolvedValue(session),
  }));

  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
    },
  }));

  vi.doMock('@/lib/credits', () => ({
    creditService: {
      adminGift: vi.fn().mockResolvedValue({
        userId: 'user-1',
        freeCredits: 150,
        paidCredits: 25,
        totalCredits: 175,
      }),
      adminAdjust: vi.fn().mockResolvedValue({
        userId: 'user-1',
        freeCredits: 150,
        paidCredits: 20,
        totalCredits: 170,
      }),
    },
    InsufficientCreditsError: class InsufficientCreditsError extends Error {},
  }));

  return import('@/app/api/admin/credits/gift/route');
}

async function loadAdjustModule(session: {
  ok: boolean;
  status: 401 | 403 | 200;
  session: { user: { id: string; email: string; role?: string } } | null;
}) {
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
    requireAdminSession: vi.fn().mockResolvedValue(session),
  }));

  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
    },
  }));

  vi.doMock('@/lib/credits', () => ({
    creditService: {
      adminAdjust: vi.fn().mockResolvedValue({
        userId: 'user-1',
        freeCredits: 150,
        paidCredits: 20,
        totalCredits: 170,
      }),
    },
    InsufficientCreditsError: class InsufficientCreditsError extends Error {},
  }));

  return import('@/app/api/admin/credits/adjust/route');
}

describe('POST /api/admin/credits/gift', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse un USER', async () => {
    const { POST } = await loadRouteModule({
      ok: false,
      status: 403,
      session: { user: { id: 'u1', email: 'user@example.com', role: 'user' } },
    });
    const response = await POST(
      new Request('http://localhost/api/admin/credits/gift', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.c', amount: 10, reason: 'test' }),
      })
    );
    expect(response.status).toBe(403);
  });

  it('autorise un ADMIN et offre des crédits', async () => {
    const { POST } = await loadRouteModule({
      ok: true,
      status: 200,
      session: { user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' } },
    });
    const response = await POST(
      new Request('http://localhost/api/admin/credits/gift', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.c', amount: 25, reason: 'geste commercial' }),
      })
    );
    const data = (await response.json()) as { ok: boolean; balance: { paidCredits: number } };
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.balance.paidCredits).toBe(25);
  });
});

describe('POST /api/admin/credits/adjust', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('autorise un ADMIN à ajuster un solde', async () => {
    const { POST } = await loadAdjustModule({
      ok: true,
      status: 200,
      session: { user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' } },
    });
    const response = await POST(
      new Request('http://localhost/api/admin/credits/adjust', {
        method: 'POST',
        body: JSON.stringify({
          email: 'a@b.c',
          amount: -5,
          pool: 'PAID',
          reason: 'correction comptable',
        }),
      })
    );
    const data = (await response.json()) as { ok: boolean };
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
