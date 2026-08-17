import { NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/session';
import { creditService } from '@/lib/credits';
import { AI_CREDIT_COSTS } from '@/lib/credits/config';

export async function GET() {
  const session = await requireAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const balance = await creditService.getBalance(userId);
  return NextResponse.json({
    freeCredits: balance.freeCredits,
    paidCredits: balance.paidCredits,
    totalCredits: balance.totalCredits,
    nextFreeResetAt: balance.nextFreeResetAt,
    dailyFreeLimit: balance.dailyFreeLimit,
    costs: AI_CREDIT_COSTS,
  });
}
