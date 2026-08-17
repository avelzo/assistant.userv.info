import { useSyncExternalStore } from 'react';

export const COOKIE_CONSENT_KEY = 'assistant-cookie-consent-v1';

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  updatedAt: string;
};

function parseCookieConsent(raw: string | null): CookieConsent | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== 'boolean') {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY));
}

function subscribeCookieConsent(onStoreChange: () => void) {
  window.addEventListener('assistant-cookie-consent', onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener('assistant-cookie-consent', onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export function useClientReady() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

export function useCookieConsent(): CookieConsent | null {
  const raw = useSyncExternalStore(
    subscribeCookieConsent,
    () => window.localStorage.getItem(COOKIE_CONSENT_KEY),
    () => null
  );
  return parseCookieConsent(raw);
}

export function writeCookieConsent(analytics: boolean): CookieConsent {
  const value: CookieConsent = {
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event('assistant-cookie-consent'));
  return value;
}
