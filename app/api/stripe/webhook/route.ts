import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { grantStripePurchase, resolveCheckoutUserId } from '@/lib/credits/stripe-grant';

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook Stripe non configuré.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Signature absente.' }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = new Stripe(stripeKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  if (checkoutSession.payment_status !== 'paid' && checkoutSession.status !== 'complete') {
    return NextResponse.json({ received: true, ignored: true });
  }

  const userId = await resolveCheckoutUserId(checkoutSession);
  if (!userId) {
    return NextResponse.json({ received: true, unmatched: true });
  }

  await grantStripePurchase({
    checkoutSession,
    userId,
    stripeEventId: event.id,
  });

  return NextResponse.json({ received: true });
}
