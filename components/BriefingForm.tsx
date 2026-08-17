'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BriefingForm() {
  const router = useRouter();
  const [objective, setObjective] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!objective.trim()) {
      setError('Indiquez ce que vous souhaitez obtenir.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: objective.trim(),
          recipientName: recipientName.trim(),
          context: context.trim(),
        }),
      });
      const data = (await response.json()) as { dossier?: { id: string }; error?: string };
      if (!response.ok || !data.dossier?.id) {
        throw new Error(data.error || 'Impossible de créer le dossier.');
      }
      router.push(`/dossiers/${data.dossier.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erreur inattendue.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-line bg-paper p-6 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink">Que souhaitez-vous obtenir ?</span>
        <textarea
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          rows={3}
          maxLength={2000}
          required
          placeholder="Je veux récupérer les 850 € de dépôt de garantie que mon ancien propriétaire ne m’a toujours pas rendus."
          className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-sm leading-6 text-ink outline-hidden focus:border-primary"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink">À qui vous adressez-vous ?</span>
        <input
          value={recipientName}
          onChange={(event) => setRecipientName(event.target.value)}
          maxLength={200}
          placeholder="Nom, organisme ou service"
          className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-sm text-ink outline-hidden focus:border-primary"
        />
        <span className="block text-xs text-muted">
          Administration, entreprise, propriétaire… Assistant pourra l’inférer si besoin.
        </span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink">Que savez-vous déjà ou que s’est-il passé ?</span>
        <textarea
          value={context}
          onChange={(event) => setContext(event.target.value)}
          rows={5}
          maxLength={8000}
          placeholder="Dates, montants, échanges déjà effectués, pièces dont vous disposez…"
          className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-sm leading-6 text-ink outline-hidden focus:border-primary"
        />
      </label>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-paper transition hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? 'Création du dossier…' : 'Créer mon dossier'}
      </button>
      <p className="text-xs leading-5 text-muted">
        Vous pourrez y revenir plus tard, même si la démarche n’est pas terminée. Assistant vous guide ;
        vous restez responsable du courrier envoyé.
      </p>
    </form>
  );
}
