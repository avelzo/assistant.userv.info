'use client';

import Link from 'next/link';
import { useClientReady, useCookieConsent, writeCookieConsent } from '@/lib/cookies/consent';

export function CookieBanner() {
  const ready = useClientReady();
  const consent = useCookieConsent();

  if (!ready || consent !== null) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Consentement cookies"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-paper p-4 shadow-[0_18px_40px_-24px_rgba(28,25,21,0.55)]">
        <p className="font-serif text-lg font-semibold text-ink">Cookies</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Nous utilisons des cookies nécessaires au compte et à la sécurité (dont reCAPTCHA). La mesure
          d’audience n’est activée que si vous l’acceptez.{' '}
          <Link href="/cookies" className="text-primary hover:underline">
            En savoir plus
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => writeCookieConsent(false)}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ivory"
          >
            Essentiels seulement
          </button>
          <button
            type="button"
            onClick={() => writeCookieConsent(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-paper hover:bg-primary-hover"
          >
            Accepter l’audience
          </button>
        </div>
      </div>
    </div>
  );
}
