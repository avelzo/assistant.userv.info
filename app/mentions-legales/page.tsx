import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { legalIdentity } from '@/lib/legal/identity';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Éditeur, hébergeur et informations légales du service Assistant.',
  alternates: { canonical: '/mentions-legales' },
};

export default function MentionsLegalesPage() {
  const legal = legalIdentity();

  return (
    <LegalLayout title="Mentions légales">
      <p>
        Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique, les
        informations suivantes sont portées à la connaissance des utilisateurs du site {legal.siteName}.
      </p>
      <h2 className="font-serif text-xl font-semibold">Éditeur</h2>
      <p>
        {legal.publisher}
        <br />
        {legal.address}
        <br />
        SIRET : {legal.siret}
        <br />
        Directeur de la publication : {legal.director}
        <br />
        Contact :{' '}
        <a className="text-primary hover:underline" href={`mailto:${legal.contactEmail}`}>
          {legal.contactEmail}
        </a>
      </p>
      <h2 className="font-serif text-xl font-semibold">Hébergement</h2>
      <p>{legal.host}</p>
      <h2 className="font-serif text-xl font-semibold">Objet du service</h2>
      <p>
        Assistant est un outil d’aide à la compréhension d’une démarche administrative et à la rédaction d’un
        courrier. Il ne constitue pas un conseil juridique et n’accomplit aucune démarche à la place de
        l’utilisateur.
      </p>
      <p className="text-xs text-muted">
        Si une mention indique « À compléter », renseignez les variables NEXT_PUBLIC_LEGAL_* avant mise en
        production.
      </p>
    </LegalLayout>
  );
}
