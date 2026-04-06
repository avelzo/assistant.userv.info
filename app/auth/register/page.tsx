import type { Metadata } from 'next';
import { RegisterPageContent } from '@/components/auth/RegisterPageContent';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Créez votre compte pour suivre vos crédits et retrouver vos paiements.',
  alternates: {
    canonical: '/auth/register',
  },
  openGraph: {
    title: 'Créer un compte | Assistant Administratif AI',
    description: 'Ouvrez votre compte pour gérer vos crédits et suivre vos paiements.',
    url: '/auth/register',
  },
};

export default function RegisterPage() {
  return <RegisterPageContent />;
}
