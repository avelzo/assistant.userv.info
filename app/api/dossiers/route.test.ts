import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DossierAccessError } from '@/lib/dossiers/errors';

const originalEnv = { ...process.env };
const listMock = vi.fn();
const createMock = vi.fn();
const getMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();

type MockSession = { user: { id?: string; email: string } } | null;

function dossierRequest(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

async function loadRoutes(
  session: MockSession = { user: { id: '507f1f77bcf86cd799439011', email: 'user@test.com' } },
  emailVerified = true
) {
  vi.resetModules();
  listMock.mockReset();
  createMock.mockReset();
  getMock.mockReset();
  updateMock.mockReset();
  removeMock.mockReset();

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
      dossierIp: { windowMs: 60_000, max: 60 },
      dossierUser: { windowMs: 60_000, max: 60 },
    },
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, count: 1 }),
  }));
  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified }),
      },
    },
  }));
  vi.doMock('@/lib/dossiers', () => ({
    dossierService: {
      list: listMock,
      create: createMock,
      get: getMock,
      update: updateMock,
      remove: removeMock,
    },
    DossierAccessError,
  }));

  const collection = await import('@/app/api/dossiers/route');
  const item = await import('@/app/api/dossiers/[id]/route');
  return { ...collection, item };
}

describe('API /api/dossiers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('refuse un utilisateur non connecté', async () => {
    const { GET, POST } = await loadRoutes(null);
    expect((await GET(dossierRequest('/api/dossiers'))).status).toBe(401);
    expect(
      (
        await POST(
          dossierRequest('/api/dossiers', {
            method: 'POST',
            body: JSON.stringify({ objective: 'Test' }),
          })
        )
      ).status
    ).toBe(401);
  });

  it('crée un dossier pour l’utilisateur connecté', async () => {
    createMock.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      objective: 'Récupérer un dépôt',
      questions: [],
    });
    const { POST } = await loadRoutes();
    const response = await POST(
      dossierRequest('/api/dossiers', {
        method: 'POST',
        body: JSON.stringify({ objective: 'Récupérer un dépôt' }),
      })
    );
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', expect.objectContaining({
      objective: 'Récupérer un dépôt',
    }));
  });

  it('refuse l’accès au dossier d’un autre utilisateur', async () => {
    const { item } = await loadRoutes();
    getMock.mockRejectedValue(new DossierAccessError(403, 'Accès refusé.'));
    const response = await item.GET(dossierRequest('/api/dossiers/507f1f77bcf86cd799439012'), {
      params: Promise.resolve({ id: '507f1f77bcf86cd799439012' }),
    });
    expect(response.status).toBe(403);
  });

  it('refuse un utilisateur connecté dont l’e-mail n’est pas vérifié', async () => {
    const { POST } = await loadRoutes(
      { user: { id: '507f1f77bcf86cd799439011', email: 'user@test.com' } },
      false
    );
    const response = await POST(
      dossierRequest('/api/dossiers', {
        method: 'POST',
        body: JSON.stringify({ objective: 'Récupérer un dépôt' }),
      })
    );
    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('accepte un payload minimal valide', async () => {
    createMock.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      objective: 'Récupérer un dépôt',
    });
    const { POST } = await loadRoutes();
    const response = await POST(
      dossierRequest('/api/dossiers', {
        method: 'POST',
        body: JSON.stringify({ objective: 'Récupérer un dépôt' }),
      })
    );
    expect(response.status).toBe(201);
  });

  it('refuse un payload invalide', async () => {
    const { POST } = await loadRoutes();
    createMock.mockRejectedValue(
      new DossierAccessError(400, 'Indiquez au moins un objectif pour créer le dossier.')
    );
    const response = await POST(
      dossierRequest('/api/dossiers', {
        method: 'POST',
        body: JSON.stringify({ recipientName: 'SCI Martin' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('refuse une Origin non autorisée', async () => {
    const { POST } = await loadRoutes();
    const response = await POST(
      new Request('http://localhost/api/dossiers', {
        method: 'POST',
        headers: {
          Origin: 'https://evil.example',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objective: 'Test' }),
      })
    );
    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('accepte un GET same-origin sans en-tête Origin', async () => {
    const { GET } = await loadRoutes();
    listMock.mockResolvedValue([]);
    const response = await GET(
      new Request('http://localhost/api/dossiers', {
        headers: {
          'Sec-Fetch-Site': 'same-origin',
          Referer: 'http://localhost:3000/dossiers',
        },
      })
    );
    expect(response.status).toBe(200);
  });

  it('refuse la modification et la suppression d’un dossier d’un autre utilisateur', async () => {
    const { item } = await loadRoutes();
    updateMock.mockRejectedValue(new DossierAccessError(403, 'Accès refusé.'));
    removeMock.mockRejectedValue(new DossierAccessError(403, 'Accès refusé.'));
    const id = '507f1f77bcf86cd799439012';

    const patched = await item.PATCH(
      dossierRequest(`/api/dossiers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Hack' }),
      }),
      { params: Promise.resolve({ id }) }
    );
    const deleted = await item.DELETE(dossierRequest(`/api/dossiers/${id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id }),
    });

    expect(patched.status).toBe(403);
    expect(deleted.status).toBe(403);
  });
});
