import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadRouteModule(session: {
  ok: boolean;
  status: 401 | 403 | 200;
  session: { user: { email: string; role?: string } } | null;
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

  return import('@/app/api/admin/health/route');
}

describe('GET /api/admin/health', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse une requête sans session', async () => {
    const { GET } = await loadRouteModule({ ok: false, status: 401, session: null });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('refuse un USER', async () => {
    const { GET } = await loadRouteModule({
      ok: false,
      status: 403,
      session: { user: { email: 'user@example.com', role: 'user' } },
    });
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('autorise un ADMIN', async () => {
    const { GET } = await loadRouteModule({
      ok: true,
      status: 200,
      session: { user: { email: 'admin@example.com', role: 'admin' } },
    });
    const response = await GET();
    expect(response.status).toBe(200);
  });
});
