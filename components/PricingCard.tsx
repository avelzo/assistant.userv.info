'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/auth-client';
import { getAccountProfile } from '@/lib/storage';
import { approximatePackUsage, getDailyFreeCredits } from '@/lib/credits/config';

type Pack = {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
  highlighted: boolean;
};

type PricingCardProps = {
  variant?: 'default' | 'home';
  enableCheckout?: boolean;
};

export function PricingCard({ variant = 'default', enableCheckout = true }: PricingCardProps) {
  const router = useRouter();
  const { data: session } = useAuthSession();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const sessionName = session?.user?.name?.trim() || '';
  const sessionNameParts = sessionName ? sessionName.split(/\s+/) : [];
  const sessionFirstname = sessionNameParts[0] || '';
  const sessionLastname = sessionNameParts.slice(1).join(' ');
  const sessionEmail = session?.user?.email?.trim().toLowerCase() || '';
  const profile = getAccountProfile();
  const account = {
    firstname: profile.firstname || sessionFirstname,
    lastname: profile.lastname || sessionLastname,
    email: sessionEmail || profile.email,
  };

  useEffect(() => {
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
  }, [sessionEmail, sessionFirstname, sessionLastname]);

  const dailyFree = getDailyFreeCredits();
  const helperText = useMemo(() => {
    if (!session?.user?.email) {
      return 'Connectez-vous pour acheter un pack et rattacher les crédits à votre compte.';
    }

    if (account.email) {
      return `Les crédits achetés seront rattachés au compte ${account.email}.`;
    }

    return 'Ajoutez votre email dans votre compte avant paiement pour retrouver automatiquement vos crédits.';
  }, [account.email, session?.user?.email]);

  const startCheckout = async (packId: string) => {
    if (!session?.user?.email) {
      router.push('/auth/login?callbackUrl=/pricing');
      return;
    }

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

      window.location.assign(data.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setLoadingPackId(null);
    }
  };

  const sectionClassName =
    variant === 'home'
      ? 'p-6 md:p-8'
      : 'rounded-2xl border border-line bg-paper p-6 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]';

  return (
    <section className={sectionClassName}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:w-1/2">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Packs de crédits</p>
          <h3 className="mt-1 font-serif text-2xl font-semibold text-ink">Choisissez selon vos démarches</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {dailyFree} crédits sont offerts chaque jour (environ un courrier). Les packs restent disponibles
            jusqu’à utilisation. Plus le pack est grand, plus le crédit est avantageux.
          </p>
          <p className="mt-1 text-xs text-muted">{helperText}</p>
        </div>
        <div className="grid w-full gap-3 md:w-full md:grid-cols-3">
          {loadingPacks
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`pack-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-line bg-paper px-3 pt-3 pb-10 shadow-xs w-full"
                  aria-hidden="true"
                >
                  <div className="h-4 w-full rounded-sm bg-desk animate-pulse" />
                  <div className="mt-3 h-6 w-full rounded-sm bg-desk animate-pulse" />
                </div>
              ))
            : null}
          {packs.map((pack) => {
            const usage = approximatePackUsage(pack.credits);
            return (
            <button
              key={pack.id}
              onClick={() => startCheckout(pack.id)}
              disabled={loadingPackId !== null || loadingPacks}
              className="rounded-2xl border border-line bg-ivory px-2 py-3 text-center shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-semibold text-ink">{pack.credits} crédits</span>
              <span className="mt-1 block text-xs text-muted">
                ≈ {usage.letters} lettre{usage.letters > 1 ? 's' : ''} ou {usage.questions} questions
              </span>
              <span className="mt-2 block text-xl text-ink">
                {(pack.priceCents / 100).toFixed(2)} €
              </span>
              {pack.highlighted ? (
                <span className="mt-2 block border-t border-line pt-1 text-xs font-semibold uppercase tracking-wide text-accent">
                  Populaire
                </span>
              ) : (
                <span className="mt-2 block pt-1">&nbsp;</span>
              )}
              {loadingPackId === pack.id ? (
                <span className="mt-2 block text-xs text-primary">Redirection vers le paiement...</span>
              ) : null}
            </button>
            );
          })}
          {!loadingPacks && packs.length === 0 ? (
            <div className="col-span-3 px-3 py-2 flex items-center justify-center">
              <p className="text-xs text-muted">Aucun pack disponible pour le moment.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
