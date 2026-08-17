import { NextResponse } from 'next/server';
import { AiUsageStatus, CreditLedgerEntryType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { creditService } from '@/lib/credits';
import { maskEmail } from '@/lib/admin/mask-email';
import { isMongoObjectId } from '@/lib/dossiers/http';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const { id } = await context.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      banned: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  const [balance, recentUsage, purchases, aiSummary] = await Promise.all([
    creditService.getBalance(user.id),
    prisma.aiUsage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        operation: true,
        status: true,
        creditsCharged: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        createdAt: true,
      },
    }),
    prisma.creditLedgerEntry.findMany({
      where: { userId: user.id, type: CreditLedgerEntryType.PURCHASE },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        amount: true,
        packId: true,
        label: true,
        createdAt: true,
      },
    }),
    prisma.aiUsage.aggregate({
      where: { userId: user.id, status: AiUsageStatus.SETTLED },
      _count: { _all: true },
      _sum: { creditsCharged: true, estimatedCost: true },
    }),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      emailMasked: maskEmail(user.email),
      role: user.role,
      banned: user.banned,
      emailVerified: user.emailVerified,
      status: user.banned ? 'banned' : user.emailVerified ? 'active' : 'unverified',
      createdAt: user.createdAt.toISOString(),
      balance,
      aiSummary: {
        calls: aiSummary._count._all,
        creditsCharged: aiSummary._sum.creditsCharged ?? 0,
        estimatedCostNanodollars: aiSummary._sum.estimatedCost ?? 0,
      },
      recentUsage: recentUsage.map((row) => ({
        id: row.id,
        operation: row.operation,
        status: row.status,
        creditsCharged: row.creditsCharged,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        estimatedCostNanodollars: row.estimatedCost,
        createdAt: row.createdAt.toISOString(),
      })),
      purchases: purchases.map((row) => ({
        id: row.id,
        amount: row.amount,
        packId: row.packId,
        label: row.label,
        createdAt: row.createdAt.toISOString(),
      })),
    },
  });
}
