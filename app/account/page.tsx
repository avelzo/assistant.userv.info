import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { AccountCard } from '@/components/AccountCard';
import { CreditHistoryCard } from '@/components/CreditHistoryCard';

export const metadata: Metadata = {
  title: 'Mon compte',
  description: 'Gérez vos informations de compte et la liaison de vos crédits de génération.',
  alternates: {
    canonical: '/account',
  },
};

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <section className="mx-auto w-full max-w-3xl space-y-6 px-6 pb-16 pt-8">
        <AccountCard />
        <CreditHistoryCard />
      </section>
    </main>
  );
}
