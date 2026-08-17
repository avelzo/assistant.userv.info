import { describe, expect, it } from 'vitest';
import { planPaidCreditsMigration } from '@/lib/credits/migration';

describe('migration ancien solde → paidCredits', () => {
  it('copie l’ancien solde une seule fois vers paidCredits', () => {
    expect(
      planPaidCreditsMigration({
        legacyCredits: 19,
        paidCredits: 0,
        hasMigrationLedger: false,
      })
    ).toEqual({ paidCredits: 19, copyLegacy: true });
  });

  it('ne double pas si le script est rejoué', () => {
    expect(
      planPaidCreditsMigration({
        legacyCredits: 19,
        paidCredits: 19,
        hasMigrationLedger: true,
      })
    ).toEqual({ paidCredits: 19, copyLegacy: false });

    expect(
      planPaidCreditsMigration({
        legacyCredits: 19,
        paidCredits: 19,
        hasMigrationLedger: false,
      })
    ).toEqual({ paidCredits: 19, copyLegacy: false });
  });

  it('ne transforme jamais l’ancien solde en crédits gratuits', () => {
    const plan = planPaidCreditsMigration({
      legacyCredits: 50,
      paidCredits: 0,
      hasMigrationLedger: false,
    });
    expect(plan.copyLegacy).toBe(true);
    expect(plan.paidCredits).toBe(50);
  });
});
