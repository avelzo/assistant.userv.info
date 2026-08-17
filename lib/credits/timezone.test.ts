import { describe, expect, it } from 'vitest';
import { creditDayKey, isSameCreditDay, nextCreditResetAt, startOfCreditDay } from '@/lib/credits/timezone';

const TZ = 'Europe/Paris';

describe('credit timezone Europe/Paris', () => {
  it('identifie le même jour civil à Paris', () => {
    const morning = new Date('2026-08-15T08:00:00.000+02:00');
    const evening = new Date('2026-08-15T23:30:00.000+02:00');
    expect(isSameCreditDay(morning, evening, TZ)).toBe(true);
    expect(creditDayKey(morning, TZ)).toBe('2026-08-15');
  });

  it('change de jour à minuit Paris', () => {
    const before = new Date('2026-08-15T23:30:00.000+02:00');
    const after = new Date('2026-08-16T00:30:00.000+02:00');
    expect(isSameCreditDay(before, after, TZ)).toBe(false);
  });

  it('place le prochain reset au prochain minuit Paris', () => {
    const now = new Date('2026-08-15T15:00:00.000+02:00');
    const reset = nextCreditResetAt(now, TZ);
    expect(creditDayKey(reset, TZ)).toBe('2026-08-16');
    expect(startOfCreditDay(reset, TZ).getTime()).toBe(reset.getTime());
  });

  it('gère le passage heure d’hiver (25 octobre 2026)', () => {
    const summerEvening = new Date('2026-10-24T23:30:00.000+02:00');
    const winterMorning = new Date('2026-10-25T03:30:00.000+01:00');
    expect(creditDayKey(summerEvening, TZ)).toBe('2026-10-24');
    expect(creditDayKey(winterMorning, TZ)).toBe('2026-10-25');
    const reset = nextCreditResetAt(summerEvening, TZ);
    expect(creditDayKey(reset, TZ)).toBe('2026-10-25');
  });
});
