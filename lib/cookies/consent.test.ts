import { describe, expect, it, beforeEach } from 'vitest';
import { COOKIE_CONSENT_KEY, readCookieConsent, writeCookieConsent } from '@/lib/cookies/consent';
import { legalIdentity } from '@/lib/legal/identity';

describe('cookie consent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ne considère pas l’audience comme acceptée par défaut', () => {
    expect(readCookieConsent()).toBeNull();
  });

  it('enregistre le choix essentiel ou audience', () => {
    writeCookieConsent(false);
    expect(readCookieConsent()?.analytics).toBe(false);
    writeCookieConsent(true);
    expect(readCookieConsent()?.analytics).toBe(true);
    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toContain('analytics');
  });
});

describe('identité légale', () => {
  it('fournit un contact et un nom de service sans inventer un SIRET', () => {
    const legal = legalIdentity();
    expect(legal.siteName).toBe('Assistant');
    expect(legal.contactEmail).toMatch(/@/);
    expect(legal.siret.length).toBeGreaterThan(0);
  });
});
