'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/auth-client';
import { CATEGORIES, TONES } from '@/lib/constants';
import { AI_CREDIT_COSTS, getDailyFreeCredits } from '@/lib/credits/config';

type GenerateResponse = {
  letter: string;
  emailVersion: string;
  billingType?: string;
  remainingCredits?: number;
  freeCredits?: number;
  paidCredits?: number;
  creditsCharged?: number;
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
  const { data: session, status } = useAuthSession();

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
  const [freeCredits, setFreeCredits] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [dailyFreeLimit, setDailyFreeLimit] = useState(getDailyFreeCredits);
  const [nextFreeResetAt, setNextFreeResetAt] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const isSessionLoading = status === 'loading';

  useEffect(() => {
    const refreshUsageState = async () => {
      if (!session?.user?.email) {
        return;
      }
      try {
        const response = await fetch('/api/credits/balance');
        const data = (await response.json()) as {
          freeCredits?: number;
          paidCredits?: number;
          dailyFreeLimit?: number;
          nextFreeResetAt?: string;
        };
        if (!response.ok) {
          return;
        }
        if (typeof data.freeCredits === 'number') setFreeCredits(data.freeCredits);
        if (typeof data.paidCredits === 'number') setPaidCredits(data.paidCredits);
        if (typeof data.dailyFreeLimit === 'number') setDailyFreeLimit(data.dailyFreeLimit);
        if (typeof data.nextFreeResetAt === 'string') setNextFreeResetAt(data.nextFreeResetAt);
      } catch {
        // Le serveur reste la source de vérité au moment de la génération.
      }
    };
    void refreshUsageState();
    const handleCreditsUpdated = () => {
      void refreshUsageState();
    };
    window.addEventListener('credits-updated', handleCreditsUpdated);
    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated);
    };
  }, [session?.user?.email]);


  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const letterCost = AI_CREDIT_COSTS.GENERATE_LETTER;
  const totalCredits = freeCredits + paidCredits;
  const canGenerate = totalCredits >= letterCost;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.details.trim()) {
      setError('Veuillez décrire la situation.');
      return;
    }

    if (isSessionLoading) return;

    if (!canGenerate) {
      setError('Crédits insuffisants. Achetez un pack ci-dessous ou attendez le renouvellement quotidien.');
      router.push('/pricing');
      return;
    }

    const key = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    setIdempotencyKey(key);

    try {
      setLoading(true);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({ ...form, idempotencyKey: key }),
      });

      const data = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
      };

      if (!response.ok || !data.letter) {
        throw new Error(data.error || 'Impossible de générer le courrier.');
      }

      if (typeof data.freeCredits === 'number') setFreeCredits(data.freeCredits);
      if (typeof data.paidCredits === 'number') setPaidCredits(data.paidCredits);
      window.dispatchEvent(new Event('credits-updated'));
      setIdempotencyKey('');

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
      className="space-y-6 rounded-2xl border border-line bg-paper p-6 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Générateur de courrier
          </h2>
          <p className="mt-1 text-sm text-muted">
            Crédits gratuits renouvelés chaque jour à minuit (Europe/Paris). Coût d’une lettre : {letterCost} crédits.
          </p>
        </div>

        <span className="rounded-full bg-ivory px-3 py-1 text-sm font-medium text-ink">
          {isSessionLoading
            ? 'Chargement...'
            : `Gratuits ${freeCredits} / ${dailyFreeLimit} · Achetés ${paidCredits}`}
        </span>
      </div>
      {nextFreeResetAt ? (
        <p className="text-xs text-muted">
          Renouvellement gratuit : {new Date(nextFreeResetAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-ink">
          Catégorie
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden ring-0 focus:border-primary"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-ink">
          Ton
          <select
            value={form.tone}
            onChange={(e) => updateField('tone', e.target.value)}
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden ring-0 focus:border-primary"
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-ink">
          Votre nom
          <input
            value={form.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="Ex: Laurent Hunaut"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-ink">
          Destinataire
          <input
            value={form.recipient}
            onChange={(e) => updateField('recipient', e.target.value)}
            placeholder="Ex: CAF de Paris"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-ink">
        Objet
        <input
          value={form.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          placeholder="Ex: Demande de réexamen de dossier"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        Décrivez votre situation
        <textarea
          value={form.details}
          onChange={(e) => updateField('details', e.target.value)}
          placeholder="Expliquez le contexte, la demande, les dates utiles, les références de dossier, ce que vous attendez comme réponse..."
          rows={8}
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        Pièces jointes / justificatifs
        <input
          value={form.attachments}
          onChange={(e) => updateField('attachments', e.target.value)}
          placeholder="Ex: carte d'identité, quittance de loyer, attestation employeur"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
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
        className="w-full rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-paper hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Génération en cours...' : 'Générer ma lettre'}
      </button>
    </form>
  );
}
