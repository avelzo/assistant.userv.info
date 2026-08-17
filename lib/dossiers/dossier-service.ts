import {
  DocumentVersionSource,
  DossierStatus,
  Prisma,
  type Document as DocumentModel,
  type Dossier,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import {
  DOCUMENT_BODY_FORMAT,
  normalizeDocumentBlocks,
  replaceBlockText,
  textToBlocks,
  type DocumentBlock,
} from '@/lib/dossiers/document-blocks';
import { DossierAccessError, StaleRevisionError } from '@/lib/dossiers/errors';
import { normalizeQuestions, type DossierQuestion } from '@/lib/dossiers/questions';
import { applySelectionRewrite as rewriteSelectedText } from '@/lib/dossiers/selection';

export const DOSSIER_LIMITS = {
  title: 200,
  objective: 2000,
  recipientName: 200,
  recipientCategory: 80,
  suggestedTone: 80,
  context: 8000,
  advice: 8000,
  emailSubject: 300,
  emailBody: 20_000,
} as const;

export type DossierDocumentView = {
  id: string;
  bodyFormat: string;
  bodyBlocks: DocumentBlock[];
  emailSubject: string;
  emailBody: string;
  revision: number;
  updatedAt: string;
};

export type DossierView = {
  id: string;
  userId: string;
  title: string;
  objective: string;
  recipientName: string;
  recipientCategory: string;
  suggestedTone: string;
  context: string;
  status: DossierStatus;
  advice: string;
  questions: DossierQuestion[];
  createdAt: string;
  updatedAt: string;
  document: DossierDocumentView | null;
};

export type DossierSummary = Omit<DossierView, 'document' | 'questions' | 'advice' | 'context' | 'suggestedTone'> & {
  contextPreview: string;
  questionCount: number;
  hasDocument: boolean;
};

export type DossierWriteInput = {
  title?: string;
  objective?: string;
  recipientName?: string;
  recipientCategory?: string;
  suggestedTone?: string;
  context?: string;
  status?: DossierStatus | string;
  advice?: string;
  questions?: unknown;
  document?: {
    bodyBlocks?: unknown;
    bodyText?: string;
    emailSubject?: string;
    emailBody?: string;
    expectedRevision?: number;
  };
};

type PrismaLike = {
  dossier: {
    findUnique: typeof defaultPrisma.dossier.findUnique;
    findMany: typeof defaultPrisma.dossier.findMany;
    create: typeof defaultPrisma.dossier.create;
    update: typeof defaultPrisma.dossier.update;
    delete: typeof defaultPrisma.dossier.delete;
  };
  document: {
    findUnique: typeof defaultPrisma.document.findUnique;
    update: typeof defaultPrisma.document.update;
    deleteMany: typeof defaultPrisma.document.deleteMany;
  };
  documentVersion: {
    create: typeof defaultPrisma.documentVersion.create;
    deleteMany: typeof defaultPrisma.documentVersion.deleteMany;
  };
  letterGeneration: {
    updateMany: typeof defaultPrisma.letterGeneration.updateMany;
  };
  aiUsage: {
    updateMany: typeof defaultPrisma.aiUsage.updateMany;
  };
};

function clip(value: string | undefined, max: number): string {
  return (value || '').trim().slice(0, max);
}

function parseStatus(value: unknown, fallback: DossierStatus): DossierStatus {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }
  const allowed = Object.values(DossierStatus) as string[];
  if (!allowed.includes(value)) {
    throw new DossierAccessError(400, 'Statut de dossier invalide.');
  }
  return value as DossierStatus;
}

function toDocumentView(document: DocumentModel | null | undefined): DossierDocumentView | null {
  if (!document) {
    return null;
  }
  return {
    id: document.id,
    bodyFormat: document.bodyFormat,
    bodyBlocks: normalizeDocumentBlocks(document.bodyBlocks),
    emailSubject: document.emailSubject,
    emailBody: document.emailBody,
    revision: document.revision,
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toView(dossier: Dossier & { document?: DocumentModel | null }): DossierView {
  return {
    id: dossier.id,
    userId: dossier.userId,
    title: dossier.title,
    objective: dossier.objective,
    recipientName: dossier.recipientName,
    recipientCategory: dossier.recipientCategory,
    suggestedTone: dossier.suggestedTone || '',
    context: dossier.context,
    status: dossier.status,
    advice: dossier.advice,
    questions: normalizeQuestions(dossier.questions),
    createdAt: dossier.createdAt.toISOString(),
    updatedAt: dossier.updatedAt.toISOString(),
    document: toDocumentView(dossier.document),
  };
}

function documentCreateData(input?: DossierWriteInput['document']) {
  const blocks = input?.bodyBlocks
    ? normalizeDocumentBlocks(input.bodyBlocks)
    : typeof input?.bodyText === 'string'
      ? textToBlocks(input.bodyText)
      : [];

  return {
    bodyFormat: DOCUMENT_BODY_FORMAT,
    bodyBlocks: blocks as unknown as Prisma.InputJsonValue,
    emailSubject: clip(input?.emailSubject, DOSSIER_LIMITS.emailSubject),
    emailBody: (input?.emailBody || '').slice(0, DOSSIER_LIMITS.emailBody),
    revision: 1,
  };
}

export function createDossierService(deps: { prisma?: PrismaLike } = {}) {
  const db = (deps.prisma ?? defaultPrisma) as PrismaLike;

  async function loadOwned(userId: string, dossierId: string) {
    const dossier = await db.dossier.findUnique({
      where: { id: dossierId },
      include: { document: true },
    });
    if (!dossier) {
      throw new DossierAccessError(404, 'Dossier introuvable.');
    }
    if (dossier.userId !== userId) {
      throw new DossierAccessError(403, 'Accès refusé.');
    }
    return dossier;
  }

  async function snapshotDocument(params: {
    documentId: string;
    revision: number;
    bodyBlocks: DocumentBlock[];
    emailSubject: string;
    emailBody: string;
    source: DocumentVersionSource;
    operation?: string;
  }) {
    await db.documentVersion.create({
      data: {
        documentId: params.documentId,
        revision: params.revision,
        bodyBlocks: params.bodyBlocks as unknown as Prisma.InputJsonValue,
        emailSubject: params.emailSubject,
        emailBody: params.emailBody,
        source: params.source,
        operation: params.operation,
      },
    });
  }

  async function create(userId: string, input: DossierWriteInput): Promise<DossierView> {
    const objective = clip(input.objective, DOSSIER_LIMITS.objective);
    const title = clip(input.title, DOSSIER_LIMITS.title) || objective.slice(0, 80);

    if (!objective && !title) {
      throw new DossierAccessError(400, 'Indiquez au moins un objectif pour créer le dossier.');
    }

    const dossier = await db.dossier.create({
      data: {
        userId,
        title,
        objective,
        recipientName: clip(input.recipientName, DOSSIER_LIMITS.recipientName),
        recipientCategory: clip(input.recipientCategory, DOSSIER_LIMITS.recipientCategory),
        suggestedTone: clip(input.suggestedTone, DOSSIER_LIMITS.suggestedTone),
        context: clip(input.context, DOSSIER_LIMITS.context),
        status: parseStatus(input.status, DossierStatus.DRAFT),
        advice: clip(input.advice, DOSSIER_LIMITS.advice),
        questions: normalizeQuestions(input.questions) as unknown as Prisma.InputJsonValue,
        document: {
          create: documentCreateData(input.document),
        },
      },
      include: { document: true },
    });

    return toView(dossier);
  }

  async function list(userId: string): Promise<DossierSummary[]> {
    const rows = await db.dossier.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { document: true },
    });

    return rows.map((dossier) => {
      const view = toView(dossier);
      return {
        id: view.id,
        userId: view.userId,
        title: view.title,
        objective: view.objective,
        recipientName: view.recipientName,
        recipientCategory: view.recipientCategory,
        status: view.status,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
        contextPreview: view.context.trim().slice(0, 140),
        questionCount: view.questions.length,
        hasDocument: Boolean(view.document && view.document.bodyBlocks.some((block) => block.text.trim())),
      };
    });
  }

  async function get(userId: string, dossierId: string): Promise<DossierView> {
    return toView(await loadOwned(userId, dossierId));
  }

  async function update(userId: string, dossierId: string, input: DossierWriteInput): Promise<DossierView> {
    const current = await loadOwned(userId, dossierId);

    const data: Prisma.DossierUpdateInput = {};
    if (input.title !== undefined) data.title = clip(input.title, DOSSIER_LIMITS.title);
    if (input.objective !== undefined) data.objective = clip(input.objective, DOSSIER_LIMITS.objective);
    if (input.recipientName !== undefined) {
      data.recipientName = clip(input.recipientName, DOSSIER_LIMITS.recipientName);
    }
    if (input.recipientCategory !== undefined) {
      data.recipientCategory = clip(input.recipientCategory, DOSSIER_LIMITS.recipientCategory);
    }
    if (input.suggestedTone !== undefined) {
      data.suggestedTone = clip(input.suggestedTone, DOSSIER_LIMITS.suggestedTone);
    }
    if (input.context !== undefined) data.context = clip(input.context, DOSSIER_LIMITS.context);
    if (input.status !== undefined) data.status = parseStatus(input.status, DossierStatus.DRAFT);
    if (input.advice !== undefined) data.advice = clip(input.advice, DOSSIER_LIMITS.advice);
    if (input.questions !== undefined) {
      data.questions = normalizeQuestions(input.questions) as unknown as Prisma.InputJsonValue;
    }

    if (input.document) {
      if (
        typeof input.document.expectedRevision === 'number' &&
        current.document &&
        current.document.revision !== input.document.expectedRevision
      ) {
        throw new StaleRevisionError();
      }

      const nextBlocks = input.document.bodyBlocks
        ? normalizeDocumentBlocks(input.document.bodyBlocks)
        : typeof input.document.bodyText === 'string'
          ? textToBlocks(input.document.bodyText)
          : undefined;

      data.document = {
        upsert: {
          create: documentCreateData(input.document),
          update: {
            ...(nextBlocks
              ? { bodyBlocks: nextBlocks as unknown as Prisma.InputJsonValue, bodyFormat: DOCUMENT_BODY_FORMAT }
              : {}),
            ...(input.document.emailSubject !== undefined
              ? { emailSubject: clip(input.document.emailSubject, DOSSIER_LIMITS.emailSubject) }
              : {}),
            ...(input.document.emailBody !== undefined
              ? { emailBody: input.document.emailBody.slice(0, DOSSIER_LIMITS.emailBody) }
              : {}),
            revision: { increment: 1 },
          },
        },
      };
    }

    const dossier = await db.dossier.update({
      where: { id: dossierId },
      data,
      include: { document: true },
    });

    return toView(dossier);
  }

  async function duplicate(userId: string, dossierId: string): Promise<DossierView> {
    const source = await loadOwned(userId, dossierId);
    const title = clip(`Copie — ${source.title || source.objective}`, DOSSIER_LIMITS.title);
    const blocks = source.document ? normalizeDocumentBlocks(source.document.bodyBlocks).map((block) => ({
      ...block,
      id: `${block.id}-copy`.slice(0, 80),
    })) : [];

    return create(userId, {
      title,
      objective: source.objective,
      recipientName: source.recipientName,
      recipientCategory: source.recipientCategory,
      suggestedTone: source.suggestedTone,
      context: source.context,
      status: DossierStatus.DRAFT,
      advice: source.advice,
      questions: source.questions,
      document: source.document
        ? {
            bodyBlocks: blocks,
            emailSubject: source.document.emailSubject,
            emailBody: source.document.emailBody,
          }
        : undefined,
    });
  }

  async function applyGeneratedDocument(params: {
    userId: string;
    dossierId: string;
    bodyText: string;
    emailSubject: string;
    emailBody: string;
    source?: DocumentVersionSource;
    operation?: string;
    status?: DossierStatus;
  }): Promise<DossierView> {
    const current = await loadOwned(params.userId, params.dossierId);
    const blocks = textToBlocks(params.bodyText);
    const emailSubject = clip(params.emailSubject, DOSSIER_LIMITS.emailSubject);
    const emailBody = params.emailBody.slice(0, DOSSIER_LIMITS.emailBody);
    const nextRevision = (current.document?.revision || 1) + 1;
    const source = params.source ?? DocumentVersionSource.AI_GENERATION;

    const dossier = await db.dossier.update({
      where: { id: params.dossierId },
      data: {
        status: params.status ?? DossierStatus.READY,
        document: {
          upsert: {
            create: {
              bodyFormat: DOCUMENT_BODY_FORMAT,
              bodyBlocks: blocks as unknown as Prisma.InputJsonValue,
              emailSubject,
              emailBody,
              revision: nextRevision,
            },
            update: {
              bodyFormat: DOCUMENT_BODY_FORMAT,
              bodyBlocks: blocks as unknown as Prisma.InputJsonValue,
              emailSubject,
              emailBody,
              revision: nextRevision,
            },
          },
        },
      },
      include: { document: true },
    });

    if (dossier.document) {
      await snapshotDocument({
        documentId: dossier.document.id,
        revision: dossier.document.revision,
        bodyBlocks: normalizeDocumentBlocks(dossier.document.bodyBlocks),
        emailSubject: dossier.document.emailSubject,
        emailBody: dossier.document.emailBody,
        source,
        operation: params.operation,
      });
    }

    return toView(dossier);
  }

  async function applySelectionRewrite(params: {
    userId: string;
    dossierId: string;
    documentId: string;
    blockId: string;
    start: number;
    end: number;
    selectedText: string;
    replacement: string;
    expectedRevision: number;
    operation?: string;
  }): Promise<DossierView> {
    const current = await loadOwned(params.userId, params.dossierId);
    if (!current.document) {
      throw new DossierAccessError(404, 'Document introuvable.');
    }
    if (current.document.id !== params.documentId) {
      throw new DossierAccessError(404, 'Document introuvable.');
    }
    if (current.document.revision !== params.expectedRevision) {
      throw new StaleRevisionError();
    }

    const blocks = normalizeDocumentBlocks(current.document.bodyBlocks);
    const block = blocks.find((entry) => entry.id === params.blockId);
    if (!block) {
      throw new DossierAccessError(400, 'Bloc introuvable.');
    }

    const nextText = rewriteSelectedText({
      text: block.text,
      start: params.start,
      end: params.end,
      selectedText: params.selectedText,
      replacement: params.replacement,
    });
    const nextBlocks = replaceBlockText(blocks, params.blockId, nextText);
    const nextRevision = current.document.revision + 1;

    await db.document.update({
      where: { id: current.document.id },
      data: {
        bodyBlocks: nextBlocks as unknown as Prisma.InputJsonValue,
        revision: nextRevision,
      },
    });

    await snapshotDocument({
      documentId: current.document.id,
      revision: nextRevision,
      bodyBlocks: nextBlocks,
      emailSubject: current.document.emailSubject,
      emailBody: current.document.emailBody,
      source: DocumentVersionSource.AI_REWRITE,
      operation: params.operation || 'REWRITE_SELECTION',
    });

    const dossier = await db.dossier.update({
      where: { id: params.dossierId },
      data: { status: current.status === DossierStatus.DRAFT ? DossierStatus.IN_PROGRESS : current.status },
      include: { document: true },
    });

    return toView(dossier);
  }

  async function remove(userId: string, dossierId: string): Promise<void> {
    const current = await loadOwned(userId, dossierId);
    if (current.document) {
      await db.documentVersion.deleteMany({ where: { documentId: current.document.id } });
    }
    await db.document.deleteMany({ where: { dossierId } });
    await db.letterGeneration.updateMany({ where: { dossierId }, data: { dossierId: null } });
    await db.aiUsage.updateMany({ where: { dossierId }, data: { dossierId: null } });
    await db.dossier.delete({ where: { id: dossierId } });
  }

  return {
    create,
    list,
    get,
    update,
    duplicate,
    applyGeneratedDocument,
    applySelectionRewrite,
    remove,
  };
}

export const dossierService = createDossierService();
