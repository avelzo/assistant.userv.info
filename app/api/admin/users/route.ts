import { NextResponse } from 'next/server';
import { AiUsageStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { maskEmail } from '@/lib/admin/mask-email';
import { isMongoObjectId } from '@/lib/dossiers/http';

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim().toLowerCase() || '';
  const status = url.searchParams.get('status')?.trim() || '';
  const role = url.searchParams.get('role')?.trim() || '';

  const where: {
    id?: string;
    email?: { contains: string };
    role?: string;
    banned?: boolean;
    emailVerified?: boolean;
  } = {};

  if (q) {
    if (isMongoObjectId(q)) {
      where.id = q;
    } else {
      where.email = { contains: q };
    }
  }
  if (role === 'admin' || role === 'user') {
    where.role = role;
  }
  if (status === 'banned') {
    where.banned = true;
  } else if (status === 'unverified') {
    where.banned = false;
    where.emailVerified = false;
  } else if (status === 'active') {
    where.banned = false;
    where.emailVerified = true;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      email: true,
      role: true,
      banned: true,
      emailVerified: true,
      createdAt: true,
      creditBalance: {
        select: { freeCredits: true, paidCredits: true },
      },
    },
  });

  const ids = users.map((user) => user.id);
  const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [lastActivity, recentSpend] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.aiUsage.groupBy({
            by: ['userId'],
            where: { userId: { in: ids }, status: AiUsageStatus.SETTLED },
            _max: { createdAt: true },
          }),
          prisma.aiUsage.groupBy({
            by: ['userId'],
            where: {
              userId: { in: ids },
              status: AiUsageStatus.SETTLED,
              createdAt: { gte: recentSince },
            },
            _sum: { creditsCharged: true },
          }),
        ]);

  const lastActivityByUser = new Map(lastActivity.map((row) => [row.userId, row._max.createdAt]));
  const recentCreditsByUser = new Map(recentSpend.map((row) => [row.userId, row._sum.creditsCharged ?? 0]));

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      emailMasked: maskEmail(user.email),
      role: user.role,
      banned: user.banned,
      emailVerified: user.emailVerified,
      status: user.banned ? 'banned' : user.emailVerified ? 'active' : 'unverified',
      freeCredits: user.creditBalance?.freeCredits ?? 0,
      paidCredits: user.creditBalance?.paidCredits ?? 0,
      createdAt: user.createdAt.toISOString(),
      lastActivityAt: lastActivityByUser.get(user.id)?.toISOString() ?? null,
      recentCreditsCharged: recentCreditsByUser.get(user.id) ?? 0,
    })),
  });
}
