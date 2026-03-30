
import { GeneratorForm } from '@/components/GeneratorForm';
import { Header } from '@/components/Header';
import { PricingCard } from '@/components/PricingCard';
import { PaymentFlag } from '@/components/PaymentFlag';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="mx-auto w-full max-w-6xl px-6"><PaymentFlag /></section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-8 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 p-8 text-white shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">MVP prêt à monétiser</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Une app simple pour générer des lettres administratives crédibles et utiles.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-slate-200">
              Idéal pour les demandes CAF, assurances, résiliations, réclamations, échanges avec un employeur ou un bailleur.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-bold">60 sec</p>
                <p className="text-sm text-slate-200">pour obtenir une base sérieuse</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-bold">1 essai</p>
                <p className="text-sm text-slate-200">gratuit avant paiement</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-bold">PDF</p>
                <p className="text-sm text-slate-200">téléchargeable directement</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Rapide', 'L’utilisateur décrit sa situation et reçoit une lettre structurée.'],
              ['Pratique', 'Version lettre + version email à copier immédiatement.'],
              ['Monétisable', 'Tunnel simple avec un essai gratuit puis paiement à l’unité.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="generateur" className="space-y-6">
          <GeneratorForm />
          <PricingCard />
        </div>
      </section>
    </main>
  );
}
