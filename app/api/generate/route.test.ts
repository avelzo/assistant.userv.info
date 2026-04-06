import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

type MockSession = { user: { email: string; name?: string } } | null;

async function loadRouteModule(session: MockSession = null) {
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

  vi.doMock('next-auth', () => ({
    getServerSession: vi.fn().mockResolvedValue(session),
  }));

  vi.doMock('@/lib/auth', () => ({ authOptions: {} }));

  vi.doMock('@prisma/client', () => ({
    GenerationBillingType: { FREE: 'FREE', CREDIT: 'CREDIT' },
    CreditLedgerEntryType: { CONSUMPTION: 'CONSUMPTION' },
  }));

  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ freeGenerationsUsed: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      creditBalance: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi
        .fn()
        .mockImplementation(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            letterGeneration: { create: vi.fn().mockResolvedValue({}) },
            creditBalance: { update: vi.fn().mockResolvedValue({}) },
            creditLedgerEntry: { create: vi.fn().mockResolvedValue({}) },
            user: { update: vi.fn().mockResolvedValue({}) },
          })
        ),
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

  it('retourne le contenu mocké quand MOCK_AI est activé', async () => {
    process.env.MOCK_AI = 'true';

    const { POST } = await loadRouteModule();
    const response = await POST(new Request('http://localhost/api/generate', { method: 'POST' }));
    const data = (await response.json()) as { letter: string; emailVersion: string };

    expect(response.status).toBe(200);
    expect(data.letter).toMatch(/demande de réexamen/i);
    expect(data.emailVersion).toMatch(/cordialement/i);
  });

  it('retourne 500 si la clé OpenAI est manquante', async () => {
    const { POST } = await loadRouteModule();
    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: 'Je souhaite contester une décision.' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/api key manquante/i);
  });

  it('retourne 400 si le JSON est invalide', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const { POST } = await loadRouteModule();
    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('JSON invalide.');
  });

  it('retourne 400 si la description est absente', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const { POST } = await loadRouteModule();
    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: '   ' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('Description invalide.');
  });

  it('retourne 429 après dépassement du rate limit', async () => {
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
                letter: 'Lettre générée',
                emailVersion: 'Email généré',
              }),
            },
          },
        ],
      }),
    });

    const { POST } = await loadRouteModule({ user: { email: 'rl@test.com', name: 'Test RL' } });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const request = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.10',
        },
        body: JSON.stringify({ details: `Demande ${attempt}` }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    const blockedRequest = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({ details: 'Demande bloquée' }),
    });

    const blockedResponse = await POST(blockedRequest);
    const blockedData = (await blockedResponse.json()) as { error: string };

    expect(blockedResponse.status).toBe(429);
    expect(blockedData.error).toMatch(/trop de requêtes/i);
  });

  it('retourne letter et emailVersion quand le provider répond correctement', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAPI_URL = 'https://example.test/v1/responses';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
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

    const { POST } = await loadRouteModule({ user: { email: 'success@test.com', name: 'User' } });
    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.8',
      },
      body: JSON.stringify({
        category: 'Assurance',
        tone: 'Standard',
        fullName: 'Laurent Hunaut',
        recipient: 'CAF de Paris',
        subject: 'Réexamen du dossier',
        details: 'Je souhaite contester une décision CAF.',
        attachments: 'Avis de situation',
      }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { letter: string; emailVersion: string; billingType: string; remainingCredits: number };

    expect(response.status).toBe(200);
    expect(data.letter).toBe('Lettre finale');
    expect(data.emailVersion).toBe('Email final');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retourne 502 si le format de réponse IA est invalide', async () => {
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

    const { POST } = await loadRouteModule({ user: { email: 'err@test.com', name: 'Err' } });
    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.0.2.24',
      },
      body: JSON.stringify({ details: 'Je souhaite résilier mon assurance.' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(data.error).toBe('Format de réponse IA invalide.');
  });
});