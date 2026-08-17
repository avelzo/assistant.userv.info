import Link from 'next/link';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-ivory">
      <Header variant="marketing" />
      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6 lg:px-8">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">Informations légales</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-7 text-ink">{children}</div>
        <p className="mt-10 text-xs text-muted">
          <Link href="/" className="hover:text-ink">
            Retour à l’accueil
          </Link>
        </p>
      </article>
      <LandingFooter />
    </main>
  );
}
