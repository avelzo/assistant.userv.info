'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/lib/auth-client';
import {
  getCreditHistory,
  getPaidCredits,
  setCreditHistory,
  setPaidCredits,
  type CreditHistoryEntry,
} from '@/lib/storage';
import { getDailyFreeCredits } from '@/lib/credits/config';

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

type AccountSummaryResponse = {
  account?: {
    credits: number;
    freeCredits?: number;
    paidCredits?: number;
    dailyFreeLimit?: number;
  };
  history?: CreditHistoryEntry[];
};

export function CreditHistoryCard() {
  const { status } = useAuthSession();

  const [paidCredits, setPaidCreditsState] = useState(0);
  const [freeCredits, setFreeCredits] = useState(0);
  const [dailyFreeLimit, setDailyFreeLimit] = useState(getDailyFreeCredits);
  const [history, setHistoryState] = useState<CreditHistoryEntry[]>(() => getCreditHistory());

  useEffect(() => {
    const refreshFromLocal = () => {
      setPaidCreditsState(getPaidCredits());
      setHistoryState(getCreditHistory());
    };

    const syncFromServer = async () => {
      if (status !== 'authenticated') {
        return;
      }

      try {
        const response = await fetch('/api/account', { method: 'GET' });
        const data = (await response.json()) as AccountSummaryResponse;

        if (!response.ok || !data.account) {
          return;
        }

        const paid = Math.max(0, Number(data.account.paidCredits ?? data.account.credits) || 0);
        const free = Math.max(0, Number(data.account.freeCredits) || 0);
        setPaidCredits(paid);
        setPaidCreditsState(paid);
        setFreeCredits(free);
        setDailyFreeLimit(data.account.dailyFreeLimit ?? getDailyFreeCredits());

        if (Array.isArray(data.history)) {
          const nextHistory = setCreditHistory(data.history);
          setHistoryState(nextHistory);
        }
      } catch {
        refreshFromLocal();
      }
    };

    const handleCreditsUpdated = () => {
      void syncFromServer();
    };

    void syncFromServer();
    window.addEventListener('credits-updated', handleCreditsUpdated);

    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated);
    };
  }, [status]);

  const recentEntries = useMemo(() => history.slice(0, 8), [history]);

  return (
    <section className="rounded-2xl border border-line bg-paper p-6 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink">Historique de crédits</h3>
          <p className="mt-1 text-sm text-muted">
            Retrouvez vos achats et vos utilisations récentes en un coup d&apos;œil.
          </p>
        </div>

        <span className="rounded-full bg-ivory px-3 py-1 text-sm font-semibold text-ink">
          Gratuits {freeCredits} / {dailyFreeLimit} · Achetés {paidCredits}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        {recentEntries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">
            Aucun mouvement de crédits pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{entry.label}</p>
                  <p className="text-xs text-muted">{formatDate(entry.createdAt)}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    entry.type === 'purchase'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-accent/12 text-accent'
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