import type { Metadata } from 'next';
import { ForgotPasswordPageContent } from '@/components/auth/ForgotPasswordPageContent';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  description: 'Recevez un lien de réinitialisation pour accéder à nouveau à votre compte.',
  alternates: {
    canonical: '/auth/forgot-password',
  },
  openGraph: {
    title: 'Mot de passe oublié | Assistant Administratif AI',
    description: 'Demandez un lien de réinitialisation pour votre compte.',
    url: '/auth/forgot-password',
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageContent />;
}
