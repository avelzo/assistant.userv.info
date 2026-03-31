import './globals.css';
import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Assistant Administratif AI',
    template: '%s | Assistant Administratif AI',
  },
  description: 'Générez des lettres et emails administratifs en français en quelques secondes.',
  applicationName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Assistant Administratif AI',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    title: 'Assistant Administratif AI',
    description: 'Générez des lettres et emails administratifs en français en quelques secondes.',
    siteName: 'Assistant Administratif AI',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Assistant Administratif AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Assistant Administratif AI',
    description: 'Générez des lettres et emails administratifs en français en quelques secondes.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png', sizes: '32x32' },
      { url: '/icon', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
