import type { Metadata } from 'next';
import { CookiePreferences } from '@/components/cookies/CookiePreferences';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Cookies et traceurs utilisés par Assistant.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Politique cookies">
      <p>
        Assistant utilise des cookies et traceurs pour faire fonctionner le service et, si vous l’acceptez,
        mesurer l’audience.
      </p>
      <h2 className="font-serif text-xl font-semibold">Nécessaires au service</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Session d’authentification (Better Auth) : rester connecté de façon sécurisée.</li>
        <li>
          reCAPTCHA v3 (Google) sur les formulaires publics (inscription, mot de passe oublié, contact) :
          protection contre les abus. Ce traceur est traité comme une mesure de sécurité.
        </li>
        <li>Préférence de consentement cookies, enregistrée localement dans votre navigateur.</li>
      </ul>
      <h2 className="font-serif text-xl font-semibold">Mesure d’audience</h2>
      <p>
        Google Analytics 4 n’est chargé que si vous acceptez les cookies d’audience. Vous pouvez modifier
        votre choix ci-dessous à tout moment.
      </p>
      <CookiePreferences />
      <h2 className="font-serif text-xl font-semibold">Paiement</h2>
      <p>
        Stripe peut déposer ses propres cookies lors du paiement des packs de crédits, sur les pages de
        checkout hébergées par Stripe.
      </p>
    </LegalLayout>
  );
}
