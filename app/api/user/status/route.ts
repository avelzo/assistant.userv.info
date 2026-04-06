import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type StatusResponse = {
  freeGenerationsRemaining?: number;
  paidCredits?: number;
  email?: string;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 });
    }

    const balance = await prisma.creditBalance.findUnique({ where: { email } });
    const historicalFreeGenerations = await prisma.letterGeneration.count({
      where: {
        accountEmail: email,
        billingType: 'FREE',
      },
    });

    const freeGenerationsUsed = Math.max(user.freeGenerationsUsed || 0, historicalFreeGenerations);
    const freeGenerationsRemaining = Math.max(
      0,
      Number(process.env.NEXT_PUBLIC_FREE_GENERATIONS || '1') - freeGenerationsUsed
    );

    return NextResponse.json({
      freeGenerationsRemaining,
      paidCredits: balance?.credits ?? 0,
      email: user.email,
    } as StatusResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
