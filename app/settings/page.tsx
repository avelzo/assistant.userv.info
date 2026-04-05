import type { Metadata } from 'next';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Paramètres',
  description: 'Retrouvez les réglages utiles liés à votre compte, vos paiements et vos crédits.',
  alternates: {
    canonical: '/settings',
  },
  openGraph: {
    title: 'Paramètres | Assistant Administratif AI',
    description: 'Consultez les réglages utiles pour votre compte et vos usages.',
    url: '/settings',
  },
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <section className="mx-auto w-full max-w-3xl space-y-6 px-6 pb-16 pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Paramètres</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Gardez la main sur votre expérience</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Retrouvez ici les repères utiles autour de votre compte, de vos paiements et du fonctionnement des crédits dans l'application.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Compte</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Vérifiez l'email rattaché à votre compte pour retrouver plus facilement vos achats et votre solde.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Paiement</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Les paiements ajoutent des crédits à votre compte après validation de la session Stripe.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Crédits</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Les crédits sont utilisés après l'essai gratuit pour générer vos courriers, emails et exports PDF.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
