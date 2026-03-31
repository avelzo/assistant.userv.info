import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Résultat du courrier',
  description:
    'Consultez le résultat généré, copiez votre texte ou téléchargez votre courrier en PDF.',
  alternates: {
    canonical: '/result',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
