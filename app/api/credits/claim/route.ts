import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { CreditLedgerEntrySource, CreditLedgerEntryType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const stripeKey = process.env.STRIPE_SECRET_KEY;

type ClaimBody = {
  sessionId?: string;
};

function splitFullName(value: string): { firstname: string; lastname: string } {
  const normalized = value.trim();
  if (!normalized) {
    return { firstname: '', lastname: '' };
  }

  const parts = normalized.split(/\s+/);
  return {
    firstname: parts[0] || '',
    lastname: parts.slice(1).join(' '),
  };
}

export async function POST(request: Request) {
  try {
    if (!stripeKey) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY est manquant.' }, { status: 500 });
    }

    let body: ClaimBody;
    try {
      body = (await request.json()) as ClaimBody;
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId est requis.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Le paiement n\'est pas confirmé.' }, { status: 400 });
    }

    const metadataCredits = Number(session.metadata?.credits || '0');
    const credits = Number.isFinite(metadataCredits) && metadataCredits > 0 ? metadataCredits : 1;
    const email =
      session.customer_details?.email?.trim().toLowerCase() ||
      session.metadata?.accountEmail?.trim().toLowerCase() ||
      '';
    const firstnameFromMetadata = session.metadata?.accountFirstname?.trim() || '';
    const lastnameFromMetadata = session.metadata?.accountLastname?.trim() || '';
    const fullNameFromStripe = session.customer_details?.name?.trim() || '';
    const splitName = splitFullName(fullNameFromStripe);
    const firstname = firstnameFromMetadata || splitName.firstname;
    const lastname = lastnameFromMetadata || splitName.lastname;

    if (!email) {
      return NextResponse.json(
        { error: 'Email introuvable pour créditer le compte.' },
        { status: 400 }
      );
    }

    const existingSession = await prisma.creditLedgerEntry.findFirst({
      where: { sessionId },
    });

    if (existingSession) {
      const balance = await prisma.creditBalance.findUnique({ where: { email } });
      return NextResponse.json({
        credited: false,
        alreadyProcessed: true,
        credits,
        availableCredits: balance?.credits ?? 0,
      });
    }

    const updatedBalance = await prisma.$transaction(async (transaction) => {
      await transaction.user.upsert({
        where: { email },
        update: {
          firstname: firstname || undefined,
          lastname: lastname || undefined,
        },
        create: {
          email,
          firstname: firstname || undefined,
          lastname: lastname || undefined,
        },
      });

      await transaction.creditLedgerEntry.create({
        data: {
          accountEmail: email,
          delta: credits,
          type: CreditLedgerEntryType.PURCHASE,
          source: CreditLedgerEntrySource.STRIPE,
          label: `${credits} crédit${credits > 1 ? 's' : ''} acheté${credits > 1 ? 's' : ''}`,
          sessionId,
          metadata: {
            stripeCheckoutSessionId: sessionId,
          },
        },
      });

      return transaction.creditBalance.upsert({
        where: { email },
        update: {
          credits: {
            increment: credits,
          },
        },
        create: {
          email,
          credits,
        },
      });
    });

    return NextResponse.json({
      credited: true,
      credits,
      availableCredits: updatedBalance.credits,
      email,
      firstname,
      lastname,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
