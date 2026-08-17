import { NextResponse } from 'next/server';
import { DocumentVersionSource } from '@prisma/client';
import { z } from 'zod';
import { dossierService } from '@/lib/dossiers';
import { blocksToText } from '@/lib/dossiers/document-blocks';
import { dossierErrorResponse, isMongoObjectId, requireDossierActor } from '@/lib/dossiers/http';
import { runCreditedJson } from '@/lib/ai/run-credited';
import { reviseDocument } from '@/lib/ai/revise-document';
import { getAiCreditCost } from '@/lib/credits/config';

const bodySchema = z.object({
  instruction: z.string().trim().min(1).max(500),
  revision: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]/revise');
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
    return NextResponse.json({ error: 'Requête de révision invalide.' }, { status: 400 });
  }

  const idempotencyKey =
    request.headers.get('idempotency-key')?.trim() || parsed.data.idempotencyKey?.trim() || '';
  if (idempotencyKey.length < 8 || idempotencyKey.length > 120) {
    return NextResponse.json({ error: 'Clé d’idempotence invalide.' }, { status: 400 });
  }

  try {
    const dossier = await dossierService.get(actor.userId, id);
    if (!dossier.document || !dossier.document.bodyBlocks.some((block) => block.text.trim())) {
      return NextResponse.json({ error: 'Aucun courrier à réviser.' }, { status: 400 });
    }
    if (dossier.document.revision !== parsed.data.revision) {
      return NextResponse.json(
        { error: 'Le document a été modifié. Actualisez puis réessayez.' },
        { status: 409 }
      );
    }

    const letter = blocksToText(dossier.document.bodyBlocks);
    const credited = await runCreditedJson({
      userId: actor.userId,
      dossierId: id,
      operation: 'REVISE_DOCUMENT',
      idempotencyKey,
      execute: async () => {
        const result = await reviseDocument({
          letter,
          emailSubject: dossier.document?.emailSubject || '',
          emailBody: dossier.document?.emailBody || '',
          instruction: parsed.data.instruction,
        });
        return { parsed: result.payload, usage: result.usage };
      },
    });

    if (credited.replayed) {
      return NextResponse.json({
        dossier: await dossierService.get(actor.userId, id),
        creditsCharged: credited.reservation.creditsCharged,
        cost: getAiCreditCost('REVISE_DOCUMENT'),
        replayed: true,
      });
    }

    const updated = await dossierService.applyGeneratedDocument({
      userId: actor.userId,
      dossierId: id,
      bodyText: credited.parsed.letter,
      emailSubject: credited.parsed.emailSubject ?? dossier.document.emailSubject,
      emailBody: credited.parsed.emailBody ?? dossier.document.emailBody,
      source: DocumentVersionSource.AI_REVISION,
      operation: 'REVISE_DOCUMENT',
    });

    return NextResponse.json({
      dossier: updated,
      creditsCharged: credited.reservation.creditsCharged,
      cost: getAiCreditCost('REVISE_DOCUMENT'),
    });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
