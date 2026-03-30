import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assistant Administratif AI',
  description: 'Générez des lettres et emails administratifs en français en quelques secondes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
