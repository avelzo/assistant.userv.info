import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { creditService } from '@/lib/credits';
import { paidCreditsForPack } from '@/lib/credits/config';

export async function grantStripePurchase(params: {
  checkoutSession: Stripe.Checkout.Session;
  userId: string;
  stripeEventId?: string;
}): Promise<{ credited: boolean; amount: number; freeCredits: number; paidCredits: number; totalCredits: number }> {
  const packId = params.checkoutSession.metadata?.packId || '';
  const pack = packId
    ? await prisma.creditPack.findUnique({ where: { code: packId } })
    : null;

  const metadataCredits = Number(params.checkoutSession.metadata?.creditsGranted || params.checkoutSession.metadata?.credits || '0');
  const amount = pack
    ? paidCreditsForPack(pack)
    : Number.isFinite(metadataCredits) && metadataCredits > 0
      ? metadataCredits
      : 10;

  const result = await creditService.addPurchasedCredits({
    userId: params.userId,
    amount,
    idempotencyKey: `stripe:session:${params.checkoutSession.id}`,
    sessionId: params.checkoutSession.id,
    stripeEventId: params.stripeEventId,
    packId: pack?.code,
    label: `${amount} crédit${amount > 1 ? 's' : ''} acheté${amount > 1 ? 's' : ''}`,
  });

  await prisma.stripeProcessedSession.upsert({
    where: { sessionId: params.checkoutSession.id },
    update: {},
    create: { sessionId: params.checkoutSession.id },
  });

  return {
    credited: result.credited,
    amount,
    freeCredits: result.balance.freeCredits,
    paidCredits: result.balance.paidCredits,
    totalCredits: result.balance.totalCredits,
  };
}

export async function resolveCheckoutUserId(checkoutSession: Stripe.Checkout.Session): Promise<string | null> {
  const metadataUserId = checkoutSession.metadata?.userId?.trim();
  if (metadataUserId) {
    const byId = await prisma.user.findUnique({ where: { id: metadataUserId }, select: { id: true } });
    if (byId) {
      return byId.id;
    }
  }

  const email =
    checkoutSession.metadata?.accountEmail?.trim().toLowerCase() ||
    checkoutSession.customer_details?.email?.trim().toLowerCase() ||
    '';
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}
