import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function contactRequest(body: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'x-real-ip': '203.0.113.55',
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Jean',
  email: 'jean@example.com',
  subject: 'Question',
  message: 'Bonjour, j’ai une question.',
  recaptchaToken: 'token',
  website: '',
};

async function loadRouteModule(options?: {
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
    RATE_LIMITS: { contactIp: { windowMs: 1, max: 5 } },
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, count: 1 }),
  }));

  vi.doMock('@/lib/recaptcha', () => ({
    assertRecaptcha: vi.fn().mockResolvedValue(options?.recaptcha ?? { ok: true, score: 0.9 }),
  }));

  vi.doMock('@/lib/security-event', () => ({
    recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
  }));

  const sendEmail = vi.fn().mockResolvedValue(undefined);
  vi.doMock('@/lib/mail', () => ({ sendEmail }));

  return { route: await import('@/app/api/contact/route'), sendEmail };
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('n’envoie pas d’e-mail si le honeypot est rempli', async () => {
    const { route, sendEmail } = await loadRouteModule();
    const response = await route.POST(contactRequest({ ...validBody, website: 'http://spam.test' }) as never);
    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuse un reCAPTCHA invalide', async () => {
    const { route, sendEmail } = await loadRouteModule({ recaptcha: { ok: false, reason: 'low_score' } });
    const response = await route.POST(contactRequest(validBody) as never);
    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
