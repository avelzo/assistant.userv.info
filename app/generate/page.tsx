import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { PaymentFlag } from '@/components/PaymentFlag';
import { VerifyEmailNotice } from '@/components/VerifyEmailNotice';
import { BriefingForm } from '@/components/BriefingForm';
import { getAuthSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Commencer une démarche',
  description: 'Décrivez votre objectif, le destinataire et le contexte pour ouvrir un dossier.',
  alternates: {
    canonical: '/generate',
  },
};

export default async function GeneratePage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/auth/login?callbackUrl=/generate');
  }

  return (
    <main className="min-h-screen bg-ivory">
      <Header />
      <section className="absolute z-50 mt-2 flex w-full items-center justify-center px-6">
        <PaymentFlag />
      </section>
      <section className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">Nouvelle démarche</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">Commencez par votre problème</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Trois éléments suffisent pour ouvrir un dossier. Les paramètres de lettre viendront ensuite,
            si besoin.
          </p>
        </div>
        <VerifyEmailNotice emailVerified={Boolean(session.user.emailVerified)} />
        <BriefingForm />
      </section>
    </main>
  );
}
