export type LegacyBalanceMigrationInput = {
  legacyCredits: number;
  paidCredits: number;
  hasMigrationLedger: boolean;
};

export type LegacyBalanceMigrationPlan = {
  paidCredits: number;
  copyLegacy: boolean;
};

/**
 * Ancien `CreditBalance.credits` → `paidCredits`, une seule fois.
 * Ne transforme jamais l’ancien solde en crédits gratuits.
 */
export function planPaidCreditsMigration(
  input: LegacyBalanceMigrationInput
): LegacyBalanceMigrationPlan {
  const legacy = Math.max(0, Math.floor(Number(input.legacyCredits) || 0));
  const paid = Math.max(0, Math.floor(Number(input.paidCredits) || 0));

  if (input.hasMigrationLedger) {
    return { paidCredits: paid || legacy, copyLegacy: false };
  }

  if (paid === 0 && legacy > 0) {
    return { paidCredits: legacy, copyLegacy: true };
  }

  return { paidCredits: paid, copyLegacy: false };
}
