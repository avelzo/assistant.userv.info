import { NextResponse } from 'next/server';
import { GenerationBillingType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { dossierService } from '@/lib/dossiers';
import { dossierErrorResponse, isMongoObjectId, requireDossierActor } from '@/lib/dossiers/http';
import { loadSenderProfile } from '@/lib/dossiers/sender-profile';
import { runCreditedJson } from '@/lib/ai/run-credited';
import { generateDossierLetter } from '@/lib/ai/generate-dossier-letter';
import { getAiCreditCost } from '@/lib/credits/config';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]/generate-letter');
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
    if (!dossier.objective.trim()) {
      return NextResponse.json({ error: 'Indiquez un objectif avant de rédiger le courrier.' }, { status: 400 });
    }

    const sender = await loadSenderProfile(actor.userId);
    const credited = await runCreditedJson({
      userId: actor.userId,
      dossierId: id,
      operation: 'GENERATE_LETTER',
      idempotencyKey,
      execute: async () => {
        const result = await generateDossierLetter({
          objective: dossier.objective,
          recipientName: dossier.recipientName,
          recipientCategory: dossier.recipientCategory,
          suggestedTone: dossier.suggestedTone,
          context: dossier.context,
          advice: dossier.advice,
          questions: dossier.questions,
          sender,
        });
        return { parsed: result.payload, usage: result.usage };
      },
    });

    if (credited.replayed) {
      return NextResponse.json({
        dossier: await dossierService.get(actor.userId, id),
        creditsCharged: credited.reservation.creditsCharged,
        cost: getAiCreditCost('GENERATE_LETTER'),
        replayed: true,
      });
    }

    const updated = await dossierService.applyGeneratedDocument({
      userId: actor.userId,
      dossierId: id,
      bodyText: credited.parsed.letter,
      emailSubject: credited.parsed.emailSubject,
      emailBody: credited.parsed.emailBody,
      operation: 'GENERATE_LETTER',
    });

    try {
      await prisma.letterGeneration.create({
        data: {
          accountEmail: actor.email,
          category: dossier.recipientCategory || 'Autre',
          tone: dossier.suggestedTone || 'Standard',
          fullName: sender.fullName || null,
          recipient: dossier.recipientName || null,
          subject: credited.parsed.emailSubject || dossier.objective.slice(0, 120),
          details: dossier.objective,
          letter: credited.parsed.letter,
          emailVersion: credited.parsed.emailBody,
          billingType:
            credited.reservation.paidCharged > 0 ? GenerationBillingType.CREDIT : GenerationBillingType.FREE,
          creditsSpent: credited.reservation.creditsCharged,
          dossierId: id,
        },
      });
    } catch {
      // Le document est déjà persisté.
    }

    return NextResponse.json({
      dossier: updated,
      creditsCharged: credited.reservation.creditsCharged,
      cost: getAiCreditCost('GENERATE_LETTER'),
    });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
