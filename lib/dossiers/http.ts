import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthSession } from '@/lib/session';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSecurityEvent } from '@/lib/security-event';
import { isDossierAccessError } from '@/lib/dossiers/errors';
import { InsufficientCreditsError } from '@/lib/credits/errors';
import { SelectionMismatchError } from '@/lib/dossiers/selection';

export function isMongoObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export async function requireDossierActor(request: Request, route: string) {
  const originError = rejectIfDisallowedOrigin(request);
  if (originError) {
    await recordSecurityEvent({
      kind: 'ORIGIN_REJECT',
      route,
      status: 403,
      ip: getTrustedClientIp(request),
    });
    return { ok: false as const, response: originError };
  }

  const ip = getTrustedClientIp(request);
  const ipLimit = await consumeRateLimit({
    key: `dossiers:ip:${ip}`,
    windowMs: RATE_LIMITS.dossierIp.windowMs,
    max: RATE_LIMITS.dossierIp.max,
  });
  if (!ipLimit.allowed) {
    await recordSecurityEvent({
      kind: 'RATE_LIMIT',
      route,
      status: 429,
      ip,
    });
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 }),
    };
  }

  const session = await requireAuthSession();
  const userId = session?.user?.id || '';
  const email = session?.user?.email?.trim().toLowerCase() || '';
  if (!userId || !email) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Connectez-vous pour gérer vos dossiers.' }, { status: 401 }),
    };
  }

  const userLimit = await consumeRateLimit({
    key: `dossiers:user:${userId}`,
    windowMs: RATE_LIMITS.dossierUser.windowMs,
    max: RATE_LIMITS.dossierUser.max,
  });
  if (!userLimit.allowed) {
    await recordSecurityEvent({
      kind: 'RATE_LIMIT',
      route,
      status: 429,
      ip,
    });
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Compte introuvable.' }, { status: 401 }),
    };
  }
  if (!user.emailVerified) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Vérifiez votre adresse e-mail pour utiliser Assistant.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, userId, email };
}

function isInsufficientCredits(error: unknown): boolean {
  return (
    error instanceof InsufficientCreditsError ||
    (Boolean(error) && typeof error === 'object' && (error as { name?: string }).name === 'InsufficientCreditsError')
  );
}

export function dossierErrorResponse(error: unknown): NextResponse {
  if (isInsufficientCredits(error)) {
    return NextResponse.json(
      { error: "Vous n'avez pas assez de crédits. Achetez-en ci-dessous." },
      { status: 402 }
    );
  }
  if (error instanceof SelectionMismatchError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (isDossierAccessError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const status =
    error && typeof error === 'object' && 'status' in error ? Number((error as { status?: unknown }).status) : NaN;
  const message = error instanceof Error ? error.message : 'Erreur inattendue.';
  if (Number.isFinite(status) && status >= 400 && status < 600) {
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
