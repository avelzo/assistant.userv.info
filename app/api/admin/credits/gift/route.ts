import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/session';
import { creditService } from '@/lib/credits';

type GiftBody = {
  email?: string;
  userId?: string;
  amount?: number;
  reason?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const body = (await request.json().catch(() => null)) as GiftBody | null;
  const amount = Number(body?.amount);
  const reason = String(body?.reason || '').trim();
  if (!Number.isFinite(amount) || amount <= 0 || !reason) {
    return NextResponse.json({ error: 'Montant et raison obligatoires.' }, { status: 400 });
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

  const balance = await creditService.adminGift({
    userId,
    amount: Math.floor(amount),
    adminUserId: admin.session.user.id,
    reason,
    idempotencyKey: body?.idempotencyKey,
  });

  return NextResponse.json({ ok: true, balance });
}
