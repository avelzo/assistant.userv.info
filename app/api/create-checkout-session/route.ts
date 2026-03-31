import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export async function POST() {
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

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Déblocage génération premium',
              description: 'Paiement unitaire pour obtenir le courrier complet + export PDF',
            },
            unit_amount: parseInt(process.env.NEXT_PUBLIC_PRICE_PER_GENERATION || '099') 
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Stripe.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
