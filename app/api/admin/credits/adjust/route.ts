import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { creditService, InsufficientCreditsError } from '@/lib/credits';

type AdjustBody = {
  email?: string;
  userId?: string;
  amount?: number;
  pool?: 'FREE' | 'PAID';
  reason?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const body = (await request.json().catch(() => null)) as AdjustBody | null;
  const amount = Number(body?.amount);
  const reason = String(body?.reason || '').trim();
  const pool = body?.pool === 'FREE' ? 'FREE' : 'PAID';

  if (!Number.isFinite(amount) || amount === 0 || !reason) {
    return NextResponse.json({ error: 'Montant non nul et raison obligatoires.' }, { status: 400 });
  }

  let userId = body?.userId?.trim() || '';
  if (!userId && body?.email) {
    const user = await prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
      select: { id: true },
    });
    userId = user?.id || '';
  }

  if (!userId) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  try {
    const balance = await creditService.adminAdjust({
      userId,
      amount: Math.trunc(amount),
      pool,
      adminUserId: admin.session.user.id,
      reason,
      idempotencyKey: body?.idempotencyKey,
    });
    return NextResponse.json({ ok: true, balance });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Solde insuffisant pour cet ajustement.' }, { status: 400 });
    }
    throw error;
  }
}
