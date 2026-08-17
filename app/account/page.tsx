import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AccountCard } from '@/components/AccountCard';
import { CreditHistoryCard } from '@/components/CreditHistoryCard';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { LetterHistoryCard } from '@/components/LetterHistoryCard';
import { VerifyEmailNotice } from '@/components/VerifyEmailNotice';
import { getAuthSession } from '@/lib/session';

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

export default async function AccountPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/auth/login?callbackUrl=/account');
  }

  return (
    <main className="min-h-screen bg-ivory">
      <Header />
      <section className="mx-auto w-full max-w-3xl space-y-6 px-6 pb-16 pt-8">
        <div className="rounded-3xl border border-line bg-paper p-6 shadow-xs">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Compte</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">Votre profil d’expéditeur</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Ces informations peuvent figurer dans vos courriers. Un seul profil suffit pour cette phase.
          </p>
        </div>
        <VerifyEmailNotice emailVerified={Boolean(session.user.emailVerified)} />
        <p className="text-sm">
          <Link href="/dossiers" className="font-medium text-primary hover:underline">
            Mes dossiers
          </Link>
        </p>
        <AccountCard />
        <ChangePasswordCard />
        <CreditHistoryCard />
        <LetterHistoryCard />
      </section>
      <LandingFooter />
    </main>
  );
}
