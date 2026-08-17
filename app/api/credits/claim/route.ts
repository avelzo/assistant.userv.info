import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuthSession } from '@/lib/session';
import { getTrustedClientIp } from '@/lib/ip';
import { rejectIfDisallowedOrigin } from '@/lib/origin';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSecurityEvent } from '@/lib/security-event';
import { grantStripePurchase, resolveCheckoutUserId } from '@/lib/credits/stripe-grant';

const stripeKey = process.env.STRIPE_SECRET_KEY;

type ClaimBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  try {
    const originError = rejectIfDisallowedOrigin(request);
    if (originError) {
      await recordSecurityEvent({
        kind: 'ORIGIN_REJECT',
        route: '/api/credits/claim',
        status: 403,
        ip: getTrustedClientIp(request),
      });
      return originError;
    }

    const ip = getTrustedClientIp(request);
    const ipLimit = await consumeRateLimit({
      key: `claim:ip:${ip}`,
      windowMs: RATE_LIMITS.claimIp.windowMs,
      max: RATE_LIMITS.claimIp.max,
    });

    if (!ipLimit.allowed) {
      await recordSecurityEvent({
        kind: 'RATE_LIMIT',
        route: '/api/credits/claim',
        status: 429,
        ip,
      });
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 });
    }

    const authSession = await requireAuthSession();
    const sessionUserId = authSession?.user?.id || '';
    const sessionEmail = authSession?.user?.email?.trim().toLowerCase() || '';

    if (!sessionUserId || !sessionEmail) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour créditer un paiement.' },
        { status: 401 }
      );
    }

    if (!stripeKey) {
      return NextResponse.json({ error: 'Paiement indisponible pour le moment.' }, { status: 500 });
    }

    let body: ClaimBody;
    try {
      body = (await request.json()) as ClaimBody;
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const sessionId = body.sessionId?.trim();
    if (!sessionId || sessionId.length > 200) {
      return NextResponse.json({ error: 'sessionId est requis.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey);
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Le paiement n\'est pas confirmé.' }, { status: 400 });
    }

    const ownerUserId = await resolveCheckoutUserId(checkoutSession);
    if (!ownerUserId || ownerUserId !== sessionUserId) {
      return NextResponse.json({ error: 'Paiement non rattaché à ce compte.' }, { status: 403 });
    }

    const result = await grantStripePurchase({
      checkoutSession,
      userId: sessionUserId,
    });

    return NextResponse.json({
      credited: result.credited,
      alreadyProcessed: !result.credited,
      credits: result.amount,
      availableCredits: result.totalCredits,
      freeCredits: result.freeCredits,
      paidCredits: result.paidCredits,
      email: sessionEmail,
    });
  } catch {
    return NextResponse.json({ error: 'Impossible de valider le paiement.' }, { status: 500 });
  }
}
