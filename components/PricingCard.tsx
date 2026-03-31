'use client';

import { useState } from 'react';

export function PricingCard() {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Impossible de démarrer le paiement.');
      }

      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Offre lancement</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{(parseInt(process.env.NEXT_PUBLIC_PRICE_PER_GENERATION || '099') / 100).toFixed(2)} € pour débloquer la génération premium</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            À utiliser après votre essai gratuit. Vous pourrez ensuite copier votre lettre, récupérer le PDF et obtenir une version email prête à envoyer.
          </p>
        </div>
        <button
          onClick={startCheckout}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Redirection...' : 'Débloquer maintenant'}
        </button>
      </div>
    </section>
  );
}
