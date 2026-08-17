import { DossierStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createDossierService } from '@/lib/dossiers/dossier-service';
import { DossierAccessError } from '@/lib/dossiers/errors';
import { blocksToText } from '@/lib/dossiers/document-blocks';

type DossierRow = {
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
  questions: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type DocumentRow = {
  id: string;
  dossierId: string;
  bodyFormat: string;
  bodyBlocks: unknown;
  emailSubject: string;
  emailBody: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

function createMemoryDb() {
  const dossiers = new Map<string, DossierRow>();
  const documents = new Map<string, DocumentRow>();
  const versions: Array<Record<string, unknown>> = [];
  let seq = 1;

  const prisma = {
    dossier: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: { document?: boolean } }) => {
        const row = dossiers.get(where.id);
        if (!row) {
          return null;
        }
        return include?.document ? { ...row, document: documents.get(row.id) ?? null } : row;
      },
      findMany: async ({ where }: { where: { userId: string } }) =>
        [...dossiers.values()]
          .filter((row) => row.userId === where.userId)
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
          .map((row) => ({ ...row, document: documents.get(row.id) ?? null })),
      create: async ({
        data,
        include,
      }: {
        data: Record<string, unknown> & { document?: { create: Record<string, unknown> } };
        include?: { document?: boolean };
      }) => {
        const now = new Date();
        const row: DossierRow = {
          id: `d${seq++}`,
          userId: String(data.userId),
          title: String(data.title || ''),
          objective: String(data.objective || ''),
          recipientName: String(data.recipientName || ''),
          recipientCategory: String(data.recipientCategory || ''),
          suggestedTone: String(data.suggestedTone || ''),
          context: String(data.context || ''),
          status: (data.status as DossierStatus) || DossierStatus.DRAFT,
          advice: String(data.advice || ''),
          questions: data.questions ?? [],
          createdAt: now,
          updatedAt: now,
        };
        dossiers.set(row.id, row);
        if (data.document?.create) {
          const created = data.document.create;
          documents.set(row.id, {
            id: `doc${seq++}`,
            dossierId: row.id,
            bodyFormat: String(created.bodyFormat || 'blocks-v1'),
            bodyBlocks: created.bodyBlocks ?? [],
            emailSubject: String(created.emailSubject || ''),
            emailBody: String(created.emailBody || ''),
            revision: Number(created.revision || 1),
            createdAt: now,
            updatedAt: now,
          });
        }
        return include?.document ? { ...row, document: documents.get(row.id) ?? null } : row;
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Record<string, unknown> & {
          document?: {
            upsert: {
              create: Record<string, unknown>;
              update: Record<string, unknown>;
            };
          };
        };
        include?: { document?: boolean };
      }) => {
        const row = dossiers.get(where.id);
        if (!row) {
          throw new Error('missing');
        }
        for (const key of [
          'title',
          'objective',
          'recipientName',
          'recipientCategory',
          'suggestedTone',
          'context',
          'status',
          'advice',
          'questions',
        ] as const) {
          if (data[key] !== undefined) {
            (row as Record<string, unknown>)[key] = data[key];
          }
        }
        row.updatedAt = new Date();
        if (data.document?.upsert) {
          const current = documents.get(where.id);
          if (!current) {
            const created = data.document.upsert.create;
            documents.set(where.id, {
              id: `doc${seq++}`,
              dossierId: where.id,
              bodyFormat: String(created.bodyFormat || 'blocks-v1'),
              bodyBlocks: created.bodyBlocks ?? [],
              emailSubject: String(created.emailSubject || ''),
              emailBody: String(created.emailBody || ''),
              revision: Number(created.revision || 1),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            const update = data.document.upsert.update;
            if (update.bodyBlocks !== undefined) current.bodyBlocks = update.bodyBlocks;
            if (update.emailSubject !== undefined) current.emailSubject = String(update.emailSubject);
            if (update.emailBody !== undefined) current.emailBody = String(update.emailBody);
            if (typeof update.revision === 'number') {
              current.revision = update.revision;
            } else if (update.revision && typeof update.revision === 'object' && 'increment' in update.revision) {
              current.revision += Number((update.revision as { increment: number }).increment);
            }
            current.updatedAt = new Date();
          }
        }
        return include?.document ? { ...row, document: documents.get(row.id) ?? null } : row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const row = dossiers.get(where.id);
        dossiers.delete(where.id);
        return row;
      },
    },
    document: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        [...documents.values()].find((row) => row.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const current = [...documents.values()].find((row) => row.id === where.id);
        if (!current) {
          throw new Error('missing document');
        }
        if (data.bodyBlocks !== undefined) current.bodyBlocks = data.bodyBlocks;
        if (typeof data.revision === 'number') current.revision = data.revision;
        current.updatedAt = new Date();
        return current;
      },
      deleteMany: async ({ where }: { where: { dossierId: string } }) => {
        documents.delete(where.dossierId);
        return { count: 1 };
      },
    },
    documentVersion: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ver${seq++}`, ...data };
        versions.push(row);
        return row;
      },
      deleteMany: async ({ where }: { where: { documentId: string } }) => {
        const count = versions.filter((row) => row.documentId === where.documentId).length;
        for (let index = versions.length - 1; index >= 0; index -= 1) {
          if (versions[index]?.documentId === where.documentId) {
            versions.splice(index, 1);
          }
        }
        return { count };
      },
    },
    letterGeneration: {
      updateMany: async () => ({ count: 0 }),
    },
    aiUsage: {
      updateMany: async () => ({ count: 0 }),
    },
  };

  return { prisma, dossiers, documents, versions };
}

describe('DossierService', () => {
  it('crée un dossier minimal avec seulement un objectif', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const dossier = await service.create('user-1', {
      objective: 'Récupérer mon dépôt de garantie.',
    });

    expect(dossier.objective).toBe('Récupérer mon dépôt de garantie.');
    expect(dossier.title).toMatch(/dépôt de garantie/i);
    expect(dossier.status).toBe(DossierStatus.DRAFT);
    expect(dossier.recipientName).toBe('');
    expect(dossier.questions).toEqual([]);
    expect(dossier.document?.bodyBlocks).toEqual([]);
  });

  it('autorise un dossier incomplet puis le complète', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const created = await service.create('user-1', { objective: 'Contester une facture.' });
    const updated = await service.update('user-1', created.id, {
      recipientName: 'Orange',
      recipientCategory: 'Télécom',
      context: 'Facture de 120 € en trop.',
      status: 'IN_PROGRESS',
    });

    expect(updated.recipientName).toBe('Orange');
    expect(updated.status).toBe(DossierStatus.IN_PROGRESS);
  });

  it('crée un dossier complet avec document et e-mail', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const dossier = await service.create('user-1', {
      title: 'Dépôt de garantie',
      objective: 'Récupérer 850 €.',
      recipientName: 'SCI Martin',
      recipientCategory: 'Logement',
      context: 'Bail terminé le 30 juin.',
      document: {
        bodyText: 'Madame, Monsieur,\n\nJe vous demande la restitution du dépôt.',
        emailSubject: 'Restitution du dépôt de garantie',
        emailBody: 'Bonjour, je vous demande la restitution du dépôt.',
      },
    });

    expect(dossier.document?.emailSubject).toBe('Restitution du dépôt de garantie');
    expect(dossier.document?.emailBody).toMatch(/restitution/i);
    expect(blocksToText(dossier.document?.bodyBlocks || [])).toMatch(/Madame, Monsieur/);
  });

  it('persiste plusieurs questions/réponses', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const dossier = await service.create('user-1', {
      objective: 'Récupérer 850 €.',
      questions: [
        { prompt: 'À quelle date avez-vous remis les clés ?', answer: 'Le 30 juin 2026.' },
        { prompt: 'Avez-vous déjà demandé le remboursement ?', answer: 'Oui, par SMS.' },
      ],
    });

    expect(dossier.questions).toHaveLength(2);
    expect(dossier.questions[0]?.prompt).toMatch(/clés/);
    expect(dossier.questions[1]?.answer).toMatch(/SMS/);
  });

  it('liste uniquement les dossiers de l’utilisateur connecté', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    await service.create('user-1', { objective: 'Dossier A' });
    await service.create('user-2', { objective: 'Dossier B' });

    const list = await service.list('user-1');
    expect(list).toHaveLength(1);
    expect(list[0]?.objective).toBe('Dossier A');
  });

  it('refuse lecture, modification et suppression d’un dossier d’un autre utilisateur', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const dossier = await service.create('user-1', { objective: 'Privé' });

    await expect(service.get('user-2', dossier.id)).rejects.toMatchObject({ status: 403 });
    await expect(service.update('user-2', dossier.id, { title: 'Hack' })).rejects.toBeInstanceOf(
      DossierAccessError
    );
    await expect(service.remove('user-2', dossier.id)).rejects.toMatchObject({ status: 403 });

    const stillThere = await service.get('user-1', dossier.id);
    expect(stillThere.objective).toBe('Privé');
  });

  it('récupère et supprime un dossier possédé', async () => {
    const { prisma, dossiers } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const dossier = await service.create('user-1', { objective: 'À supprimer' });
    const fetched = await service.get('user-1', dossier.id);
    expect(fetched.id).toBe(dossier.id);

    await service.remove('user-1', dossier.id);
    expect(dossiers.size).toBe(0);
    await expect(service.get('user-1', dossier.id)).rejects.toMatchObject({ status: 404 });
  });

  it('incrémente la révision sur une édition manuelle sans créer de version', async () => {
    const { prisma, versions } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const created = await service.create('user-1', {
      objective: 'Récupérer 850 €.',
      document: { bodyText: 'Je vous demande la restitution du dépôt.' },
    });
    const updated = await service.update('user-1', created.id, {
      document: {
        bodyBlocks: [{ id: created.document?.bodyBlocks[0]?.id, type: 'paragraph', text: 'Texte modifié.' }],
        expectedRevision: created.document?.revision,
      },
    });
    expect(updated.document?.revision).toBe((created.document?.revision || 1) + 1);
    expect(updated.document?.bodyBlocks[0]?.text).toBe('Texte modifié.');
    expect(versions).toHaveLength(0);
  });

  it('refuse une révision obsolète', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const created = await service.create('user-1', {
      objective: 'Récupérer 850 €.',
      document: { bodyText: 'Je vous demande la restitution.' },
    });
    await expect(
      service.update('user-1', created.id, {
        document: {
          bodyText: 'Autre texte',
          expectedRevision: 99,
        },
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('applique une génération avec blocks-v1, e-mail et DocumentVersion', async () => {
    const { prisma, versions } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const created = await service.create('user-1', { objective: 'Récupérer 850 € de dépôt.' });
    const generated = await service.applyGeneratedDocument({
      userId: 'user-1',
      dossierId: created.id,
      bodyText: 'Madame, Monsieur,\n\nJe vous demande la restitution du dépôt.\n\nCordialement.',
      emailSubject: 'Restitution du dépôt',
      emailBody: 'Bonjour, merci de me restituer le dépôt.',
      operation: 'GENERATE_LETTER',
    });
    expect(generated.document?.bodyBlocks.length).toBeGreaterThan(1);
    expect(generated.document?.emailSubject).toBe('Restitution du dépôt');
    expect(generated.status).toBe(DossierStatus.READY);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.source).toBe('AI_GENERATION');
  });

  it('remplace uniquement la sélection et refuse un mauvais dossier', async () => {
    const { prisma, versions } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const created = await service.create('user-1', {
      objective: 'Récupérer 850 €.',
      document: { bodyText: 'Je vous demande de bien vouloir me rendre ma caution.' },
    });
    const block = created.document?.bodyBlocks[0];
    const rewritten = await service.applySelectionRewrite({
      userId: 'user-1',
      dossierId: created.id,
      documentId: created.document!.id,
      blockId: block!.id,
      start: 'Je vous demande de '.length,
      end: 'Je vous demande de bien vouloir'.length,
      selectedText: 'bien vouloir',
      replacement: 'procéder à',
      expectedRevision: created.document!.revision,
    });
    expect(rewritten.document?.bodyBlocks[0]?.text).toBe('Je vous demande de procéder à me rendre ma caution.');
    expect(rewritten.document?.revision).toBe(created.document!.revision + 1);
    expect(versions).toHaveLength(1);

    await expect(
      service.applySelectionRewrite({
        userId: 'user-2',
        dossierId: created.id,
        documentId: created.document!.id,
        blockId: block!.id,
        start: 0,
        end: 2,
        selectedText: 'Je',
        replacement: 'Nous',
        expectedRevision: rewritten.document!.revision,
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('duplique un dossier possédé sans hériter d’un identifiant legacy', async () => {
    const { prisma } = createMemoryDb();
    const service = createDossierService({ prisma: prisma as never });
    const created = await service.create('user-1', {
      title: 'Dépôt de garantie',
      objective: 'Récupérer 850 €.',
      recipientName: 'SCI Martin',
      context: 'Bail terminé.',
      questions: [{ prompt: 'Date de remise des clés ?', answer: '30 juin.' }],
      document: { bodyText: 'Madame, Monsieur, je vous demande la restitution.' },
    });

    const copy = await service.duplicate('user-1', created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.title).toMatch(/^Copie —/);
    expect(copy.objective).toBe(created.objective);
    expect(copy.recipientName).toBe('SCI Martin');
    expect(copy.questions).toHaveLength(1);
    expect(copy.document?.bodyBlocks[0]?.id).toMatch(/-copy$/);
    expect(copy.document?.bodyBlocks[0]?.text).toMatch(/restitution/);
    await expect(service.duplicate('user-2', created.id)).rejects.toMatchObject({ status: 403 });
  });
});