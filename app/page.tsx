import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { PaymentFlag } from '@/components/PaymentFlag';

export const metadata: Metadata = {
  title: 'Générateur de courriers administratifs IA',
  description:
    'Rédigez rapidement vos lettres et emails administratifs en français avec un assistant IA simple, rapide et sans inscription.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: '/',
    title: 'Générateur de courriers administratifs IA',
    description:
      'Rédigez rapidement vos lettres et emails administratifs en français avec un assistant IA simple, rapide et sans inscription.',
  },
  twitter: {
    title: 'Générateur de courriers administratifs IA',
    description:
      'Rédigez rapidement vos lettres et emails administratifs en français avec un assistant IA simple, rapide et sans inscription.',
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto w-full max-w-6xl px-6">
        <PaymentFlag />
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 px-6 py-24 text-center text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(139,92,246,0.3),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full border border-indigo-400/40 bg-indigo-400/10 px-4 py-1.5 text-sm font-medium text-indigo-200 backdrop-blur-sm">
            Propulsé par IA
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Rédigez vos courriers<br />
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              administratifs en 60 sec
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-indigo-100">
            Décrivez votre situation, l&apos;IA génère une lettre structurée et professionnelle — CAF, assurances, employeur, bailleur et plus encore.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/generate"
              className="rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-900 shadow-lg transition hover:bg-indigo-50"
            >
              Générer ma lettre gratuitement
            </Link>
            <p className="text-sm text-indigo-300">1 essai gratuit · aucun compte requis</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-100 bg-slate-50 px-6 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-8 text-center">
          {[
            ['60 sec', 'pour obtenir une base sérieuse'],
            ['1 essai', 'gratuit avant paiement'],
            ['PDF', 'téléchargeable directement'],
          ].map(([value, label]) => (
            <div key={value}>
              <p className="text-3xl font-extrabold text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-slate-900">Comment ça marche</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: '✍️',
              title: 'Décrivez votre situation',
              desc: "Quelques lignes suffisent. L'IA comprend le contexte, le destinataire et le ton voulu.",
            },
            {
              icon: '⚡',
              title: "L'IA rédige en quelques secondes",
              desc: 'Lettre formelle + version email générées ensemble, prêtes à relire et personnaliser.',
            },
            {
              icon: '📄',
              title: 'Téléchargez ou copiez',
              desc: 'Export PDF ou copie directe du texte. Utilisable immédiatement, sans inscription.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <span className="text-3xl">{icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-indigo-950 to-violet-900 px-6 py-20 text-center text-white">
        <h2 className="text-3xl font-bold">Prêt à rédiger ?</h2>
        <p className="mt-3 text-indigo-200">Votre premier courrier est gratuit.</p>
        <Link
          href="/generate"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-900 transition hover:bg-indigo-50"
        >
          Commencer maintenant
        </Link>
      </section>
    </main>
  );
}
