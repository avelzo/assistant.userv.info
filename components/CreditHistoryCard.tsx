'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCreditHistory, getPaidCredits, type CreditHistoryEntry } from '@/lib/storage';

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

export function CreditHistoryCard() {
  const [mounted, setMounted] = useState(false);
  const [paidCredits, setPaidCredits] = useState(0);
  const [history, setHistory] = useState<CreditHistoryEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      setPaidCredits(getPaidCredits());
      setHistory(getCreditHistory());
    };

    refresh();
    window.addEventListener('credits-updated', refresh);
    setMounted(true);

    return () => {
      window.removeEventListener('credits-updated', refresh);
    };
  }, []);

  const recentEntries = useMemo(() => history.slice(0, 8), [history]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Historique de crédits</h3>
          <p className="mt-1 text-sm text-slate-500">
            Retrouvez vos achats et vos utilisations récentes en un coup d'oeil.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {mounted ? `Crédits disponibles : ${paidCredits}` : 'Chargement...'}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        {recentEntries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Aucun mouvement de crédits pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{entry.label}</p>
                  <p className="text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    entry.type === 'purchase'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {entry.type === 'purchase' ? `+${entry.credits}` : `-${entry.credits}`} crédit
                  {entry.credits > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
