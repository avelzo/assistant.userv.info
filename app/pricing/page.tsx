import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { PricingCard } from '@/components/PricingCard';
import { getAuthSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Tarifs et crédits',
  description:
    '15 crédits offerts chaque jour, et packs 30 / 80 / 200 crédits pour continuer vos courriers.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    url: '/pricing',
    title: 'Tarifs et crédits',
    description:
      '15 crédits offerts chaque jour, et packs 30 / 80 / 200 crédits pour continuer vos courriers.',
  },
  twitter: {
    title: 'Tarifs et crédits',
    description:
      '15 crédits offerts chaque jour, et packs 30 / 80 / 200 crédits pour continuer vos courriers.',
  },
};

export default async function PricingPage() {
  const session = await getAuthSession();

  return (
    <main className="min-h-screen bg-ivory">
      <Header variant={session ? 'app' : 'marketing'} />

      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">Tarifs</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Choisissez un pack de crédits</h1>
          <p className="mt-2 text-sm text-muted">
            {session
              ? 'Votre compte est connecté. 15 crédits gratuits chaque jour, les packs ne se périment pas.'
              : '15 crédits gratuits chaque jour (environ un courrier). Connectez-vous pour acheter un pack.'}
          </p>
        </div>

        <div className="mt-8">
          <PricingCard enableCheckout />
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
