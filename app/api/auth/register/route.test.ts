import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function registerRequest(body: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'x-real-ip': '203.0.113.20',
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: 'new.user@example.com',
  password: 'password12',
  firstname: 'Jean',
  lastname: 'Dupont',
  recaptchaToken: 'token',
  formStartedAt: Date.now() - 5000,
  website: '',
  acceptedTerms: true,
};

async function loadRouteModule(options?: {
  existingUser?: boolean;
  recaptcha?: { ok: true; score: number } | { ok: false; reason: string };
  rateAllowed?: boolean;
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

  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue(options?.existingUser ? { id: 'u1' } : null),
        create: vi.fn().mockResolvedValue({ id: 'u2' }),
      },
      account: {
        create: vi.fn().mockResolvedValue({ id: 'a1' }),
      },
    },
  }));

  vi.doMock('@/lib/password', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashed'),
  }));

  vi.doMock('@/lib/auth', () => ({
    auth: {
      api: {
        sendVerificationEmail: vi.fn().mockResolvedValue({ status: true }),
      },
    },
  }));

  vi.doMock('@/lib/recaptcha', () => ({
    assertRecaptcha: vi.fn().mockResolvedValue(options?.recaptcha ?? { ok: true, score: 0.9 }),
  }));

  vi.doMock('@/lib/rate-limit', () => ({
    RATE_LIMITS: {
      registerIp: { windowMs: 1, max: 8 },
      registerEmail: { windowMs: 1, max: 5 },
    },
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: options?.rateAllowed ?? true,
      count: 1,
    }),
  }));

  vi.doMock('@/lib/security-event', () => ({
    recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
  }));

  return import('@/app/api/auth/register/route');
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('crée un compte valide', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(registerRequest(validBody) as never);
    expect(response.status).toBe(201);
  });

  it('refuse un origin invalide', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(registerRequest(validBody, 'https://evil.example') as never);
    expect(response.status).toBe(403);
  });

  it('refuse un honeypot rempli sans créer de compte', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(registerRequest({ ...validBody, website: 'https://spam.test' }) as never);
    expect(response.status).toBe(201);
  });

  it('refuse une soumission trop rapide', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(registerRequest({ ...validBody, formStartedAt: Date.now() }) as never);
    expect(response.status).toBe(400);
  });

  it('refuse un reCAPTCHA invalide', async () => {
    const { POST } = await loadRouteModule({ recaptcha: { ok: false, reason: 'bad_action' } });
    const response = await POST(registerRequest(validBody) as never);
    expect(response.status).toBe(400);
  });

  it('ne révèle pas qu’un email existe déjà', async () => {
    const { POST } = await loadRouteModule({ existingUser: true });
    const response = await POST(registerRequest(validBody) as never);
    const data = (await response.json()) as { message?: string; error?: string };
    expect(response.status).toBe(201);
    expect(data.error).toBeUndefined();
  });

  it('refuse si le rate limit est dépassé', async () => {
    const { POST } = await loadRouteModule({ rateAllowed: false });
    const response = await POST(registerRequest(validBody) as never);
    expect(response.status).toBe(429);
  });

  it('refuse sans acceptation des conditions', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(
      registerRequest({ ...validBody, acceptedTerms: false }) as never
    );
    expect(response.status).toBe(400);
  });

  it('refuse une validation incorrecte', async () => {
    const { POST } = await loadRouteModule();
    const response = await POST(
      registerRequest({ ...validBody, email: 'pas-un-email', recaptchaToken: 'x' }) as never
    );
    expect(response.status).toBe(400);
  });
});
