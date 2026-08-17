import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { PaymentFlag } from '@/components/PaymentFlag';
import { HeroGenerateLink } from '@/components/HeroGenerateLink';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { HOW_IT_WORKS_STEPS } from '@/lib/landing/how-it-works';

export const metadata: Metadata = {
  title: 'Trouvez les bons mots. Faites le bon courrier.',
  description:
    'Expliquez simplement ce que vous souhaitez obtenir. Assistant vous aide à comprendre la démarche, vous pose les questions utiles et rédige avec vous un courrier adapté.',
  alternates: {
    canonical: '/',
  },
};

const problems = [
  { cat: 'Logement', ex: 'Mon propriétaire ne me rend pas ma caution.' },
  { cat: 'Facture', ex: 'Je veux contester une facture que je ne comprends pas.' },
  { cat: 'Administration', ex: 'Je dois répondre à un courrier administratif.' },
  { cat: 'Assurance', ex: 'Mon assurance refuse de me rembourser.' },
  { cat: 'Travail', ex: 'Je dois faire une demande à mon employeur.' },
  { cat: 'Banque', ex: 'Je veux contester des frais bancaires.' },
];

const rewriteActions = ['Reformuler', 'Plus formel', 'Plus ferme', 'Plus cordial', 'Simplifier', 'Demander à l’IA…'];

export default function HomePage() {
  return (
    <main id="top" className="min-h-screen bg-ivory">
      <Header variant="marketing" />

      <div className="relative z-40 mx-auto flex w-full max-w-290 justify-center px-5 pt-3 lg:px-8">
        <PaymentFlag />
      </div>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(107,100,88,0.16) 1px, transparent 1.6px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, #000 40%, transparent 100%)',
          }}
        />
        <div className="relative mx-auto max-w-290 px-5 pb-16 pt-12 sm:pt-16 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-serif text-lg italic text-accent">Vous avez une démarche à faire ?</p>
            <h1 className="mt-2 font-serif text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3.25rem] lg:text-[3.4rem]">
              Trouvez les bons mots.
              <br />
              Faites le bon courrier.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">
              Expliquez simplement ce que vous souhaitez obtenir. Assistant vous aide à comprendre la
              démarche, vous pose les questions utiles et rédige avec vous un courrier adapté.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <HeroGenerateLink className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-paper transition hover:-translate-y-px hover:bg-primary-hover" />
              <Link
                href="/comment-ca-marche"
                className="rounded-full border border-line bg-paper px-5 py-3 text-sm text-ink hover:border-primary/40"
              >
                Voir comment ça marche
              </Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Vous gardez toujours le contrôle et validez votre courrier avant utilisation.
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="comment" className="border-t border-line bg-paper/50">
        <div className="mx-auto max-w-290 px-5 py-16 lg:px-8 lg:py-20">
          <div className="max-w-lg">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Comment ça marche</p>
            <h2 className="mt-2 font-serif text-[1.85rem] font-semibold tracking-tight text-ink sm:text-[2rem]">
              De votre problème à un courrier prêt, en quatre étapes.
            </h2>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.n}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-mono text-sm text-paper">
                  {step.n}
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-ink">{step.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.d}</p>
              </div>
            ))}
          </div>
          <Link
            href="/comment-ca-marche"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            En savoir plus
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-290 px-5 py-16 lg:px-8 lg:py-20">
        <div className="max-w-xl">
          <h2 className="font-serif text-[1.85rem] font-semibold tracking-tight text-ink sm:text-[2rem]">
            Commencez par votre problème, pas par un modèle de courrier.
          </h2>
          <p className="mt-3 text-muted">
            Choisissez la situation qui ressemble à la vôtre — Assistant s’occupe de la démarche.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem) => (
            <Link
              key={problem.cat}
              href="/generate"
              className="group flex flex-col rounded-2xl border border-line bg-paper p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-24px_rgba(44,88,80,0.35)]"
            >
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-accent">{problem.cat}</span>
              <p className="mt-2 font-serif text-lg leading-snug text-ink">« {problem.ex} »</p>
              <span className="mt-4 text-sm text-primary sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                Commencer cette démarche
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper/50">
        <div className="mx-auto grid max-w-290 gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <h2 className="font-serif text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-[1.9rem]">
              Plus qu’une réponse IA : un dossier que vous pouvez reprendre.
            </h2>
            <ul className="mt-6 space-y-3.5">
              {[
                'Assistant mémorise les informations utiles de votre dossier.',
                'Le courrier reste éditable, à tout moment.',
                'Reprenez votre travail plus tard, là où vous l’aviez laissé.',
                'Réutilisez vos informations et vos destinataires.',
              ].map((item) => (
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
            <h2 className="font-serif text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-[1.9rem]">
              L’IA vous aide. Elle ne prend pas votre place.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Modifiez librement votre courrier, ou demandez à Assistant de retravailler uniquement le
              passage que vous souhaitez. Le document final reste le vôtre.
            </p>
            <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-[0_18px_50px_-30px_rgba(44,88,80,0.35)] sm:p-6">
              <p className="font-serif text-[0.92rem] leading-[1.7] text-ink">
                À ce jour, malgré ma relance du 25 juillet 2026,{' '}
                <span className="rounded bg-accent/25 px-0.5 ring-1 ring-accent/40">
                  cette somme ne m’a pas été reversée
                </span>
                . Je vous demande de bien vouloir procéder à sa restitution.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-ivory p-1.5">
                {rewriteActions.map((action, index) => (
                  <span
                    key={action}
                    className={`rounded-lg px-2.5 py-1.5 text-[0.8rem] ${
                      index === rewriteActions.length - 1 ? 'text-primary' : 'text-ink'
                    }`}
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-290 px-5 py-16 lg:px-8 lg:py-20">
        <p className="text-sm font-medium text-primary">Confiance</p>
        <h2 className="mt-3 max-w-xl font-serif text-[1.85rem] font-semibold tracking-tight text-ink sm:text-[2rem]">
          Vos démarches restent entre vos mains.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              t: 'Validation humaine',
              d: 'Rien n’est utilisé avant que vous ne relisiez et validiez le courrier.',
            },
            {
              t: 'Historique personnel',
              d: 'Vos dossiers restent accessibles dans votre espace, pour reprendre plus tard.',
            },
            {
              t: 'Compte sécurisé',
              d: 'Connexion, vérification d’e-mail et dossiers rattachés à votre compte.',
            },
            {
              t: 'Aucun envoi automatique',
              d: 'Aucune action ni aucun envoi n’est effectué sans votre accord.',
            },
          ].map((item) => (
            <div key={item.t} className="rounded-2xl border border-line bg-paper p-5">
              <h3 className="font-medium text-ink">{item.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">
          Assistant vous accompagne dans la rédaction ; il ne remplace pas un avocat ni un conseiller
          juridique.
        </p>
      </section>

      <section id="tarifs" className="border-t border-line bg-paper/50">
        <div className="mx-auto flex max-w-290 flex-col items-start gap-6 px-5 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-serif text-[1.5rem] font-semibold tracking-tight text-ink sm:text-[1.6rem]">
              15 crédits offerts, chaque jour.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              De quoi analyser une situation et rédiger un courrier. Le quota ne se reporte pas.
              Besoin de plus ? Les packs restent disponibles jusqu’à utilisation, et le crédit
              devient plus avantageux sur les plus gros packs.
            </p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 rounded-full border border-line bg-ivory px-5 py-2.5 text-sm font-medium text-ink hover:border-primary/40"
          >
            Voir les tarifs
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-290 px-5 py-16 lg:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-paper lg:px-16 lg:py-20">
          <h2 className="font-serif text-[2rem] font-semibold tracking-tight sm:text-[2.2rem]">
            Une démarche à faire ?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-paper/85">
            Expliquez votre situation. Assistant vous aide à passer de votre problème à un courrier
            clair et prêt à être utilisé.
          </p>
          <HeroGenerateLink className="relative mt-7 inline-block rounded-full bg-paper px-6 py-3 text-sm font-medium text-primary transition hover:-translate-y-px hover:bg-white" />
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
