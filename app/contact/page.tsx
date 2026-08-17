import type { Metadata } from 'next';
import { ContactPageContent } from '@/components/ContactPageContent';
import { Header } from '@/components/Header';
import { LandingFooter } from '@/components/landing/LandingFooter';

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
    <main className="min-h-screen bg-ivory">
      <Header variant="marketing" />
      <ContactPageContent />
      <LandingFooter />
    </main>
  );
}
