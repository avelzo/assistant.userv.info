import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { legalIdentity } from '@/lib/legal/identity';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Traitement des données personnelles sur Assistant.',
  alternates: { canonical: '/confidentialite' },
};

export default function ConfidentialitePage() {
  const legal = legalIdentity();

  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        Cette politique décrit les données traitées par {legal.siteName} ({legal.siteUrl}), édité par{' '}
        {legal.publisher}. Pour toute question :{' '}
        <a className="text-primary hover:underline" href={`mailto:${legal.contactEmail}`}>
          {legal.contactEmail}
        </a>
        .
      </p>
      <h2 className="font-serif text-xl font-semibold">Données collectées</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Compte : email, nom, prénom, mot de passe (haché), adresse d’expéditeur si renseignée.</li>
        <li>Dossiers et courriers que vous rédigez ou générez.</li>
        <li>Usage du service : opérations IA, crédits, paiements Stripe (identifiants de transaction).</li>
        <li>Sécurité : adresse IP, événements de sécurité, reCAPTCHA.</li>
        <li>Mesure d’audience (Google Analytics 4) uniquement si vous l’acceptez.</li>
      </ul>
      <h2 className="font-serif text-xl font-semibold">Finalités et bases</h2>
      <p>
        Exécution du contrat (fourniture du service, crédits, rédaction), obligation légale (facturation),
        intérêt légitime (sécurité, prévention des abus) et consentement (cookies d’audience).
      </p>
      <h2 className="font-serif text-xl font-semibold">Destinataires</h2>
      <p>
        Prestataires techniques nécessaires : hébergeur, envoi d’e-mails, paiement Stripe, OpenAI pour la
        génération, Google reCAPTCHA v3 pour la protection des formulaires publics, et Google Analytics si
        consentement. Les contenus de courriers ne sont pas revendus.
      </p>
      <h2 className="font-serif text-xl font-semibold">Durées</h2>
      <p>
        Les traces d’usage IA et de sécurité sont conservées selon la configuration du service (par défaut 24
        mois / 90 jours). Le compte et les dossiers restent tant que le compte existe, sauf demande de
        suppression.
      </p>
      <h2 className="font-serif text-xl font-semibold">Vos droits</h2>
      <p>
        Accès, rectification, suppression, opposition, limitation, portabilité. Vous pouvez aussi introduire
        une réclamation auprès de la CNIL. Écrivez-nous à {legal.contactEmail} ou via la page{' '}
        <Link href="/contact" className="text-primary hover:underline">
          Contact
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
