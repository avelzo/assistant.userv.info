'use client';

import { useClientReady, useCookieConsent, writeCookieConsent } from '@/lib/cookies/consent';

export function CookiePreferences() {
  const ready = useClientReady();
  const consent = useCookieConsent();

  if (!ready) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-line bg-ivory p-4">
      <p className="text-sm font-medium text-ink">Votre choix actuel</p>
      <p className="mt-1 text-sm text-muted">
        {consent?.analytics
          ? 'Mesure d’audience acceptée (Google Analytics 4).'
          : consent
            ? 'Cookies essentiels seulement. Aucune mesure d’audience.'
            : 'Aucun choix enregistré pour le moment.'}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => writeCookieConsent(false)}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
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
  );
}
