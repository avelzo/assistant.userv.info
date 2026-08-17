import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { securityEventExpiresAt } from '@/lib/retention';

export type SecurityEventKind =
  | 'RECAPTCHA_FAIL'
  | 'HONEYPOT'
  | 'RATE_LIMIT'
  | 'ORIGIN_REJECT'
  | 'REGISTER_BLOCKED'
  | 'RAPID_SUBMIT'
  | 'VALIDATION';

function hashIp(ip: string): string {
  const pepper = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-pepper';
  return createHash('sha256').update(`${pepper}:${ip}`).digest('hex').slice(0, 32);
}

export async function recordSecurityEvent(params: {
  kind: SecurityEventKind;
  route: string;
  status: number;
  ip?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        kind: params.kind,
        ipHash: params.ip ? hashIp(params.ip) : null,
        route: params.route,
        status: params.status,
        metadata: params.metadata ?? undefined,
        expiresAt: securityEventExpiresAt(),
      },
    });
  } catch {
    // L'observabilité ne doit pas faire échouer la requête métier.
  }
}
