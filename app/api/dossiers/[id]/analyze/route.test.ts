import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DossierAccessError } from '@/lib/dossiers/errors';
import { InsufficientCreditsError } from '@/lib/credits/errors';
import { InvalidAiPayloadError } from '@/lib/dossiers/errors';

const originalEnv = { ...process.env };
const getMock = vi.fn();
const updateMock = vi.fn();
const applyGeneratedMock = vi.fn();
const applyRewriteMock = vi.fn();
const reserveMock = vi.fn();
const settleMock = vi.fn();
const rollbackMock = vi.fn();
const analyzeMock = vi.fn();
const generateMock = vi.fn();
const rewriteMock = vi.fn();

const ownerId = '507f1f77bcf86cd799439011';
const dossierId = '507f1f77bcf86cd799439012';
const documentId = '507f1f77bcf86cd799439013';

function request(path: string, body?: Record<string, unknown>, key = 'idempotency-key-1') {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body ?? {}),
  });
}

async function loadRoutes(emailVerified = true) {
  vi.resetModules();
  getMock.mockReset();
  updateMock.mockReset();
  applyGeneratedMock.mockReset();
  applyRewriteMock.mockReset();
  reserveMock.mockReset();
  settleMock.mockReset();
  rollbackMock.mockReset();
  analyzeMock.mockReset();
  generateMock.mockReset();
  rewriteMock.mockReset();

  reserveMock.mockResolvedValue({
    usageId: 'usage-1',
    creditsCharged: 5,
    alreadySettled: false,
    paidCharged: 0,
  });
  settleMock.mockResolvedValue({});
  rollbackMock.mockResolvedValue({});

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
    requireAuthSession: vi.fn().mockResolvedValue({ user: { id: ownerId, email: 'user@test.com' } }),
  }));
  vi.doMock('@/lib/security-event', () => ({ recordSecurityEvent: vi.fn() }));
  vi.doMock('@/lib/rate-limit', () => ({
    RATE_LIMITS: { dossierIp: { windowMs: 60_000, max: 60 }, dossierUser: { windowMs: 60_000, max: 60 } },
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, count: 1 }),
  }));
  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      user: { findUnique: vi.fn().mockResolvedValue({ emailVerified, firstname: 'Léa', lastname: 'Martin', email: 'user@test.com' }) },
      letterGeneration: { create: vi.fn().mockResolvedValue({}) },
    },
  }));
  vi.doMock('@/lib/credits', () => ({
    creditService: { reserve: reserveMock, settle: settleMock, rollback: rollbackMock },
    InsufficientCreditsError,
  }));
  vi.doMock('@/lib/dossiers', () => ({
    dossierService: {
      get: getMock,
      update: updateMock,
      applyGeneratedDocument: applyGeneratedMock,
      applySelectionRewrite: applyRewriteMock,
    },
    DossierAccessError,
  }));
  vi.doMock('@/lib/ai/analyze-situation', () => ({ analyzeSituation: analyzeMock }));
  vi.doMock('@/lib/ai/generate-dossier-letter', () => ({ generateDossierLetter: generateMock }));
  vi.doMock('@/lib/ai/rewrite-selection', () => ({ rewriteSelection: rewriteMock }));

  const analyze = await import('@/app/api/dossiers/[id]/analyze/route');
  const generate = await import('@/app/api/dossiers/[id]/generate-letter/route');
  const rewrite = await import('@/app/api/dossiers/[id]/rewrite/route');
  return { analyze, generate, rewrite };
}

const context = { params: Promise.resolve({ id: dossierId }) };

describe('API copilote / génération / rewrite', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, MOCK_AI: 'true' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('persiste le conseil et accepte 0 question', async () => {
    const { analyze } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      objective: 'Je veux récupérer les 850 € de dépôt de garantie non rendus.',
      recipientName: 'SCI Martin',
      recipientCategory: '',
      suggestedTone: '',
      context: 'Le bail s’est terminé le 30 juin 2026 après remise des clés.',
      questions: [],
      advice: '',
      status: 'DRAFT',
    });
    analyzeMock.mockResolvedValue({
      payload: {
        recipientCategory: 'Propriétaire',
        suggestedTone: 'ferme et courtois',
        questions: [],
        advice: 'Commencez par une demande écrite.',
      },
      usage: { inputTokens: 1, outputTokens: 1, estimatedCost: 1, model: 'mock-ai' },
    });
    updateMock.mockResolvedValue({ id: dossierId, advice: 'Commencez par une demande écrite.', questions: [] });

    const response = await analyze.POST(request(`/api/dossiers/${dossierId}/analyze`), context);
    expect(response.status).toBe(200);
    expect(analyzeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        objective: 'Je veux récupérer les 850 € de dépôt de garantie non rendus.',
        recipientName: 'SCI Martin',
        context: 'Le bail s’est terminé le 30 juin 2026 après remise des clés.',
        hasDocument: false,
      })
    );
    expect(analyzeMock.mock.calls[0]?.[0]).not.toHaveProperty('bodyBlocks');
    expect(analyzeMock.mock.calls[0]?.[0]).not.toHaveProperty('document');
    expect(updateMock).toHaveBeenCalledWith(
      ownerId,
      dossierId,
      expect.objectContaining({
        advice: 'Commencez par une demande écrite.',
        questions: [],
      })
    );
    expect(updateMock.mock.calls[0]?.[2]).not.toHaveProperty('document');
    expect(applyGeneratedMock).not.toHaveBeenCalled();
    expect(applyRewriteMock).not.toHaveBeenCalled();
  });

  it('n’envoie pas le courrier existant à ANALYZE_SITUATION et ne le réécrit pas', async () => {
    const { analyze } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      objective: 'Je veux récupérer ma caution auprès de mon ancien propriétaire.',
      recipientName: 'Mon ancien propriétaire',
      recipientCategory: '',
      suggestedTone: '',
      context: 'Il ne me l’a toujours pas rendue.',
      questions: [{ id: 'q1', prompt: 'Quel était le montant du dépôt de garantie ?', answer: '' }],
      advice: '',
      status: 'DRAFT',
      document: {
        id: documentId,
        bodyBlocks: [{ id: 'b1', type: 'paragraph', text: 'Madame, Monsieur, je vous prie d’agréer…' }],
        emailSubject: 'Caution',
        emailBody: 'Bonjour',
      },
    });
    analyzeMock.mockResolvedValue({
      payload: {
        recipientCategory: 'Propriétaire',
        suggestedTone: 'ferme et courtois',
        questions: [{ prompt: 'Quand avez-vous rendu les clés ?' }],
        advice: 'Vous pouvez relancer par écrit.',
      },
      usage: { inputTokens: 1, outputTokens: 1, estimatedCost: 1, model: 'mock-ai' },
    });
    updateMock.mockResolvedValue({ id: dossierId });

    const response = await analyze.POST(request(`/api/dossiers/${dossierId}/analyze`), context);
    expect(response.status).toBe(200);
    expect(analyzeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasDocument: true,
        objective: 'Je veux récupérer ma caution auprès de mon ancien propriétaire.',
        context: 'Il ne me l’a toujours pas rendue.',
      })
    );
    const analyzeInput = analyzeMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(analyzeInput).not.toHaveProperty('bodyBlocks');
    expect(JSON.stringify(analyzeInput)).not.toMatch(/Madame, Monsieur/);
    expect(applyGeneratedMock).not.toHaveBeenCalled();
    expect(applyRewriteMock).not.toHaveBeenCalled();
    expect(updateMock.mock.calls[0]?.[2]).not.toHaveProperty('document');
  });

  it('efface les questions précédentes si l’analyse n’en pose plus', async () => {
    const { analyze } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      objective: 'Dossier complet.',
      recipientName: 'SCI Martin',
      recipientCategory: 'Propriétaire',
      suggestedTone: '',
      context: 'Faits déjà fournis.',
      questions: [{ id: 'q1', prompt: 'Quel était le montant du dépôt de garantie ?', answer: '850 €' }],
      advice: '',
      status: 'IN_PROGRESS',
      document: null,
    });
    analyzeMock.mockResolvedValue({
      payload: {
        recipientCategory: 'Propriétaire',
        suggestedTone: 'ferme et courtois',
        questions: [],
        advice: 'Vous pouvez passer à la rédaction.',
      },
      usage: { inputTokens: 1, outputTokens: 1, estimatedCost: 1, model: 'mock-ai' },
    });
    updateMock.mockResolvedValue({ id: dossierId, questions: [] });

    const response = await analyze.POST(request(`/api/dossiers/${dossierId}/analyze`), context);
    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      ownerId,
      dossierId,
      expect.objectContaining({ questions: [] })
    );
  });

  it('refuse un dossier d’un autre utilisateur', async () => {
    const { generate } = await loadRoutes();
    getMock.mockRejectedValue(new DossierAccessError(403, 'Accès refusé.'));
    const response = await generate.POST(request(`/api/dossiers/${dossierId}/generate-letter`), context);
    expect(response.status).toBe(403);
  });

  it('refuse les crédits insuffisants', async () => {
    const { generate } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      objective: 'Objectif suffisant pour générer un courrier.',
      recipientName: 'SCI',
      recipientCategory: '',
      suggestedTone: '',
      context: '',
      questions: [],
      advice: '',
      status: 'DRAFT',
    });
    reserveMock.mockRejectedValue(new InsufficientCreditsError(10, 0));
    const response = await generate.POST(request(`/api/dossiers/${dossierId}/generate-letter`), context);
    expect(response.status).toBe(402);
  });

  it('sauvegarde le document généré', async () => {
    const { generate } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      objective: 'Récupérer un dépôt de garantie de 850 euros.',
      recipientName: 'SCI Martin',
      recipientCategory: 'Propriétaire',
      suggestedTone: 'ferme',
      context: 'Bail terminé',
      questions: [],
      advice: 'Écrivez.',
      status: 'IN_PROGRESS',
    });
    generateMock.mockResolvedValue({
      payload: {
        letter: 'Madame, Monsieur,\n\nJe vous demande la restitution.',
        emailSubject: 'Dépôt',
        emailBody: 'Bonjour, merci de restituer le dépôt.',
      },
      usage: { inputTokens: 1, outputTokens: 1, estimatedCost: 1, model: 'mock-ai' },
    });
    applyGeneratedMock.mockResolvedValue({
      id: dossierId,
      document: { bodyBlocks: [{ id: 'b1', type: 'paragraph', text: 'Madame, Monsieur,' }], emailSubject: 'Dépôt', emailBody: 'Bonjour' },
    });
    const response = await generate.POST(request(`/api/dossiers/${dossierId}/generate-letter`), context);
    expect(response.status).toBe(200);
    expect(applyGeneratedMock).toHaveBeenCalled();
  });

  it('rollback si la réponse IA est invalide', async () => {
    const { analyze } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      objective: 'Objectif pour analyser.',
      recipientName: 'X',
      recipientCategory: '',
      suggestedTone: '',
      context: 'Contexte',
      questions: [],
      advice: '',
      status: 'DRAFT',
    });
    analyzeMock.mockRejectedValue(new InvalidAiPayloadError());
    const response = await analyze.POST(request(`/api/dossiers/${dossierId}/analyze`), context);
    expect(response.status).toBe(502);
    expect(rollbackMock).toHaveBeenCalled();
  });

  it('refuse une révision obsolète sur rewrite', async () => {
    const { rewrite } = await loadRoutes();
    getMock.mockResolvedValue({
      id: dossierId,
      document: {
        id: documentId,
        revision: 2,
        bodyBlocks: [{ id: 'blk-1', type: 'paragraph', text: 'Je vous demande de bien vouloir me rendre ma caution.' }],
      },
    });
    const response = await rewrite.POST(
      request(`/api/dossiers/${dossierId}/rewrite`, {
        documentId,
        blockId: 'blk-1',
        selectedText: 'bien vouloir',
        start: 19,
        end: 31,
        action: 'reformulate',
        revision: 1,
      }),
      context
    );
    expect(response.status).toBe(409);
    expect(rewriteMock).not.toHaveBeenCalled();
  });

  it('applique un rewrite partiel', async () => {
    const { rewrite } = await loadRoutes();
    const text = 'Je vous demande de bien vouloir me rendre ma caution.';
    const start = text.indexOf('bien vouloir');
    getMock.mockResolvedValue({
      id: dossierId,
      document: {
        id: documentId,
        revision: 1,
        bodyBlocks: [{ id: 'blk-1', type: 'paragraph', text }],
      },
    });
    rewriteMock.mockResolvedValue({
      payload: { replacement: 'procéder à' },
      usage: { inputTokens: 1, outputTokens: 1, estimatedCost: 1, model: 'mock-ai' },
    });
    applyRewriteMock.mockResolvedValue({
      id: dossierId,
      document: { bodyBlocks: [{ id: 'blk-1', text: 'Je vous demande de procéder à me rendre ma caution.' }] },
    });
    const response = await rewrite.POST(
      request(`/api/dossiers/${dossierId}/rewrite`, {
        documentId,
        blockId: 'blk-1',
        selectedText: 'bien vouloir',
        start,
        end: start + 'bien vouloir'.length,
        action: 'reformulate',
        revision: 1,
      }),
      context
    );
    expect(response.status).toBe(200);
    expect(applyRewriteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replacement: 'procéder à',
        selectedText: 'bien vouloir',
      })
    );
  });
});
