import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/Header';
import { PricingCard } from '@/components/PricingCard';

export const metadata: Metadata = {
  title: 'Tarifs et crédits',
  description: 'Choisissez votre pack de crédits pour continuer vos générations de courriers.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    url: '/pricing',
    title: 'Tarifs et crédits',
    description: 'Choisissez votre pack de crédits pour continuer vos générations de courriers.',
  },
  twitter: {
    title: 'Tarifs et crédits',
    description: 'Choisissez votre pack de crédits pour continuer vos générations de courriers.',
  },
};

export default async function PricingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login?callbackUrl=/pricing');
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-slate-900">Choisissez un pack de crédits</h1>
          <p className="mt-2 text-sm text-slate-600">
            Votre compte est connecté. Sélectionnez un pack pour continuer vos générations.
          </p>
        </div>

        <div className="mt-8">
          <PricingCard enableCheckout />
        </div>
      </section>
    </main>
  );
}
