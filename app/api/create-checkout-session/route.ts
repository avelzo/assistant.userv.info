import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getCreditPacks } from '@/lib/packs';
import { requireAuthSession } from '@/lib/session';
import { paidCreditsForPack } from '@/lib/credits/config';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const stripeKey = process.env.STRIPE_SECRET_KEY;

type CreateCheckoutBody = {
  packId?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
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
    const originError = rejectIfDisallowedOrigin(request);
    if (originError) {
      return originError;
    }

    const authSession = await requireAuthSession();
    const sessionEmail = authSession?.user?.email?.trim().toLowerCase() || '';
    const sessionUserId = authSession?.user?.id || '';

    if (!sessionEmail || !sessionUserId) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour acheter des crédits.' },
        { status: 401 }
      );
    }

    const ip = getTrustedClientIp(request);
    const ipLimit = await consumeRateLimit({
      key: `checkout:ip:${ip}`,
      windowMs: RATE_LIMITS.checkoutIp.windowMs,
      max: RATE_LIMITS.checkoutIp.max,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 });
    }

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
type CheckoutSessionCreate = NonNullable<Parameters<typeof stripe.checkout.sessions.create>[0]>;
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

    const sessionName = authSession?.user?.name?.trim() || '';
    const splitSessionName = splitFullName(sessionName);

    const customerEmail = sessionEmail;
    const customerFirstname = splitSessionName.firstname || body.firstname?.trim() || '';
    const customerLastname = splitSessionName.lastname || body.lastname?.trim() || '';

    const lineItems: CheckoutSessionCreate['line_items'] =
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
                  description: `${paidCreditsForPack(selectedPack)} crédits`,
                },
                unit_amount: selectedPack.priceCents,
              },
              quantity: 1,
            },
          ];

    const checkoutParams: CheckoutSessionCreate = {
        mode: 'payment',
        success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        line_items: lineItems,
        customer_email: customerEmail,
        customer_creation: 'always',
        metadata: {
          packId: selectedPack.code,
          credits: String(paidCreditsForPack(selectedPack)),
          creditsGranted: String(paidCreditsForPack(selectedPack)),
          userId: sessionUserId,
          accountEmail: customerEmail || '',
          accountFirstname: customerFirstname,
          accountLastname: customerLastname,
        },
      };

      const stripeSession = await stripe.checkout.sessions.create(checkoutParams);

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur Stripe.' }, { status: 500 });
  }
}
