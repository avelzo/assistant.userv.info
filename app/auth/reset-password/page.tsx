import type { Metadata } from 'next';
import { ResetPasswordPageContent } from '@/components/auth/ResetPasswordPageContent';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  description: 'Définissez un nouveau mot de passe pour vous reconnecter à votre compte.',
  alternates: {
    canonical: '/auth/reset-password',
  },
  openGraph: {
    title: 'Nouveau mot de passe | Assistant Administratif AI',
    description: 'Choisissez un nouveau mot de passe pour retrouver l’accès à votre compte.',
    url: '/auth/reset-password',
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageContent />;
}
