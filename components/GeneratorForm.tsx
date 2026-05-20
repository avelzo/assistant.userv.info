'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CATEGORIES, TONES } from '@/lib/constants';
import {
  addCreditHistoryEntry,
  consumePaidCredit,
  getPaidCredits,
} from '@/lib/storage';

type GenerateResponse = {
  letter: string;
  emailVersion: string;
  billingType?: string;
  remainingCredits?: number;
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

  const sessionFullName =
    status === 'authenticated' && session?.user?.name
      ? session.user.name.trim()
      : '';

  const [form, setForm] = useState(() => ({
    ...initialState,
    fullName: sessionFullName,
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freeGenerationsRemaining, setFreeGenerationsRemaining] = useState(0);
  const [paidCredits, setPaidCredits] = useState(() => getPaidCredits());

  const isSessionLoading = status === 'loading';

  useEffect(() => {
    const refreshUsageState = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/user/status');
          const data = (await response.json()) as {
            freeGenerationsRemaining?: number;
            paidCredits?: number;
          };
          if (response.ok && typeof data.freeGenerationsRemaining === 'number') {
            setFreeGenerationsRemaining(data.freeGenerationsRemaining);
          }
          if (typeof data.paidCredits === 'number') {
            setPaidCredits(data.paidCredits);
          }
        } catch (err) {
          console.error('Erreur lors de la récupération du statut utilisateur:', err);
        }
      } else {
        setPaidCredits(getPaidCredits());
      }
    };
    refreshUsageState();
    const handleCreditsUpdated = () => {
      refreshUsageState();
    };
    window.addEventListener('credits-updated', handleCreditsUpdated);
    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated);
    };
  }, [session?.user?.email]);


  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canGenerate = freeGenerationsRemaining > 0 || paidCredits > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.details.trim()) {
      setError('Veuillez décrire la situation.');
      return;
    }

    if (isSessionLoading) return;

    if (!canGenerate) {
      setError('Votre essai gratuit est utilisé. Achetez des crédits ci-dessous.');
      router.push('/pricing');
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

      if (typeof data.remainingCredits === 'number') {
        setPaidCredits(data.remainingCredits);
        window.dispatchEvent(new Event('credits-updated'));
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
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Générateur de courrier
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            1 essai gratuit par compte, puis paiement à l&apos;unité.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {isSessionLoading
            ? 'Chargement...'
            : freeGenerationsRemaining > 0
              ? `Générations gratuites : ${freeGenerationsRemaining}`
              : `Crédits : ${paidCredits}`}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Catégorie
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden ring-0 focus:border-blue-500"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Ton
          <select
            value={form.tone}
            onChange={(e) => updateField('tone', e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden ring-0 focus:border-blue-500"
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
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden focus:border-blue-500"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Destinataire
          <input
            value={form.recipient}
            onChange={(e) => updateField('recipient', e.target.value)}
            placeholder="Ex: CAF de Paris"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Objet
        <input
          value={form.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          placeholder="Ex: Demande de réexamen de dossier"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden focus:border-blue-500"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Décrivez votre situation
        <textarea
          value={form.details}
          onChange={(e) => updateField('details', e.target.value)}
          placeholder="Expliquez le contexte, la demande, les dates utiles, les références de dossier, ce que vous attendez comme réponse..."
          rows={8}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden focus:border-blue-500"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Pièces jointes / justificatifs
        <input
          value={form.attachments}
          onChange={(e) => updateField('attachments', e.target.value)}
          placeholder="Ex: carte d'identité, quittance de loyer, attestation employeur"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-hidden focus:border-blue-500"
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || isSessionLoading}
        className="w-full rounded-xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Génération en cours...' : 'Générer ma lettre'}
      </button>
    </form>
  );
}
