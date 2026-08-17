import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const grantMock = vi.fn();
const resolveUserMock = vi.fn();
const constructEventMock = vi.fn();
const retrieveMock = vi.fn();

async function loadWebhookModule() {
  vi.resetModules();
  grantMock.mockReset();
  resolveUserMock.mockReset();
  constructEventMock.mockReset();
  grantMock.mockResolvedValue({ credited: true, amount: 10, freeCredits: 150, paidCredits: 10, totalCredits: 160 });
  resolveUserMock.mockResolvedValue('user-1');

  vi.doMock('next/server', () => ({
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  }));

  vi.doMock('stripe', () => ({
    default: class Stripe {
      webhooks = { constructEvent: constructEventMock };
    },
  }));

  vi.doMock('@/lib/credits/stripe-grant', () => ({
    grantStripePurchase: grantMock,
    resolveCheckoutUserId: resolveUserMock,
  }));

  return import('@/app/api/stripe/webhook/route');
}

async function loadClaimModule(session: { user: { id: string; email: string } } | null) {
  vi.resetModules();
  grantMock.mockReset();
  resolveUserMock.mockReset();
  retrieveMock.mockReset();
  grantMock.mockResolvedValue({
    credited: false,
    amount: 10,
    freeCredits: 150,
    paidCredits: 10,
    totalCredits: 160,
  });
  resolveUserMock.mockResolvedValue('user-1');
  retrieveMock.mockResolvedValue({
    id: 'cs_test_1',
    payment_status: 'paid',
    metadata: { userId: 'user-1' },
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
    requireAuthSession: vi.fn().mockResolvedValue(session),
  }));
  vi.doMock('@/lib/security-event', () => ({
    recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('@/lib/origin', () => ({
    rejectIfDisallowedOrigin: vi.fn().mockReturnValue(null),
  }));
  vi.doMock('@/lib/rate-limit', () => ({
    RATE_LIMITS: { claimIp: { windowMs: 60_000, max: 10 } },
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, count: 1 }),
  }));
  vi.doMock('stripe', () => ({
    default: class Stripe {
      checkout = {
        sessions: {
          retrieve: retrieveMock,
        },
      };
    },
  }));
  vi.doMock('@/lib/credits/stripe-grant', () => ({
    grantStripePurchase: grantMock,
    resolveCheckoutUserId: resolveUserMock,
  }));

  return import('@/app/api/credits/claim/route');
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('crédite un checkout.session.completed', async () => {
    const { POST } = await loadWebhookModule();
    constructEventMock.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'paid',
          metadata: { userId: 'user-1', creditsGranted: '10' },
        },
      },
    });

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );

    expect(response.status).toBe(200);
    expect(grantMock).toHaveBeenCalledTimes(1);
  });

  it('est idempotent si le webhook est rejoué', async () => {
    const { POST } = await loadWebhookModule();
    constructEventMock.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'paid',
        },
      },
    });

    await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );

    expect(grantMock).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/credits/claim', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_x' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse une session appartenant à un autre utilisateur', async () => {
    const { POST } = await loadClaimModule({ user: { id: 'user-2', email: 'other@test.com' } });
    resolveUserMock.mockResolvedValue('user-1');

    const response = await POST(
      new Request('http://localhost/api/credits/claim', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_1' }),
      })
    );

    expect(response.status).toBe(403);
    expect(grantMock).not.toHaveBeenCalled();
  });

  it('ne double pas un claim après webhook', async () => {
    const { POST } = await loadClaimModule({ user: { id: 'user-1', email: 'user@test.com' } });
    resolveUserMock.mockResolvedValue('user-1');
    grantMock.mockResolvedValue({
      credited: false,
      amount: 10,
      freeCredits: 150,
      paidCredits: 10,
      totalCredits: 160,
    });

    const response = await POST(
      new Request('http://localhost/api/credits/claim', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_1' }),
      })
    );
    const data = (await response.json()) as { alreadyProcessed: boolean; paidCredits: number };

    expect(response.status).toBe(200);
    expect(data.alreadyProcessed).toBe(true);
    expect(data.paidCredits).toBe(10);
  });
});
