import { prisma } from '@/lib/prisma';
import { rateLimitExpiresAt } from '@/lib/retention';

export const RATE_LIMITS = {
  registerIp: { windowMs: 15 * 60 * 1000, max: 8 },
  registerEmail: { windowMs: 15 * 60 * 1000, max: 5 },
  forgotIp: { windowMs: 15 * 60 * 1000, max: 5 },
  contactIp: { windowMs: 15 * 60 * 1000, max: 8 },
  verifyEmailIp: { windowMs: 15 * 60 * 1000, max: 5 },
  generateIp: { windowMs: 60 * 60 * 1000, max: 10 },
  generateUser: { windowMs: 60 * 60 * 1000, max: 10 },
  claimIp: { windowMs: 15 * 60 * 1000, max: 10 },
  checkoutIp: { windowMs: 15 * 60 * 1000, max: 10 },
  dossierIp: { windowMs: 60 * 60 * 1000, max: 60 },
  dossierUser: { windowMs: 60 * 60 * 1000, max: 60 },
  feedbackIp: { windowMs: 60 * 60 * 1000, max: 20 },
  feedbackUser: { windowMs: 60 * 60 * 1000, max: 20 },
} as const;

function windowStartFor(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

export async function consumeRateLimit(params: {
  key: string;
  windowMs: number;
  max: number;
}): Promise<{ allowed: boolean; count: number }> {
  const now = Date.now();
  const windowStart = windowStartFor(now, params.windowMs);
  const expiresAt = rateLimitExpiresAt(params.windowMs, new Date(now));

  try {
    const updated = await prisma.rateLimitCounter.upsert({
      where: {
        key_windowStart: {
          key: params.key,
          windowStart,
        },
      },
      create: {
        key: params.key,
        windowStart,
        count: 1,
        expiresAt,
      },
      update: {
        count: { increment: 1 },
        expiresAt,
      },
    });

    return {
      allowed: updated.count <= params.max,
      count: updated.count,
    };
  } catch {
    // Collision unique rare : retenter une lecture/incrément.
    const existing = await prisma.rateLimitCounter.findUnique({
      where: {
        key_windowStart: {
          key: params.key,
          windowStart,
        },
      },
    });

    if (!existing) {
      return { allowed: true, count: 1 };
    }

    const incremented = await prisma.rateLimitCounter.update({
      where: { id: existing.id },
      data: { count: { increment: 1 }, expiresAt },
    });

    return {
      allowed: incremented.count <= params.max,
      count: incremented.count,
    };
  }
}
