import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function forgotRequest(body: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'x-real-ip': '203.0.113.40',
    },
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'user@example.com', recaptchaToken: 'token' };

async function loadRouteModule(options?: {
  rateAllowed?: boolean;
  resetError?: boolean;
  recaptcha?: { ok: true; score: number } | { ok: false; reason: string };
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

  vi.doMock('@/lib/rate-limit', () => ({
    RATE_LIMITS: { forgotIp: { windowMs: 1, max: 5 } },
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: options?.rateAllowed ?? true,
      count: 1,
    }),
  }));

  vi.doMock('@/lib/recaptcha', () => ({
    assertRecaptcha: vi.fn().mockResolvedValue(options?.recaptcha ?? { ok: true, score: 0.9 }),
  }));

  vi.doMock('@/lib/security-event', () => ({
    recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
  }));

  const requestPasswordReset = options?.resetError
    ? vi.fn().mockRejectedValue(new Error('missing'))
    : vi.fn().mockResolvedValue({ status: true });

  vi.doMock('@/lib/auth', () => ({
    auth: { api: { requestPasswordReset } },
  }));

  return { route: await import('@/app/api/auth/forgot-password/route'), requestPasswordReset };
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepte une demande sans révéler si le compte existe', async () => {
    const { route } = await loadRouteModule();
    const response = await route.POST(forgotRequest(validBody) as never);
    expect(response.status).toBe(200);
  });

  it('reste générique si Better Auth échoue', async () => {
    const { route } = await loadRouteModule({ resetError: true });
    const response = await route.POST(forgotRequest({ email: 'unknown@example.com', recaptchaToken: 'token' }) as never);
    const data = (await response.json()) as { message?: string; error?: string };
    expect(response.status).toBe(200);
    expect(data.error).toBeUndefined();
  });

  it('refuse un origin invalide', async () => {
    const { route } = await loadRouteModule();
    const response = await route.POST(forgotRequest(validBody, 'https://evil.example') as never);
    expect(response.status).toBe(403);
  });

  it('refuse si le rate limit est dépassé', async () => {
    const { route } = await loadRouteModule({ rateAllowed: false });
    const response = await route.POST(forgotRequest(validBody) as never);
    expect(response.status).toBe(429);
  });

  it('refuse un reCAPTCHA invalide', async () => {
    const { route } = await loadRouteModule({ recaptcha: { ok: false, reason: 'low_score' } });
    const response = await route.POST(forgotRequest(validBody) as never);
    expect(response.status).toBe(400);
  });
});
