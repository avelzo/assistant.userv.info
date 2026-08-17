import { NextResponse } from 'next/server';

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '');
}

export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.APP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const extras = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.BETTER_AUTH_URL,
    process.env.NEXTAUTH_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeOrigin);

  return [...new Set([...fromEnv, ...extras])];
}

function originFromReferer(referer: string | null): string | null {
  if (!referer) {
    return null;
  }
  try {
    return normalizeOrigin(new URL(referer).origin);
  } catch {
    return null;
  }
}

/**
 * CSRF / Origin :
 * - Origin présent → doit être dans la liste.
 * - Origin absent (GET fetch same-origin, Safari, etc.) → accepter seulement
 *   Sec-Fetch-Site: same-origin, ou un Referer dont l’origine est autorisée.
 * Ne jamais accepter une origine inconnue.
 */
export function isAllowedOrigin(request: Request): boolean {
  const allowed = getAllowedOrigins();
  const origin = request.headers.get('origin');
  if (origin) {
    return allowed.includes(normalizeOrigin(origin));
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (fetchSite === 'same-origin') {
    return true;
  }

  const refererOrigin = originFromReferer(request.headers.get('referer'));
  if (refererOrigin) {
    return allowed.includes(refererOrigin);
  }

  return false;
}

export function rejectIfDisallowedOrigin(request: Request): NextResponse | null {
  if (isAllowedOrigin(request)) {
    return null;
  }

  return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
}
