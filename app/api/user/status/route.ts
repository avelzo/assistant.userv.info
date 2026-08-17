import { NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/session';
import { creditService } from '@/lib/credits';

export async function GET() {
  try {
    const session = await requireAuthSession();
    const userId = session?.user?.id;
    const email = session?.user?.email?.toLowerCase();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const balance = await creditService.getBalance(userId);

    return NextResponse.json({
      email,
      freeCredits: balance.freeCredits,
      paidCredits: balance.paidCredits,
      totalCredits: balance.totalCredits,
      nextFreeResetAt: balance.nextFreeResetAt,
      dailyFreeLimit: balance.dailyFreeLimit,
      freeGenerationsRemaining: balance.totalCredits > 0 ? 1 : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
