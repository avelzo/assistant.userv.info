import { AiOperation } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createFeedbackService } from '@/lib/feedback/feedback-service';
import { DossierAccessError } from '@/lib/dossiers/errors';

const ownerId = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439099';
const dossierId = '507f1f77bcf86cd799439012';
const usageId = '507f1f77bcf86cd799439013';

function createMemoryDb() {
  const feedbacks: Array<Record<string, unknown>> = [];
  let seq = 1;
  const prisma = {
    dossier: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === dossierId ? { id: dossierId, userId: ownerId } : null,
    },
    aiUsage: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === usageId
          ? { id: usageId, userId: ownerId, operation: AiOperation.REWRITE_SELECTION }
          : null,
    },
    userFeedback: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `fb${seq++}`, createdAt: new Date('2026-08-16T10:00:00.000Z'), ...data };
        feedbacks.push(row);
        return row;
      },
      findMany: async () => [...feedbacks].reverse(),
    },
  };
  return { prisma, feedbacks };
}

describe('feedbackService', () => {
  it('enregistre un retour possédé avec commentaire explicite seulement', async () => {
    const { prisma, feedbacks } = createMemoryDb();
    const service = createFeedbackService({ prisma: prisma as never });
    const created = await service.create(ownerId, {
      kind: 'REWRITE_INCORRECT',
      rating: 'NOT_USEFUL',
      comment: 'Le passage sur le dépôt a été mal reformulé.',
      dossierId,
      aiUsageId: usageId,
    });

    expect(created.userId).toBe(ownerId);
    expect(created.dossierId).toBe(dossierId);
    expect(created.operation).toBe('REWRITE_SELECTION');
    expect(created.comment).toMatch(/dépôt/);
    expect(JSON.stringify(feedbacks[0])).not.toMatch(/prompt/i);
    expect(Object.keys(feedbacks[0] || {})).not.toContain('letter');
  });

  it('refuse de rattacher le dossier d’un autre utilisateur', async () => {
    const { prisma } = createMemoryDb();
    const service = createFeedbackService({ prisma: prisma as never });
    await expect(
      service.create(otherId, { kind: 'TECHNICAL_ISSUE', dossierId })
    ).rejects.toBeInstanceOf(DossierAccessError);
  });

  it('refuse un aiUsageId d’un autre utilisateur', async () => {
    const { prisma } = createMemoryDb();
    const service = createFeedbackService({ prisma: prisma as never });
    await expect(
      service.create(otherId, { kind: 'OTHER', aiUsageId: usageId })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('liste les retours pour l’admin', async () => {
    const { prisma } = createMemoryDb();
    const service = createFeedbackService({ prisma: prisma as never });
    await service.create(ownerId, { kind: 'ADVICE_NOT_USEFUL' });
    const list = await service.listForAdmin();
    expect(list).toHaveLength(1);
    expect(list[0]?.operation).toBe('ANALYZE_SITUATION');
  });
});
