import type { Metadata } from 'next';
import { ContactPageContent } from '@/components/ContactPageContent';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Contact | Assistant Administratif AI',
  description: 'Contactez-nous pour poser une question ou signaler un problème.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact | Assistant Administratif AI',
    description: 'Contactez-nous pour poser une question ou signaler un problème.',
    url: '/contact',
  },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <ContactPageContent />
    </>
  );
}
