import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { assertRecaptcha } from '@/lib/recaptcha';
import { recordSecurityEvent } from '@/lib/security-event';

const GENERIC_MESSAGE = 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.';

export async function POST(req: NextRequest) {
  const originError = rejectIfDisallowedOrigin(req);
  if (originError) {
    await recordSecurityEvent({
      kind: 'ORIGIN_REJECT',
      route: '/api/auth/forgot-password',
      status: 403,
      ip: getTrustedClientIp(req),
    });
    return originError;
  }

  const ip = getTrustedClientIp(req);
  const ipLimit = await consumeRateLimit({
    key: `forgot:ip:${ip}`,
    windowMs: RATE_LIMITS.forgotIp.windowMs,
    max: RATE_LIMITS.forgotIp.max,
  });

  if (!ipLimit.allowed) {
    await recordSecurityEvent({
      kind: 'RATE_LIMIT',
      route: '/api/auth/forgot-password',
      status: 429,
      ip,
    });
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || '')
    .toLowerCase()
    .trim();
  const recaptchaToken = String(body?.recaptchaToken || '').trim();

  const recaptcha = await assertRecaptcha({
    token: recaptchaToken,
    expectedAction: 'forgot_password',
  });
  if (!recaptcha.ok) {
    await recordSecurityEvent({
      kind: 'RECAPTCHA_FAIL',
      route: '/api/auth/forgot-password',
      status: 400,
      ip,
      metadata: { reason: recaptcha.reason },
    });
    return NextResponse.json({ error: 'Vérification anti-robot impossible.' }, { status: 400 });
  }

  if (!email || email.length > 254 || !email.includes('@')) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: '/auth/reset-password',
      },
    });
  } catch {
    // Réponse identique pour ne pas révéler l'état du compte.
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
