const DAY_MS = 24 * 60 * 60 * 1000;

function readPositiveInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

/** Dossiers : conservés tant que le compte existe (v1). */
export function aiUsageRetentionDays(): number {
  return readPositiveInt('RETENTION_AI_USAGE_DAYS', 730);
}

export function securityEventRetentionDays(): number {
  return readPositiveInt('RETENTION_SECURITY_EVENT_DAYS', 90);
}

export function securityEventExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + securityEventRetentionDays() * DAY_MS);
}

export function rateLimitExpiresAt(windowMs: number, from = new Date()): Date {
  return new Date(from.getTime() + windowMs + DAY_MS);
}
