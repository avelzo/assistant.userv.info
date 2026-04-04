import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AccountBody = {
  email?: string;
  firstname?: string;
  lastname?: string;
  previousEmail?: string;
};

function normalizeEmail(value?: string): string {
  return (value || '').trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    let body: AccountBody;
    try {
      body = (await request.json()) as AccountBody;
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const previousEmail = normalizeEmail(body.previousEmail);
    const firstname = (body.firstname || '').trim();
    const lastname = (body.lastname || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 });
    }

    if (previousEmail && previousEmail !== email) {
      const currentTarget = await prisma.user.findUnique({ where: { email } });
      if (currentTarget) {
        return NextResponse.json(
          { error: 'Un utilisateur existe déjà avec ce nouvel email.' },
          { status: 409 }
        );
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.user.upsert({
          where: { email: previousEmail },
          update: {
            email,
            firstname: firstname || null,
            lastname: lastname || null,
          },
          create: {
            email,
            firstname: firstname || null,
            lastname: lastname || null,
          },
        });

        await transaction.creditBalance.updateMany({
          where: { email: previousEmail },
          data: {
            email,
          },
        });

        await transaction.creditLedgerEntry.updateMany({
          where: { accountEmail: previousEmail },
          data: {
            accountEmail: email,
          },
        });

        await transaction.letterGeneration.updateMany({
          where: { accountEmail: previousEmail },
          data: {
            accountEmail: email,
          },
        });
      });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstname: firstname || null,
        lastname: lastname || null,
      },
      create: {
        email,
        firstname: firstname || null,
        lastname: lastname || null,
      },
    });

    const balance = await prisma.creditBalance.findUnique({ where: { email } });

    return NextResponse.json({
      account: {
        email: user.email,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        credits: balance?.credits ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
