import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const createMock = vi.fn();
const listMock = vi.fn();

async function loadRoute(session: {
  ok: boolean;
  status: 401 | 403 | 200;
  session: { user: { id: string; email: string; role?: string } } | null;
}) {
  vi.resetModules();
  createMock.mockReset();
  listMock.mockReset();

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
    requireAuthSession: vi.fn().mockResolvedValue(session.ok ? session.session : null),
    requireAdminSession: vi.fn().mockResolvedValue(session),
  }));
  vi.doMock('@/lib/security-event', () => ({ recordSecurityEvent: vi.fn() }));
  vi.doMock('@/lib/origin', () => ({
    rejectIfDisallowedOrigin: vi.fn().mockReturnValue(null),
  }));
  vi.doMock('@/lib/rate-limit', () => ({
    RATE_LIMITS: {
      feedbackIp: { windowMs: 60_000, max: 20 },
      feedbackUser: { windowMs: 60_000, max: 20 },
    },
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, count: 1 }),
  }));
  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified: true, email: 'user@test.com' }),
        findMany: vi.fn().mockResolvedValue([{ id: '507f1f77bcf86cd799439011', email: 'user@test.com' }]),
      },
      userFeedback: {},
    },
  }));
  vi.doMock('@/lib/feedback/feedback-service', () => ({
    feedbackService: { create: createMock, listForAdmin: listMock },
  }));

  return {
    user: await import('@/app/api/feedback/route'),
    admin: await import('@/app/api/admin/feedback/route'),
  };
}

describe('API feedback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse un USER sur la liste admin', async () => {
    const { admin } = await loadRoute({
      ok: false,
      status: 403,
      session: { user: { id: 'u1', email: 'user@test.com', role: 'user' } },
    });
    const response = await admin.GET();
    expect(response.status).toBe(403);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('autorise un ADMIN à lister les retours', async () => {
    const { admin } = await loadRoute({
      ok: true,
      status: 200,
      session: { user: { id: 'admin1', email: 'admin@test.com', role: 'admin' } },
    });
    listMock.mockResolvedValue([
      {
        id: 'fb1',
        userId: '507f1f77bcf86cd799439011',
        dossierId: null,
        aiUsageId: null,
        operation: null,
        kind: 'OTHER',
        rating: null,
        comment: 'ok',
        createdAt: '2026-08-16T10:00:00.000Z',
      },
    ]);
    const response = await admin.GET();
    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalled();
  });

  it('crée un retour pour l’utilisateur connecté', async () => {
    createMock.mockResolvedValue({ id: 'fb1', kind: 'OTHER' });
    const { user } = await loadRoute({
      ok: true,
      status: 200,
      session: { user: { id: '507f1f77bcf86cd799439011', email: 'user@test.com', role: 'user' } },
    });
    const response = await user.POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'OTHER', comment: 'RAS' }),
      })
    );
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', expect.objectContaining({ kind: 'OTHER' }));
  });
});
