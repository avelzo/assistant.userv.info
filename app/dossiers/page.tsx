import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { DossierList } from '@/components/dossiers/DossierList';
import { getAuthSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Mes dossiers',
  description: 'Retrouvez vos démarches et ouvrez un dossier pour continuer.',
};

export default async function DossiersPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect('/auth/login?callbackUrl=/dossiers');
  }

  return (
    <main className="min-h-screen bg-ivory">
      <Header />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">Historique</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">Mes dossiers</h1>
          <p className="mt-2 text-sm text-muted">Chaque dossier reste disponible, même s’il n’est pas terminé.</p>
        </div>
        <DossierList />
      </section>
    </main>
  );
}
