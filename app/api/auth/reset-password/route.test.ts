import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadRouteModule(options?: { resetOk?: boolean }) {
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

  vi.doMock('@/lib/auth', () => ({
    auth: {
      api: {
        resetPassword:
          options?.resetOk === false
            ? vi.fn().mockRejectedValue(new Error('invalid'))
            : vi.fn().mockResolvedValue({ status: true }),
      },
    },
  }));

  return import('@/app/api/auth/reset-password/route');
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('met à jour le mot de passe avec un token valide', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', password: 'newpass12' }),
      }) as never
    );
    expect(response.status).toBe(200);
  });

  it('refuse un token invalide ou expiré', async () => {
    const { POST } = await loadRouteModule({ resetOk: false });
    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'expired', password: 'newpass12' }),
      }) as never
    );
    expect(response.status).toBe(400);
  });
});
