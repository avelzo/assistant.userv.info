import type { Metadata } from 'next';
import { LoginPageContent } from '@/components/auth/LoginPageContent';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous pour retrouver votre compte, vos crédits et vos paiements.',
  alternates: {
    canonical: '/auth/login',
  },
  openGraph: {
    title: 'Connexion | Assistant Administratif AI',
    description: 'Accédez à votre compte pour suivre vos crédits et vos paiements.',
    url: '/auth/login',
  },
};

export default function LoginPage() {
  return <LoginPageContent />;
}
