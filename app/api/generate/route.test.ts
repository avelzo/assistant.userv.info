import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InsufficientCreditsError } from '@/lib/credits/errors';
import { DossierAccessError } from '@/lib/dossiers/errors';

const originalEnv = { ...process.env };

const reserveMock = vi.fn();
const settleMock = vi.fn();
const rollbackMock = vi.fn();
const getBalanceMock = vi.fn();
const letterCreateMock = vi.fn();
const dossierGetMock = vi.fn();
const dossierUpdateMock = vi.fn();

type MockSession = { user: { id?: string; email: string; name?: string } } | null;

function generateRequest(init?: RequestInit & { ip?: string }) {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    ...init,
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      'x-real-ip': init?.ip || '198.51.100.8',
      ...init?.headers,
    },
  });
}

async function loadRouteModule(
  session: MockSession = { user: { id: 'user-1', email: 'user@test.com', name: 'User' } },
  rateAllowed = true,
  emailVerified = true
) {
  vi.resetModules();
  reserveMock.mockReset();
  settleMock.mockReset();
  rollbackMock.mockReset();
  getBalanceMock.mockReset();
  letterCreateMock.mockReset();
  dossierGetMock.mockReset();
  dossierUpdateMock.mockReset();

  reserveMock.mockResolvedValue({
    usageId: 'usage-1',
    creditsCharged: 10,
    freeCharged: 10,
    paidCharged: 0,
    alreadySettled: false,
  });
  settleMock.mockResolvedValue({ status: 'SETTLED' });
  rollbackMock.mockResolvedValue({ status: 'ROLLED_BACK' });
  getBalanceMock.mockResolvedValue({
    freeCredits: 5,
    paidCredits: 0,
    totalCredits: 5,
    dailyFreeLimit: 15,
    nextFreeResetAt: new Date('2026-08-16T00:00:00.000+02:00').toISOString(),
  });
  letterCreateMock.mockResolvedValue({});
  dossierGetMock.mockResolvedValue({ id: '507f1f77bcf86cd799439011' });
  dossierUpdateMock.mockResolvedValue({});

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
  vi.doMock('@/lib/rate-limit', () => ({
    RATE_LIMITS: {
      generateIp: { windowMs: 60_000, max: 10 },
      generateUser: { windowMs: 60_000, max: 10 },
    },
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: rateAllowed, count: 1 }),
  }));
  vi.doMock('@prisma/client', () => ({
    GenerationBillingType: { FREE: 'FREE', CREDIT: 'CREDIT' },
  }));
  vi.doMock('@/lib/credits/errors', () => ({
    InsufficientCreditsError,
  }));
  vi.doMock('@/lib/credits', () => ({
    creditService: {
      reserve: reserveMock,
      settle: settleMock,
      rollback: rollbackMock,
      getBalance: getBalanceMock,
    },
    InsufficientCreditsError,
  }));
  vi.doMock('@/lib/dossiers', () => ({
    dossierService: {
      get: dossierGetMock,
      update: dossierUpdateMock,
    },
    DossierAccessError,
  }));
  vi.doMock('@/lib/dossiers/http', () => ({
    isMongoObjectId: (value: string) => /^[a-fA-F0-9]{24}$/.test(value),
  }));
  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified, email: session?.user.email }),
      },
      letterGeneration: {
        create: letterCreateMock,
      },
    },
  }));

  return import('@/app/api/generate/route');
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MOCK_AI;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAPI_URL;
    delete process.env.OPENAI_MODEL;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse un utilisateur non connecté', async () => {
    const { POST } = await loadRouteModule(null);
    const response = await POST(generateRequest({ body: JSON.stringify({ details: 'Test' }) }));
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toMatch(/connectez-vous/i);
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('refuse MOCK_AI sans session', async () => {
    process.env.MOCK_AI = 'true';
    const { POST } = await loadRouteModule(null);
    const response = await POST(
      generateRequest({ body: JSON.stringify({ details: 'Je souhaite contester une décision.' }) })
    );
    expect(response.status).toBe(401);
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('retourne le contenu mocké quand MOCK_AI est activé et consomme des crédits', async () => {
    process.env.MOCK_AI = 'true';

    const { POST } = await loadRouteModule();
    const response = await POST(
      generateRequest({
        body: JSON.stringify({ details: 'Je souhaite contester une décision.' }),
        headers: { 'Idempotency-Key': 'gen-mock-1' },
      })
    );
    const data = (await response.json()) as { letter: string; emailVersion: string };

    expect(response.status).toBe(200);
    expect(data.letter).toMatch(/demande de réexamen/i);
    expect(data.emailVersion).toMatch(/cordialement/i);
    expect(reserveMock).toHaveBeenCalledTimes(1);
    expect(settleMock).toHaveBeenCalledTimes(1);
    expect(rollbackMock).not.toHaveBeenCalled();
  });

  it('refuse un compte non vérifié même si MOCK_AI est activé', async () => {
    process.env.MOCK_AI = 'true';
    const { POST } = await loadRouteModule({ user: { id: 'user-1', email: 'user@test.com' } }, true, false);
    const response = await POST(
      generateRequest({
        body: JSON.stringify({ details: 'Je souhaite contester une décision.' }),
      })
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/vérifiez votre adresse e-mail/i);
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('retourne 500 si la clé OpenAI est manquante et restitue les crédits', async () => {
    const { POST } = await loadRouteModule();
    const request = generateRequest({
      body: JSON.stringify({ details: 'Je souhaite contester une décision.' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/indisponible/i);
    expect(reserveMock).toHaveBeenCalledTimes(1);
    expect(rollbackMock).toHaveBeenCalledWith({ usageId: 'usage-1', reason: 'provider_error' });
    expect(settleMock).not.toHaveBeenCalled();
  });

  it('retourne 402 si le solde est insuffisant', async () => {
    process.env.MOCK_AI = 'true';
    const { POST } = await loadRouteModule();
    reserveMock.mockRejectedValue(new InsufficientCreditsError(10, 2));

    const response = await POST(
      generateRequest({ body: JSON.stringify({ details: 'Je souhaite contester une décision.' }) })
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(402);
    expect(data.error).toMatch(/crédits/i);
    expect(settleMock).not.toHaveBeenCalled();
  });

  it('retourne 400 si le JSON est invalide', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const { POST } = await loadRouteModule();
    const request = generateRequest({
      body: '{invalid-json',
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('JSON invalide.');
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('retourne 400 si la description est absente', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const { POST } = await loadRouteModule();
    const request = generateRequest({
      body: JSON.stringify({ details: '   ' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('Description invalide.');
  });

  it('retourne 429 après dépassement du rate limit', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const { POST } = await loadRouteModule({ user: { id: 'user-rl', email: 'rl@test.com' } }, false);
    const response = await POST(
      generateRequest({
        body: JSON.stringify({ details: 'Demande bloquée' }),
      })
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(data.error).toMatch(/trop de requêtes/i);
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('retourne letter et emailVersion quand le provider répond correctement', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAPI_URL = 'https://example.test/v1/responses';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 80, completion_tokens: 120 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                letter: 'Lettre finale',
                emailVersion: 'Email final',
              }),
            },
          },
        ],
      }),
    });

    global.fetch = fetchMock;

    const { POST } = await loadRouteModule({ user: { id: 'user-1', email: 'success@test.com', name: 'User' } });
    const request = generateRequest({
      body: JSON.stringify({
        category: 'Assurance',
        tone: 'Standard',
        fullName: 'Test User',
        recipient: 'CAF de Paris',
        subject: 'Réexamen du dossier',
        details: 'Je souhaite contester une décision CAF.',
        attachments: 'Avis de situation',
      }),
    });

    const response = await POST(request);
    const data = (await response.json()) as {
      letter: string;
      emailVersion: string;
      billingType: string;
      remainingCredits: number;
    };

    expect(response.status).toBe(200);
    expect(data.letter).toBe('Lettre finale');
    expect(data.emailVersion).toBe('Email final');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(settleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        usageId: 'usage-1',
        inputTokens: 80,
        outputTokens: 120,
      })
    );
    expect(letterCreateMock).toHaveBeenCalledTimes(1);
  });

  it('retourne 502 si le format de réponse IA est invalide et restitue les crédits', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAPI_URL = 'https://example.test/v1/responses';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                emailVersion: 'Email sans lettre',
              }),
            },
          },
        ],
      }),
    });

    const { POST } = await loadRouteModule({ user: { id: 'user-err', email: 'err@test.com', name: 'Err' } });
    const request = generateRequest({
      body: JSON.stringify({ details: 'Je souhaite résilier mon assurance.' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(data.error).toBe('Format de réponse IA invalide.');
    expect(rollbackMock).toHaveBeenCalledTimes(1);
    expect(settleMock).not.toHaveBeenCalled();
  });

  it('refuse une génération rattachée au dossier d’un autre utilisateur', async () => {
    process.env.MOCK_AI = 'true';
    const { POST } = await loadRouteModule();
    dossierGetMock.mockRejectedValue(new DossierAccessError(403, 'Accès refusé.'));
    const response = await POST(
      generateRequest({
        body: JSON.stringify({
          details: 'Je souhaite contester une décision.',
          dossierId: '507f1f77bcf86cd799439012',
        }),
      })
    );
    expect(response.status).toBe(403);
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it('écrit le document du dossier après une génération rattachée', async () => {
    process.env.MOCK_AI = 'true';
    const { POST } = await loadRouteModule();
    const response = await POST(
      generateRequest({
        body: JSON.stringify({
          details: 'Je souhaite contester une décision.',
          dossierId: '507f1f77bcf86cd799439011',
          subject: 'Réexamen',
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(dossierGetMock).toHaveBeenCalledWith('user-1', '507f1f77bcf86cd799439011');
    expect(dossierUpdateMock).toHaveBeenCalledWith(
      'user-1',
      '507f1f77bcf86cd799439011',
      expect.objectContaining({
        document: expect.objectContaining({
          emailSubject: 'Réexamen',
        }),
      })
    );
    expect(letterCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dossierId: '507f1f77bcf86cd799439011' }),
      })
    );
  });
});
