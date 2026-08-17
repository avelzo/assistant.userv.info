import { NextResponse } from 'next/server';
import { CreditLedgerEntrySource } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuthSession } from '@/lib/session';
import { displayName } from '@/lib/register-guards';
import { creditService } from '@/lib/credits';

type AccountBody = {
  email?: string;
  firstname?: string;
  lastname?: string;
  previousEmail?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
};

function normalizeEmail(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

export async function GET() {
  try {
    const session = await requireAuthSession();
    const email = normalizeEmail(session?.user?.email);
    const userId = session?.user?.id || '';

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour consulter votre compte.' },
        { status: 401 }
      );
    }

    const [user, creditView, ledgerEntries, letterGenerations] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      creditService.getBalance(userId),
      prisma.creditLedgerEntry.findMany({
        where: { OR: [{ userId }, { accountEmail: email }] },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.letterGeneration.findMany({
        where: { accountEmail: email },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const history = ledgerEntries.map((entry) => ({
      id: entry.id,
      type: entry.amount >= 0 ? 'purchase' : 'consume',
      credits: Math.abs(entry.amount),
      source: entry.source === CreditLedgerEntrySource.STRIPE ? 'stripe' : 'generation',
      label: entry.label,
      createdAt: entry.createdAt.toISOString(),
    }));

    const generations = letterGenerations.map((generation) => ({
      id: generation.id,
      category: generation.category,
      recipient: generation.recipient || '',
      subject: generation.subject || '',
      detailsPreview: generation.details.trim().slice(0, 140),
      letter: generation.letter,
      emailVersion: generation.emailVersion || '',
      dossierId: generation.dossierId || null,
      createdAt: generation.createdAt.toISOString(),
    }));

    return NextResponse.json({
      account: {
        email,
        firstname: user?.firstname || '',
        lastname: user?.lastname || '',
        addressLine: user?.addressLine || '',
        postalCode: user?.postalCode || '',
        city: user?.city || '',
        phone: user?.phone || '',
        credits: creditView.totalCredits,
        freeCredits: creditView.freeCredits,
        paidCredits: creditView.paidCredits,
        dailyFreeLimit: creditView.dailyFreeLimit,
        nextFreeResetAt: creditView.nextFreeResetAt,
      },
      history,
      generations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuthSession();
    const sessionEmail = normalizeEmail(session?.user?.email);

    if (!sessionEmail) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour modifier votre compte.' },
        { status: 401 }
      );
    }

    let body: AccountBody;
    try {
      body = (await request.json()) as AccountBody;
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const requestedEmail = normalizeEmail(body.email);
    const firstname = (body.firstname || '').trim().slice(0, 80);
    const lastname = (body.lastname || '').trim().slice(0, 80);
    const addressLine = (body.addressLine || '').trim().slice(0, 200);
    const postalCode = (body.postalCode || '').trim().slice(0, 20);
    const city = (body.city || '').trim().slice(0, 80);
    const phone = (body.phone || '').trim().slice(0, 40);

    if (requestedEmail && requestedEmail !== sessionEmail) {
      return NextResponse.json(
        { error: 'Le changement d\'adresse email n\'est pas disponible pour le moment.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email: sessionEmail },
      data: {
        firstname: firstname || null,
        lastname: lastname || null,
        addressLine: addressLine || null,
        postalCode: postalCode || null,
        city: city || null,
        phone: phone || null,
        name: displayName(firstname, lastname, sessionEmail),
      },
    });

    const creditView = await creditService.getBalance(session?.user?.id || '');

    return NextResponse.json({
      account: {
        email: user.email,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        addressLine: user.addressLine || '',
        postalCode: user.postalCode || '',
        city: user.city || '',
        phone: user.phone || '',
        credits: creditView.totalCredits,
        freeCredits: creditView.freeCredits,
        paidCredits: creditView.paidCredits,
        dailyFreeLimit: creditView.dailyFreeLimit,
        nextFreeResetAt: creditView.nextFreeResetAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
