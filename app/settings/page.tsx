import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Paramètres',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-ivory">
      <Header />
      <section className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="font-serif text-3xl text-ink">Paramètres</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Aucune préférence n’est encore disponible. Cette page est conservée pour plus tard.
        </p>
        <Link href="/account" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Aller au compte
        </Link>
      </section>
    </main>
  );
}
