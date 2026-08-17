import { NextResponse } from 'next/server';
import { DossierStatus } from '@prisma/client';
import { dossierService } from '@/lib/dossiers';
import { dossierErrorResponse, isMongoObjectId, requireDossierActor } from '@/lib/dossiers/http';
import { mergeQuestionPrompts } from '@/lib/dossiers/questions';
import { loadSenderProfile } from '@/lib/dossiers/sender-profile';
import { runCreditedJson } from '@/lib/ai/run-credited';
import { analyzeSituation } from '@/lib/ai/analyze-situation';
import { getAiCreditCost } from '@/lib/credits/config';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]/analyze');
  if (!actor.ok) {
    return actor.response;
  }

  const { id } = await context.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
  }

  let body: { idempotencyKey?: string } = {};
  try {
    body = (await request.json()) as { idempotencyKey?: string };
  } catch {
    body = {};
  }

  const idempotencyKey =
    request.headers.get('idempotency-key')?.trim() || body.idempotencyKey?.trim() || '';
  if (idempotencyKey.length < 8 || idempotencyKey.length > 120) {
    return NextResponse.json({ error: 'Clé d’idempotence invalide.' }, { status: 400 });
  }

  try {
    const dossier = await dossierService.get(actor.userId, id);
    const sender = await loadSenderProfile(actor.userId);

    const credited = await runCreditedJson({
      userId: actor.userId,
      dossierId: id,
      operation: 'ANALYZE_SITUATION',
      idempotencyKey,
      execute: async () => {
        const result = await analyzeSituation({
          objective: dossier.objective,
          recipientName: dossier.recipientName,
          recipientCategory: dossier.recipientCategory,
          context: dossier.context,
          questions: dossier.questions,
          sender: { fullName: sender.fullName, city: sender.city },
          hasDocument: Boolean(dossier.document),
        });
        return { parsed: result.payload, usage: result.usage };
      },
    });

    if (credited.replayed) {
      return NextResponse.json({
        dossier: await dossierService.get(actor.userId, id),
        creditsCharged: credited.reservation.creditsCharged,
        cost: getAiCreditCost('ANALYZE_SITUATION'),
        replayed: true,
      });
    }

    const updated = await dossierService.update(actor.userId, id, {
      recipientCategory: credited.parsed.recipientCategory || dossier.recipientCategory,
      suggestedTone: credited.parsed.suggestedTone || dossier.suggestedTone,
      advice: credited.parsed.advice,
      questions: mergeQuestionPrompts(
        dossier.questions,
        credited.parsed.questions.map((question) => question.prompt)
      ),
      status: dossier.status === DossierStatus.DRAFT ? DossierStatus.IN_PROGRESS : dossier.status,
    });

    return NextResponse.json({
      dossier: updated,
      analysis: credited.parsed,
      creditsCharged: credited.reservation.creditsCharged,
      cost: getAiCreditCost('ANALYZE_SITUATION'),
    });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
