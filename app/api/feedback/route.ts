import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthSession } from '@/lib/session';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSecurityEvent } from '@/lib/security-event';
import { isDossierAccessError } from '@/lib/dossiers/errors';
import { feedbackService } from '@/lib/feedback/feedback-service';

export async function POST(request: Request) {
  const originError = rejectIfDisallowedOrigin(request);
  if (originError) {
    await recordSecurityEvent({
      kind: 'ORIGIN_REJECT',
      route: '/api/feedback',
      status: 403,
      ip: getTrustedClientIp(request),
    });
    return originError;
  }

  const ip = getTrustedClientIp(request);
  const ipLimit = await consumeRateLimit({
    key: `feedback:ip:${ip}`,
    windowMs: RATE_LIMITS.feedbackIp.windowMs,
    max: RATE_LIMITS.feedbackIp.max,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 });
  }

  const session = await requireAuthSession();
  const userId = session?.user?.id || '';
  if (!userId) {
    return NextResponse.json({ error: 'Connectez-vous pour envoyer un retour.' }, { status: 401 });
  }

  const userLimit = await consumeRateLimit({
    key: `feedback:user:${userId}`,
    windowMs: RATE_LIMITS.feedbackUser.windowMs,
    max: RATE_LIMITS.feedbackUser.max,
  });
  if (!userLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return NextResponse.json(
      { error: 'Vérifiez votre adresse e-mail pour envoyer un retour.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const feedback = await feedbackService.create(userId, body || {});
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    if (isDossierAccessError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Envoi impossible.' }, { status: 500 });
  }
}
