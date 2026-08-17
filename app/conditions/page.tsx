import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { legalIdentity } from '@/lib/legal/identity';

export const metadata: Metadata = {
  title: 'Conditions générales',
  description: 'Conditions d’utilisation et de vente du service Assistant.',
  alternates: { canonical: '/conditions' },
};

export default function ConditionsPage() {
  const legal = legalIdentity();

  return (
    <LegalLayout title="Conditions générales">
      <p>
        Les présentes conditions régissent l’accès au service {legal.siteName}, édité par {legal.publisher}.
        En créant un compte, vous les acceptez.
      </p>
      <h2 className="font-serif text-xl font-semibold">Service</h2>
      <p>
        Assistant aide à clarifier une démarche et à rédiger un courrier. L’utilisateur reste seul
        responsable du texte envoyé, des pièces jointes et de l’opportunité de la démarche. Le service ne
        remplace pas un avocat, un notaire ou une administration.
      </p>
      <h2 className="font-serif text-xl font-semibold">Compte</h2>
      <p>
        Vous devez fournir des informations exactes et garder votre mot de passe confidentiel. Certaines
        opérations IA exigent une adresse e-mail vérifiée.
      </p>
      <h2 className="font-serif text-xl font-semibold">Crédits et paiement</h2>
      <p>
        Un quota de 15 crédits est offert chaque jour (minuit, Europe/Paris) et ne se reporte pas.
        Les packs payants (30, 80 ou 200 crédits) sont consommables, payables via Stripe, et restent
        disponibles jusqu’à utilisation. Les prix affichés s’entendent TTC le cas échéant. Les crédits
        n’ont pas de valeur monétaire hors du service.
      </p>
      <h2 className="font-serif text-xl font-semibold">Rétractation</h2>
      <p>
        Conformément à l’article L221-28 du code de la consommation, le droit de rétractation peut ne pas
        s’appliquer aux contenus numériques fournis immédiatement. En achetant des crédits et en les
        utilisant, vous demandez l’exécution immédiate du service.
      </p>
      <h2 className="font-serif text-xl font-semibold">Responsabilité</h2>
      <p>
        Les suggestions, questions et courriers générés peuvent être incomplets ou inadaptés. Vérifiez
        toujours le texte. {legal.publisher} ne peut garantir l’issue d’une démarche administrative.
      </p>
      <h2 className="font-serif text-xl font-semibold">Contact</h2>
      <p>
        <Link href="/contact" className="text-primary hover:underline">
          Formulaire de contact
        </Link>{' '}
        ou {legal.contactEmail}.
      </p>
    </LegalLayout>
  );
}
