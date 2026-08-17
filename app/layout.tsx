import './globals.css';
import type { Metadata } from 'next';
import { DM_Mono, Newsreader, Public_Sans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { AnalyticsScripts } from '@/components/cookies/AnalyticsScripts';
import { CookieBanner } from '@/components/cookies/CookieBanner';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-data',
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
const gaMeasurementId = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Assistant',
    template: '%s | Assistant',
  },
  description:
    'Expliquez simplement ce que vous souhaitez obtenir. Assistant vous aide à comprendre la démarche et à rédiger un courrier adapté.',
  applicationName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Assistant',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    title: 'Trouvez les bons mots. Faites le bon courrier.',
    description:
      'Expliquez simplement ce que vous souhaitez obtenir. Assistant vous aide à comprendre la démarche et à rédiger un courrier adapté.',
    siteName: 'Assistant',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trouvez les bons mots. Faites le bon courrier.',
    description:
      'Expliquez simplement ce que vous souhaitez obtenir. Assistant vous aide à comprendre la démarche et à rédiger un courrier adapté.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${publicSans.variable} ${newsreader.variable} ${dmMono.variable}`}>
      <body className="bg-ivory font-sans text-ink antialiased">
        {gaMeasurementId ? <AnalyticsScripts measurementId={gaMeasurementId} /> : null}
        <Providers>
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
