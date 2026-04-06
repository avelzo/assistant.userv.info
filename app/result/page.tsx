'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ResultCard } from '@/components/ResultCard';

export default function ResultPage() {
  const [mounted, setMounted] = useState(false);
  const [letter, setLetter] = useState('');
  const [emailVersion, setEmailVersion] = useState('');

  useEffect(() => {
    setLetter(sessionStorage.getItem('generated-letter') || '');
    setEmailVersion(sessionStorage.getItem('generated-email') || '');
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Résultat
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Votre courrier est prêt
            </h1>
          </div>

          <Link
            href="/generate"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Retour
          </Link>
        </div>

        {!mounted ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">Chargement du résultat...</p>
          </div>
        ) : letter ? (
          <ResultCard content={letter} emailVersion={emailVersion} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">
              Aucun contenu généré pour le moment. Retournez à l&apos;accueil pour créer une lettre.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}