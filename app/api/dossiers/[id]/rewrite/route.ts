import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dossierService } from '@/lib/dossiers';
import { dossierErrorResponse, isMongoObjectId, requireDossierActor } from '@/lib/dossiers/http';
import { REWRITE_ACTIONS } from '@/lib/dossiers/categories';
import { runCreditedJson } from '@/lib/ai/run-credited';
import { rewriteSelection } from '@/lib/ai/rewrite-selection';
import { getAiCreditCost } from '@/lib/credits/config';
import { normalizeDocumentBlocks } from '@/lib/dossiers/document-blocks';

const bodySchema = z.object({
  documentId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  blockId: z.string().trim().min(1).max(80),
  selectedText: z.string().min(1).max(8000),
  start: z.number().int().min(0),
  end: z.number().int().positive(),
  action: z.enum(REWRITE_ACTIONS),
  instruction: z.string().trim().max(500).optional().default(''),
  revision: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]/rewrite');
  if (!actor.ok) {
    return actor.response;
  }

  const { id } = await context.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête de reformulation invalide.' }, { status: 400 });
  }

  const payload = parsed.data;
  if (payload.end <= payload.start) {
    return NextResponse.json({ error: 'Sélection invalide.' }, { status: 400 });
  }
  if (payload.action === 'custom' && !payload.instruction.trim()) {
    return NextResponse.json({ error: 'Indiquez une consigne courte.' }, { status: 400 });
  }

  const idempotencyKey =
    request.headers.get('idempotency-key')?.trim() || payload.idempotencyKey?.trim() || '';
  if (idempotencyKey.length < 8 || idempotencyKey.length > 120) {
    return NextResponse.json({ error: 'Clé d’idempotence invalide.' }, { status: 400 });
  }

  try {
    const dossier = await dossierService.get(actor.userId, id);
    if (!dossier.document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }
    if (dossier.document.id !== payload.documentId) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }
    if (dossier.document.revision !== payload.revision) {
      return NextResponse.json(
        { error: 'Le document a été modifié. Actualisez puis réessayez.' },
        { status: 409 }
      );
    }

    const block = normalizeDocumentBlocks(dossier.document.bodyBlocks).find((entry) => entry.id === payload.blockId);
    if (!block) {
      return NextResponse.json({ error: 'Bloc introuvable.' }, { status: 400 });
    }
    if (block.text.slice(payload.start, payload.end) !== payload.selectedText) {
      return NextResponse.json({ error: 'La sélection ne correspond plus au document.' }, { status: 409 });
    }

    const credited = await runCreditedJson({
      userId: actor.userId,
      dossierId: id,
      operation: 'REWRITE_SELECTION',
      idempotencyKey,
      execute: async () => {
        const result = await rewriteSelection({
          selectedText: payload.selectedText,
          action: payload.action,
          instruction: payload.instruction,
          blockText: block.text,
        });
        return { parsed: result.payload, usage: result.usage };
      },
    });

    if (credited.replayed) {
      return NextResponse.json({
        dossier: await dossierService.get(actor.userId, id),
        creditsCharged: credited.reservation.creditsCharged,
        cost: getAiCreditCost('REWRITE_SELECTION'),
        replayed: true,
      });
    }

    const updated = await dossierService.applySelectionRewrite({
      userId: actor.userId,
      dossierId: id,
      documentId: payload.documentId,
      blockId: payload.blockId,
      start: payload.start,
      end: payload.end,
      selectedText: payload.selectedText,
      replacement: credited.parsed.replacement,
      expectedRevision: payload.revision,
      operation: `REWRITE_SELECTION:${payload.action}`,
    });

    return NextResponse.json({
      dossier: updated,
      replacement: credited.parsed.replacement,
      creditsCharged: credited.reservation.creditsCharged,
      cost: getAiCreditCost('REWRITE_SELECTION'),
    });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
