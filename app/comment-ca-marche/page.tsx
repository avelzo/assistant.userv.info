import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { HeroGenerateLink } from '@/components/HeroGenerateLink';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { HOW_IT_WORKS_STEPS } from '@/lib/landing/how-it-works';

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    'Expliquez votre situation, répondez aux questions utiles, puis relisez et validez un courrier adapté. Assistant ne fait rien à votre place.',
  alternates: { canonical: '/comment-ca-marche' },
};

const dossierPoints = [
  'Assistant mémorise les informations utiles de votre dossier.',
  'Le courrier reste éditable, à tout moment.',
  'Reprenez votre travail plus tard, là où vous l’aviez laissé.',
  'Réutilisez vos informations et vos destinataires.',
];

const controlPoints = [
  {
    t: 'Validation humaine',
    d: 'Rien n’est utilisé avant que vous ne relisiez et validiez le courrier.',
  },
  {
    t: 'Aucun envoi automatique',
    d: 'Aucune action ni aucun envoi n’est effectué sans votre accord.',
  },
  {
    t: 'Compte sécurisé',
    d: 'Connexion, vérification d’e-mail et dossiers rattachés à votre compte.',
  },
];

export default function CommentCaMarchePage() {
  return (
    <main className="min-h-screen bg-ivory">
      <Header variant="marketing" />
      <article className="mx-auto w-full max-w-[1160px] px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">Comment ça marche</p>
        <h1 className="mt-2 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem]">
          De votre problème à un courrier prêt, en quatre étapes.
        </h1>
        <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
          Pas besoin de connaître les termes administratifs. Expliquez simplement ce que vous souhaitez
          obtenir : Assistant clarifie la démarche, pose les questions utiles, puis rédige avec vous.
        </p>

        <ol className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <li key={step.n}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-mono text-sm text-paper">
                {step.n}
              </span>
              <h2 className="mt-3 font-serif text-lg font-semibold text-ink">{step.t}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.d}</p>
            </li>
          ))}
        </ol>

        <section className="mt-16 grid gap-12 border-t border-line pt-12 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
              Un dossier que vous pouvez reprendre
            </h2>
            <ul className="mt-5 space-y-3.5">
              {dossierPoints.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-ink">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs text-primary">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
              Vous restez aux commandes
            </h2>
            <div className="mt-5 space-y-4">
              {controlPoints.map((item) => (
                <div key={item.t}>
                  <h3 className="font-medium text-ink">{item.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Assistant vous accompagne dans la rédaction ; il ne remplace pas un avocat ni un conseiller
              juridique.
            </p>
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-line bg-paper p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">Crédits</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            15 crédits sont offerts chaque jour — de quoi analyser une situation et rédiger un
            courrier. Le quota ne se reporte pas. Si vous avez besoin de plus, les packs (30, 80 ou
            200 crédits) restent disponibles jusqu’à utilisation.
          </p>
          <Link href="/pricing" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">
            Voir les tarifs
          </Link>
        </section>

        <div className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <HeroGenerateLink className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-paper transition hover:-translate-y-px hover:bg-primary-hover" />
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Retour à l’accueil
          </Link>
        </div>
      </article>
      <LandingFooter />
    </main>
  );
}
