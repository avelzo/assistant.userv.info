/**
 * Barème crédits IA.
 * GENERATE_LETTER (10) sert d’unité d’affichage « ≈ N lettres ».
 * Avec FREE_DAILY_CREDITS=15 : ~1 lettre/jour, ou analyse + courrier.
 */
export const AI_CREDIT_COSTS = {
  ASK_QUESTION: 2,
  REWRITE_SELECTION: 3,
  ADVISE: 4,
  ANALYZE_SITUATION: 5,
  GENERATE_EMAIL: 6,
  ANALYZE_REPLY: 8,
  GENERATE_LETTER: 10,
  REVISE_DOCUMENT: 12,
} as const;

export type AiCreditOperation = keyof typeof AI_CREDIT_COSTS;

export function getAiCreditCost(operation: AiCreditOperation): number {
  return AI_CREDIT_COSTS[operation];
}

export function getDailyFreeCredits(): number {
  const parsed = Number(process.env.FREE_DAILY_CREDITS);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 15;
  }
  return Math.floor(parsed);
}

export function getCreditTimeZone(): string {
  return process.env.CREDIT_TZ?.trim() || 'Europe/Paris';
}

export function approximatePackUsage(credits: number): { letters: number; questions: number } {
  const amount = Math.max(0, credits);
  return {
    letters: Math.floor(amount / AI_CREDIT_COSTS.GENERATE_LETTER),
    questions: Math.floor(amount / AI_CREDIT_COSTS.ASK_QUESTION),
  };
}

/**
 * Packs Stripe : creditsGranted est la source de vérité.
 * Repli historique : 1 génération ≡ GENERATE_LETTER.
 */
export function paidCreditsForPack(pack: {
  code: string;
  credits: number;
  creditsGranted?: number | null;
}): number {
  if (typeof pack.creditsGranted === 'number' && pack.creditsGranted > 0) {
    return pack.creditsGranted;
  }
  return Math.max(0, pack.credits) * AI_CREDIT_COSTS.GENERATE_LETTER;
}
