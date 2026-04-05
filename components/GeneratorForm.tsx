'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CATEGORIES, TONES } from '@/lib/constants';
import {
  FREE_GENERATIONS,
  addCreditHistoryEntry,
  getUsedGenerations,
  getPaidCredits,
  incrementUsedGenerations,
  consumePaidCredit,
} from '@/lib/storage';

type GenerateResponse = {
  letter: string;
  emailVersion: string;
};

const initialState = {
  category: 'Assurance',
  tone: 'Standard',
  fullName: '',
  recipient: '',
  subject: '',
  details: '',
  attachments: '',
};

export function GeneratorForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedGenerations, setUsedGenerations] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);

  useEffect(() => {
    const refreshUsageState = () => {
      setUsedGenerations(getUsedGenerations());
      setPaidCredits(getPaidCredits());
    };

    refreshUsageState();

    const handleCreditsUpdated = () => {
      refreshUsageState();
    };

    window.addEventListener('credits-updated', handleCreditsUpdated);
    setMounted(true);

    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated);
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    const sessionFullName = session?.user?.name?.trim() || '';
    if (!sessionFullName) {
      return;
    }

    setForm((prev) => {
      if (prev.fullName.trim()) {
        return prev;
      }

      return {
        ...prev,
        fullName: sessionFullName,
      };
    });
  }, [session?.user?.name, status]);

  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const freeLeft = Math.max(0, FREE_GENERATIONS - usedGenerations);
  const canGenerate = freeLeft > 0 || paidCredits > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.details.trim()) {
      setError('Veuillez décrire la situation.');
      return;
    }

    if (!mounted) return;

    if (!canGenerate) {
      setError('Votre essai gratuit est utilisé. Achetez des crédits ci-dessous.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
      };

      if (!response.ok || !data.letter) {
        throw new Error(data.error || 'Impossible de générer le courrier.');
      }

      if (freeLeft > 0) {
        const nextUsed = incrementUsedGenerations();
        setUsedGenerations(nextUsed);
      } else if (paidCredits > 0) {
        const nextCredits = consumePaidCredit();
        setPaidCredits(nextCredits);
        addCreditHistoryEntry({
          type: 'consume',
          credits: 1,
          source: 'generation',
          label: 'Génération d\'une lettre',
        });
        window.dispatchEvent(new Event('credits-updated'));
      }

      sessionStorage.setItem('generated-letter', data.letter);
      sessionStorage.setItem('generated-email', data.emailVersion || '');

      router.push('/result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Générateur de courrier
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            1 essai gratuit, puis paiement à l&apos;unité.
          </p>
        </div> */}

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {!mounted
            ? 'Chargement...'
            : freeLeft > 0
              ? `Essais gratuits restants : ${freeLeft}`
              : `Crédits : ${paidCredits}`}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Catégorie
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-0 focus:border-blue-500"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Ton du courrier
          <select
            value={form.tone}
            onChange={(e) => updateField('tone', e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-0 focus:border-blue-500"
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Votre nom
          <input
            value={form.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="Ex: Laurent Hunaut"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Destinataire
          <input
            value={form.recipient}
            onChange={(e) => updateField('recipient', e.target.value)}
            placeholder="Ex: CAF de Paris"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Objet
        <input
          value={form.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          placeholder="Ex: Demande de réexamen de dossier"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Décrivez votre situation
        <textarea
          value={form.details}
          onChange={(e) => updateField('details', e.target.value)}
          placeholder="Expliquez le contexte, la demande, les dates utiles, les références de dossier, ce que vous attendez comme réponse..."
          rows={8}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Pièces jointes / justificatifs
        <input
          value={form.attachments}
          onChange={(e) => updateField('attachments', e.target.value)}
          placeholder="Ex: carte d'identité, quittance de loyer, attestation employeur"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !mounted}
        className="w-full rounded-xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Génération en cours...' : 'Générer ma lettre'}
      </button>
    </form>
  );
}