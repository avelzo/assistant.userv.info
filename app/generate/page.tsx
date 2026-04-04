import type { Metadata } from 'next';
import { GeneratorForm } from '@/components/GeneratorForm';
import { Header } from '@/components/Header';
import { PricingCard } from '@/components/PricingCard';
import { PaymentFlag } from '@/components/PaymentFlag';

export const metadata: Metadata = {
  title: 'Générer un courrier',
  description:
    'Décrivez votre situation et obtenez une lettre administrative formelle ainsi qu\'une version email prête à envoyer.',
  alternates: {
    canonical: '/generate',
  },
  openGraph: {
    url: '/generate',
    title: 'Générer un courrier',
    description:
      'Décrivez votre situation et obtenez une lettre administrative formelle ainsi qu\'une version email prête à envoyer.',
  },
  twitter: {
    title: 'Générer un courrier',
    description:
      'Décrivez votre situation et obtenez une lettre administrative formelle ainsi qu\'une version email prête à envoyer.',
  },
};

export default function GeneratePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="mx-auto w-full mt-2 px-6 absolute z-50 flex items-center justify-center">
        <PaymentFlag />
      </section>

      <section className="mx-auto w-full max-w-3xl space-y-6 px-6 pb-16 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Générer un courrier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Remplissez les informations ci-dessous pour obtenir votre lettre.
          </p>
        </div>
        <GeneratorForm />
        <PricingCard />
      </section>
    </main>
  );
}
