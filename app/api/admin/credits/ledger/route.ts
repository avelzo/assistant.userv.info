import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { creditService } from '@/lib/credits';

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase() || '';
  const requestedUserId = url.searchParams.get('userId')?.trim() || '';

  const user = requestedUserId
    ? await prisma.user.findUnique({ where: { id: requestedUserId }, select: { id: true, email: true } })
    : email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
      : null;

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  const [balance, ledger] = await Promise.all([
    creditService.getBalance(user.id),
    prisma.creditLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    userId: user.id,
    balance,
    ledger: ledger.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      pool: entry.pool,
      type: entry.type,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
