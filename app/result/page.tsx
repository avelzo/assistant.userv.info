'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResultCard } from '@/components/ResultCard';

export default function ResultPage() {
  const router = useRouter();
  const [letter] = useState(() => {
  if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('generated-letter') || '';
  });

  const [emailVersion] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('generated-email') || '';
  });

  const handleBack = () => {
    if (typeof window === 'undefined') {
      router.push('/generate');
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/generate');
  };


  return (
    <main className="min-h-screen bg-ivory px-6 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Résultat
            </p>
            <h1 className="font-serif text-3xl font-semibold text-ink">
              Votre courrier est prêt
            </h1>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            Retour
          </button>
        </div>

        {letter ? (
          <ResultCard content={letter} emailVersion={emailVersion} />
        ) : (
          <div className="rounded-2xl border border-line bg-paper p-6">
            <p className="text-muted">
              Aucun contenu généré pour le moment. Retournez à l&apos;accueil pour créer une lettre.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}