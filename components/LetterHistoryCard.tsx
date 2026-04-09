'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type LetterHistoryEntry = {
  id: string;
  category: string;
  recipient: string;
  subject: string;
  detailsPreview: string;
  letter: string;
  emailVersion: string;
  createdAt: string;
};

type AccountLettersResponse = {
  generations?: LetterHistoryEntry[];
  error?: string;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function LetterHistoryCard() {
  const router = useRouter();
  const { status } = useSession();
  const [entries, setEntries] = useState<LetterHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const handleViewResult = (entry: LetterHistoryEntry) => {
    if (typeof window === 'undefined') return;

    window.sessionStorage.setItem('generated-letter', entry.letter);
    window.sessionStorage.setItem('generated-email', entry.emailVersion || '');
    router.push('/result');
  };

  useEffect(() => {
    const loadLetters = async () => {
      if (status === 'unauthenticated') {
        setEntries([]);
        setLoading(false);
        return;
      }

      if (status !== 'authenticated') {
        return;
      }

      try {
        setLoading(true);

        const response = await fetch('/api/account', { method: 'GET' });
        const data = (await response.json()) as AccountLettersResponse;

        if (!response.ok || !Array.isArray(data.generations)) {
          setEntries([]);
          return;
        }

        setEntries(data.generations);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    void loadLetters();
  }, [status]);

  const recentEntries = useMemo(() => entries.slice(0, 12), [entries]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Historique des lettres</h3>
          <p className="mt-1 text-sm text-slate-500">
            Consultez vos dernières lettres générées et rouvrez le résultat courrier et email.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {recentEntries.length} lettre{recentEntries.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Chargement de l&apos;historique...</p>
        ) : recentEntries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Aucune lettre générée n&apos;est encore associée à votre compte.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm" aria-label="Historique des lettres générées">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Lettre</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Destinataire</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{entry.category}</p>
                      <p className="mt-1 text-slate-600">
                        {entry.subject || entry.detailsPreview || 'Sans objet renseigné'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {entry.recipient || 'Non renseigné'}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleViewResult(entry)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Voir courrier + email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}