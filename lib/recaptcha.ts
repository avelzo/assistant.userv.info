export interface RecaptchaVerificationResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export type RecaptchaFailureReason =
  | 'missing_token'
  | 'unavailable'
  | 'invalid'
  | 'bad_action'
  | 'bad_hostname'
  | 'low_score';

export type RecaptchaCheckResult =
  | { ok: true; score: number; hostname?: string }
  | { ok: false; reason: RecaptchaFailureReason };

function minScore(): number {
  const parsed = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');
  if (!Number.isFinite(parsed)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, parsed));
}

function allowedHostnames(): string[] {
  const fromEnv = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) {
    return fromEnv;
  }

  const fromBase = process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname.toLowerCase()
    : '';

  return [...new Set(['localhost', '127.0.0.1', fromBase].filter(Boolean))];
}

export async function verifyRecaptchaToken(token: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error('RECAPTCHA_SECRET_KEY introuvable dans les variables d’environnement.');
  }

  const params = new URLSearchParams({
    secret,
    response: token,
  });

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const result = (await response.json()) as RecaptchaVerificationResponse;
  return result;
}

export async function assertRecaptcha(params: {
  token?: string;
  expectedAction: string;
}): Promise<RecaptchaCheckResult> {
  const token = params.token?.trim();
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  let verification: RecaptchaVerificationResponse;
  try {
    verification = await verifyRecaptchaToken(token);
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  if (!verification.success) {
    return { ok: false, reason: 'invalid' };
  }

  if (verification.action !== params.expectedAction) {
    return { ok: false, reason: 'bad_action' };
  }

  const hostname = verification.hostname?.toLowerCase();
  const hosts = allowedHostnames();
  if (hostname && hosts.length > 0 && !hosts.includes(hostname)) {
    return { ok: false, reason: 'bad_hostname' };
  }

  const score = verification.score ?? 0;
  if (score < minScore()) {
    return { ok: false, reason: 'low_score' };
  }

  return { ok: true, score, hostname };
}
