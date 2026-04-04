import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getCreditPacks } from '@/lib/packs';

const stripeKey = process.env.STRIPE_SECRET_KEY;

type CreateCheckoutBody = {
  packId?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
};

export async function POST(request: Request) {
  try {
    if (!stripeKey) {
      return NextResponse.json(
        {
          error: 'STRIPE_SECRET_KEY est manquant. Ajoutez la variable d\'environnement avant d\'utiliser le paiement.',
        },
        { status: 500 },
      );
    }

    const stripe = new Stripe(stripeKey);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    let body: CreateCheckoutBody = {};
    try {
      body = (await request.json()) as CreateCheckoutBody;
    } catch {
      body = {};
    }

    const packs = await getCreditPacks();
    const selectedPack = packs.find((pack: { code: string }) => pack.code === body.packId) || packs[0];

    if (!selectedPack) {
      return NextResponse.json(
        { error: 'Aucun pack actif n\'est disponible.' },
        { status: 400 }
      );
    }

    const customerEmail = body.email?.trim().toLowerCase() || undefined;
    const customerFirstname = body.firstname?.trim() || '';
    const customerLastname = body.lastname?.trim() || '';

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      selectedPack.stripePriceId
        ? [
            {
              price: selectedPack.stripePriceId,
              quantity: 1,
            },
          ]
        : [
            {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: selectedPack.label,
                  description: `${selectedPack.credits} génération${selectedPack.credits > 1 ? 's' : ''} de lettre + version email + export PDF`,
                },
                unit_amount: selectedPack.priceCents,
              },
              quantity: 1,
            },
          ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      line_items: lineItems,
      customer_email: customerEmail,
      customer_creation: 'always',
      metadata: {
        packId: selectedPack.code,
        credits: String(selectedPack.credits),
        accountEmail: customerEmail || '',
        accountFirstname: customerFirstname,
        accountLastname: customerLastname,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Stripe.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
