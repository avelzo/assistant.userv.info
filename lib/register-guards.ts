import { NextResponse } from 'next/server';
import { getTrustedClientIp } from '@/lib/ip';
import { isAllowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { assertRecaptcha } from '@/lib/recaptcha';
import { recordSecurityEvent } from '@/lib/security-event';
import { REGISTER_MIN_SUBMIT_MS, registerSchema, type RegisterInput } from '@/lib/register-schema';

export const GENERIC_REGISTER_ERROR =
  'Impossible de créer le compte. Vérifiez les informations saisies ou connectez-vous si vous avez déjà un compte.';
export const GENERIC_REGISTER_SUCCESS =
  'Si cette adresse n’est pas déjà utilisée, le compte a été créé. Vérifiez votre e-mail pour l’activer.';

export function displayName(firstname?: string | null, lastname?: string | null, email?: string): string {
  const name = [firstname, lastname].filter(Boolean).join(' ').trim();
  return name || email?.split('@')[0] || 'Utilisateur';
}

export async function assertRegisterGuards(params: {
  request: Request;
  body: unknown;
}): Promise<{ ok: true; data: RegisterInput } | { ok: false; response: NextResponse }> {
  const ip = getTrustedClientIp(params.request);

  if (!isAllowedOrigin(params.request)) {
    await recordSecurityEvent({
      kind: 'ORIGIN_REJECT',
      route: '/api/auth/register',
      status: 403,
      ip,
    });
    return { ok: false, response: NextResponse.json({ error: 'Requête refusée.' }, { status: 403 }) };
  }

  const ipLimit = await consumeRateLimit({
    key: `register:ip:${ip}`,
    windowMs: RATE_LIMITS.registerIp.windowMs,
    max: RATE_LIMITS.registerIp.max,
  });

  if (!ipLimit.allowed) {
    await recordSecurityEvent({
      kind: 'RATE_LIMIT',
      route: '/api/auth/register',
      status: 429,
      ip,
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 }),
    };
  }

  const parsed = registerSchema.safeParse(params.body);
  if (!parsed.success) {
    await recordSecurityEvent({
      kind: 'VALIDATION',
      route: '/api/auth/register',
      status: 400,
      ip,
    });
    return { ok: false, response: NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 }) };
  }

  const data = parsed.data;

  if (data.website && data.website.trim().length > 0) {
    await recordSecurityEvent({
      kind: 'HONEYPOT',
      route: '/api/auth/register',
      status: 201,
      ip,
    });
    return {
      ok: false,
      response: NextResponse.json({ message: GENERIC_REGISTER_SUCCESS }, { status: 201 }),
    };
  }

  const elapsed = Date.now() - data.formStartedAt;
  if (elapsed < REGISTER_MIN_SUBMIT_MS || elapsed > 2 * 60 * 60 * 1000) {
    await recordSecurityEvent({
      kind: 'RAPID_SUBMIT',
      route: '/api/auth/register',
      status: 400,
      ip,
    });
    return { ok: false, response: NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 }) };
  }

  const recaptcha = await assertRecaptcha({
    token: data.recaptchaToken,
    expectedAction: 'register',
  });

  if (!recaptcha.ok) {
    await recordSecurityEvent({
      kind: 'RECAPTCHA_FAIL',
      route: '/api/auth/register',
      status: 400,
      ip,
      metadata: { reason: recaptcha.reason },
    });
    return { ok: false, response: NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 }) };
  }

  const emailLimit = await consumeRateLimit({
    key: `register:email:${data.email}`,
    windowMs: RATE_LIMITS.registerEmail.windowMs,
    max: RATE_LIMITS.registerEmail.max,
  });

  if (!emailLimit.allowed) {
    await recordSecurityEvent({
      kind: 'RATE_LIMIT',
      route: '/api/auth/register',
      status: 429,
      ip,
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 }),
    };
  }

  return { ok: true, data };
}
