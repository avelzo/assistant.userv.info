'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAccountProfile } from '@/lib/storage';

type Pack = {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
  highlighted: boolean;
};

export function PricingCard() {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [account, setAccount] = useState({ firstname: '', lastname: '', email: '' });
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    setAccount(getAccountProfile());

    const loadPacks = async () => {
      try {
        const response = await fetch('/api/packs');
        const data = (await response.json()) as {
          packs?: Array<{
            code: string;
            label: string;
            credits: number;
            priceCents: number;
            highlighted: boolean;
          }>;
        };

        if (!response.ok || !data.packs) {
          throw new Error('Impossible de charger les packs.');
        }

        setPacks(
          data.packs.map((pack) => ({
            id: pack.code,
            label: pack.label,
            credits: pack.credits,
            priceCents: pack.priceCents,
            highlighted: pack.highlighted,
          }))
        );
      } catch {
        setPacks([]);
      } finally {
        setLoadingPacks(false);
      }
    };

    void loadPacks();
  }, []);

  const helperText = useMemo(() => {
    if (account.email) {
      return `Crédits liés à ${account.email}.`;
    }

    return 'Ajoutez votre email dans la page Compte pour lier vos crédits.';
  }, [account.email]);

  const startCheckout = async (packId: string) => {
    try {
      setLoadingPackId(packId);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId,
          email: account.email,
          firstname: account.firstname,
          lastname: account.lastname,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Impossible de démarrer le paiement.');
      }

      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setLoadingPackId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="md:w-1/2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Offre lancement</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">Crédits de génération après l&apos;essai gratuit</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Choisissez un pack de crédits pour continuer à générer vos lettres, versions email et PDF.
          </p>
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        </div>
        <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
          {loadingPacks
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`pack-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  aria-hidden="true"
                >
                  <div className="h-4 w-11 rounded bg-slate-200/90 animate-pulse" />
                  <div className="mt-3 h-6 w-11 rounded bg-slate-200/90 animate-pulse" />
                </div>
              ))
            : null}
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => startCheckout(pack.id)}
              disabled={loadingPackId !== null || loadingPacks}
              className="rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-semibold text-slate-700">{pack.label}</span>
              <span className="mt-2 block text-xl text-slate-500">
                {(pack.priceCents / 100).toFixed(2)} €
              </span>
              {pack.highlighted ? (
                <span className="mt-2 pt-1 border-t block text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Populaire
                </span>
              ) : <span className="mt-2 pt-1">&nbsp;</span>}
              {loadingPackId === pack.id ? (
                <span className="mt-2 block text-xs text-blue-700">Redirection...</span>
              ) : null}
            </button>
          ))}
          {/* {
            Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`pack-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  aria-hidden="true"
                >
                  <div className="h-4 w-11 rounded bg-slate-200/90 animate-pulse" />
                  <div className="mt-3 h-6 w-11 rounded bg-slate-200/90 animate-pulse" />
                </div>
              ))
          } */}
          {!loadingPacks && packs.length === 0 ? (
            <p className="text-xs text-slate-600">Aucun pack disponible pour le moment.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
