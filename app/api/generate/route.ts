import { NextResponse } from 'next/server';
import { GenerationBillingType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuthSession } from '@/lib/session';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSecurityEvent } from '@/lib/security-event';
import { creditService, InsufficientCreditsError } from '@/lib/credits';
import { generateLetterContent } from '@/lib/ai/generate-letter';
import { dossierService } from '@/lib/dossiers';
import { isDossierAccessError } from '@/lib/dossiers/errors';
import { isMongoObjectId } from '@/lib/dossiers/http';

type GenerateRequestBody = {
  category?: string;
  tone?: string;
  fullName?: string;
  recipient?: string;
  subject?: string;
  details?: string;
  attachments?: string;
  idempotencyKey?: string;
  dossierId?: string;
};

export async function POST(request: Request) {
  let reservationId: string | null = null;
  let providerSucceeded = false;

  try {
    const originError = rejectIfDisallowedOrigin(request);
    if (originError) {
      await recordSecurityEvent({
        kind: 'ORIGIN_REJECT',
        route: '/api/generate',
        status: 403,
        ip: getTrustedClientIp(request),
      });
      return originError;
    }

    const ip = getTrustedClientIp(request);
    const ipLimit = await consumeRateLimit({
      key: `generate:ip:${ip}`,
      windowMs: RATE_LIMITS.generateIp.windowMs,
      max: RATE_LIMITS.generateIp.max,
    });

    if (!ipLimit.allowed) {
      await recordSecurityEvent({
        kind: 'RATE_LIMIT',
        route: '/api/generate',
        status: 429,
        ip,
      });
      return NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 });
    }

    const session = await requireAuthSession();
    const email = session?.user?.email?.trim().toLowerCase() || '';
    const userId = session?.user?.id || '';

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Connectez-vous pour générer un courrier.' },
        { status: 401 }
      );
    }

    const userLimit = await consumeRateLimit({
      key: `generate:user:${userId}`,
      windowMs: RATE_LIMITS.generateUser.windowMs,
      max: RATE_LIMITS.generateUser.max,
    });

    if (!userLimit.allowed) {
      await recordSecurityEvent({
        kind: 'RATE_LIMIT',
        route: '/api/generate',
        status: 429,
        ip,
      });
      return NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 });
    }

    let body: GenerateRequestBody;
    try {
      body = (await request.json()) as GenerateRequestBody;
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const details = body.details?.trim() || '';
    if (!details || details.length > 3000) {
      return NextResponse.json({ error: 'Description invalide.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Compte introuvable.' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Vérifiez votre adresse e-mail pour utiliser Assistant.' },
        { status: 403 }
      );
    }

    const idempotencyKey =
      request.headers.get('idempotency-key')?.trim() ||
      body.idempotencyKey?.trim() ||
      `generate:${userId}:${Date.now()}`;

    const dossierId = body.dossierId?.trim() || '';
    if (dossierId) {
      if (!isMongoObjectId(dossierId)) {
        return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
      }
      try {
        await dossierService.get(userId, dossierId);
      } catch (error) {
        if (isDossierAccessError(error)) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
      }
    }

    const reservation = await creditService.reserve({
      userId,
      operation: 'GENERATE_LETTER',
      provider: process.env.MOCK_AI === 'true' ? 'mock' : 'openai',
      model: process.env.MOCK_AI === 'true' ? 'mock-ai' : process.env.OPENAI_MODEL || 'gpt-4o-mini',
      idempotencyKey,
      dossierId: dossierId || null,
    });
    reservationId = reservation.usageId;

    let generated;
    try {
      generated = await generateLetterContent({
        category: body.category || 'Autre',
        tone: body.tone || 'Standard',
        fullName: body.fullName || 'Non précisé',
        recipient: body.recipient || 'Non précisé',
        subject: body.subject || 'Non précisé',
        details,
        attachments: body.attachments || 'Aucune',
      });
      providerSucceeded = true;
    } catch (error) {
      await creditService.rollback({
        usageId: reservation.usageId,
        reason: 'provider_error',
      });
      const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 502;
      const message = error instanceof Error ? error.message : 'Erreur de génération. Réessayez plus tard.';
      return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : 502 });
    }

    if (!reservation.alreadySettled) {
      try {
        await creditService.settle({
          usageId: reservation.usageId,
          inputTokens: generated.inputTokens,
          outputTokens: generated.outputTokens,
          estimatedCost: generated.estimatedCost,
          model: generated.model,
        });
      } catch {
        // Usage reste RESERVED : un retry avec la même clé pourra solder sans re-débiter.
      }
    }

    const billingType =
      reservation.paidCharged > 0 ? GenerationBillingType.CREDIT : GenerationBillingType.FREE;

    try {
      await prisma.letterGeneration.create({
        data: {
          accountEmail: email,
          category: body.category || 'Autre',
          tone: body.tone || 'Standard',
          fullName: body.fullName || null,
          recipient: body.recipient || null,
          subject: body.subject || null,
          details,
          attachments: body.attachments || null,
          letter: generated.letter,
          emailVersion: generated.emailVersion,
          billingType,
          creditsSpent: reservation.creditsCharged,
          ...(dossierId ? { dossierId } : {}),
        },
      });
    } catch {
      // Les crédits et AIUsage sont déjà soldés ; on renvoie tout de même le résultat au client.
    }

    if (dossierId) {
      try {
        await dossierService.update(userId, dossierId, {
          document: {
            bodyText: generated.letter,
            emailSubject: body.subject || '',
            emailBody: generated.emailVersion,
          },
        });
      } catch {
        // Le courrier est déjà renvoyé au client ; le document pourra être resynchronisé plus tard.
      }
    }

    const balance = await creditService.getBalance(userId);

    return NextResponse.json(
      {
        letter: generated.letter,
        emailVersion: generated.emailVersion,
        billingType,
        remainingCredits: balance.totalCredits,
        freeCredits: balance.freeCredits,
        paidCredits: balance.paidCredits,
        creditsCharged: reservation.creditsCharged,
        dossierId: dossierId || null,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Vous n'avez pas assez de crédits. Achetez-en ci-dessous." },
        { status: 402 }
      );
    }

    if (reservationId && !providerSucceeded) {
      try {
        await creditService.rollback({ usageId: reservationId, reason: 'unhandled_error' });
      } catch {
        // Déjà soldé ou rollback déjà effectué.
      }
    }

    return NextResponse.json({ error: 'Erreur génération' }, { status: 500 });
  }
}
