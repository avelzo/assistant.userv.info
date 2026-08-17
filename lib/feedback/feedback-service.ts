import {
  AiOperation,
  UserFeedbackKind as PrismaFeedbackKind,
  UserFeedbackRating as PrismaFeedbackRating,
  type UserFeedback,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { DossierAccessError } from '@/lib/dossiers/errors';
import {
  FEEDBACK_COMMENT_MAX,
  isUserFeedbackKind,
  isUserFeedbackRating,
  operationFromFeedbackKind,
  type UserFeedbackKind,
  type UserFeedbackRating,
} from '@/lib/feedback/kinds';

export type FeedbackWriteInput = {
  kind?: unknown;
  rating?: unknown;
  comment?: unknown;
  dossierId?: unknown;
  aiUsageId?: unknown;
  operation?: unknown;
};

export type FeedbackView = {
  id: string;
  userId: string;
  dossierId: string | null;
  aiUsageId: string | null;
  operation: AiOperation | null;
  kind: UserFeedbackKind;
  rating: UserFeedbackRating | null;
  comment: string;
  createdAt: string;
};

type PrismaLike = {
  dossier: { findUnique: typeof defaultPrisma.dossier.findUnique };
  aiUsage: { findUnique: typeof defaultPrisma.aiUsage.findUnique };
  userFeedback: {
    create: typeof defaultPrisma.userFeedback.create;
    findMany: typeof defaultPrisma.userFeedback.findMany;
  };
};

function clipComment(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, FEEDBACK_COMMENT_MAX);
}

function isObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function toView(row: UserFeedback): FeedbackView {
  return {
    id: row.id,
    userId: row.userId,
    dossierId: row.dossierId,
    aiUsageId: row.aiUsageId,
    operation: row.operation,
    kind: row.kind as UserFeedbackKind,
    rating: (row.rating as UserFeedbackRating | null) ?? null,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createFeedbackService(deps: { prisma?: PrismaLike } = {}) {
  const db = deps.prisma ?? defaultPrisma;

  async function create(userId: string, input: FeedbackWriteInput): Promise<FeedbackView> {
    if (!isUserFeedbackKind(input.kind)) {
      throw new DossierAccessError(400, 'Choisissez un motif de retour.');
    }

    const rating = input.rating == null || input.rating === '' ? null : input.rating;
    if (rating !== null && !isUserFeedbackRating(rating)) {
      throw new DossierAccessError(400, 'Note invalide.');
    }

    const dossierId = typeof input.dossierId === 'string' && input.dossierId.trim() ? input.dossierId.trim() : '';
    if (dossierId) {
      if (!isObjectId(dossierId)) {
        throw new DossierAccessError(400, 'Dossier invalide.');
      }
      const dossier = await db.dossier.findUnique({
        where: { id: dossierId },
        select: { id: true, userId: true },
      });
      if (!dossier || dossier.userId !== userId) {
        throw new DossierAccessError(403, 'Accès refusé.');
      }
    }

    const aiUsageId = typeof input.aiUsageId === 'string' && input.aiUsageId.trim() ? input.aiUsageId.trim() : '';
    let usageOperation: AiOperation | undefined;
    if (aiUsageId) {
      if (!isObjectId(aiUsageId)) {
        throw new DossierAccessError(400, 'Usage IA invalide.');
      }
      const usage = await db.aiUsage.findUnique({
        where: { id: aiUsageId },
        select: { id: true, userId: true, operation: true },
      });
      if (!usage || usage.userId !== userId) {
        throw new DossierAccessError(403, 'Accès refusé.');
      }
      usageOperation = usage.operation;
    }

    const requestedOperation = typeof input.operation === 'string' ? input.operation.trim() : '';
    const explicitOperation =
      requestedOperation && (Object.values(AiOperation) as string[]).includes(requestedOperation)
        ? (requestedOperation as AiOperation)
        : null;
    if (requestedOperation && !explicitOperation) {
      throw new DossierAccessError(400, 'Opération invalide.');
    }

    const operation = explicitOperation || usageOperation || operationFromFeedbackKind(input.kind) || null;

    const row = await db.userFeedback.create({
      data: {
        userId,
        dossierId: dossierId || null,
        aiUsageId: aiUsageId || null,
        operation,
        kind: input.kind as PrismaFeedbackKind,
        rating: rating ? (rating as PrismaFeedbackRating) : null,
        comment: clipComment(input.comment),
      },
    });

    return toView(row);
  }

  async function listForAdmin(params: { take?: number } = {}): Promise<FeedbackView[]> {
    const take = Math.min(200, Math.max(1, params.take ?? 100));
    const rows = await db.userFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map(toView);
  }

  return { create, listForAdmin };
}

export const feedbackService = createFeedbackService();
