'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/auth-client';
import { AI_CREDIT_COSTS, getDailyFreeCredits, type AiCreditOperation } from '@/lib/credits/config';

export type CreditsState = {
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  nextFreeResetAt: string | null;
  dailyFreeLimit: number;
  costs: Record<AiCreditOperation, number>;
};

const defaultCosts = { ...AI_CREDIT_COSTS };

export function useCredits(): CreditsState & { loading: boolean } {
  const { status } = useAuthSession();
  const [state, setState] = useState<CreditsState>({
    freeCredits: 0,
    paidCredits: 0,
    totalCredits: 0,
    nextFreeResetAt: null,
    dailyFreeLimit: getDailyFreeCredits(),
    costs: defaultCosts,
  });
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/credits/balance');
        const data = (await response.json()) as Partial<CreditsState> & { error?: string };
        if (!response.ok || cancelled) {
          return;
        }
        setState({
          freeCredits: data.freeCredits ?? 0,
          paidCredits: data.paidCredits ?? 0,
          totalCredits: data.totalCredits ?? 0,
          nextFreeResetAt: data.nextFreeResetAt ?? null,
          dailyFreeLimit: data.dailyFreeLimit ?? getDailyFreeCredits(),
          costs: { ...defaultCosts, ...(data.costs || {}) },
        });
      } finally {
        if (!cancelled) {
          setFetched(true);
        }
      }
    };

    void load();
    const onUpdate = () => {
      void load();
    };
    window.addEventListener('credits-updated', onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('credits-updated', onUpdate);
    };
  }, [status]);

  return {
    ...state,
    loading: status === 'loading' || (status === 'authenticated' && !fetched),
  };
}

export function formatResetLabel(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    timeZone: 'Europe/Paris',
  });
  return `Renouvellement ${day} à ${time}`;
}
