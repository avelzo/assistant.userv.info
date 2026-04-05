import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { AccountCard } from '@/components/AccountCard';
import { CreditHistoryCard } from '@/components/CreditHistoryCard';

export const metadata: Metadata = {
  title: 'Mon compte',
  description: 'Gérez votre compte, consultez votre solde de crédits et suivez vos paiements.',
  alternates: {
    canonical: '/account',
  },
  openGraph: {
    title: 'Mon compte | Assistant Administratif AI',
    description: 'Retrouvez vos informations de compte, vos crédits et votre activité récente.',
    url: '/account',
  },
};

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <section className="mx-auto w-full max-w-3xl space-y-6 px-6 pb-16 pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Compte</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Centralisez vos informations et vos crédits</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Cette page rassemble les informations utiles pour retrouver vos paiements, vérifier votre solde et suivre les mouvements récents sur votre compte.
          </p>
        </div>
        <AccountCard />
        <CreditHistoryCard />
      </section>
    </main>
  );
}
