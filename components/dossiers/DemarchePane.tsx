'use client';

import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { RECIPIENT_CATEGORIES } from '@/lib/dossiers/categories';
import type { DossierView } from '@/components/dossiers/types';

type DemarchePaneProps = {
  dossier: DossierView;
  analyzeCost: number;
  generateCost: number;
  busy?: boolean;
  disabled?: boolean;
  onFieldChange: (field: 'objective' | 'recipientName' | 'recipientCategory' | 'context', value: string) => void;
  onQuestionAnswer: (questionId: string, answer: string) => void;
  onAnalyze: () => void;
  onGenerate: () => void;
};

export function DemarchePane({
  dossier,
  analyzeCost,
  generateCost,
  busy,
  disabled,
  onFieldChange,
  onQuestionAnswer,
  onAnalyze,
  onGenerate,
}: DemarchePaneProps) {
  const canGenerate = Boolean(dossier.objective.trim());

  return (
    <section className="flex h-full min-h-0 flex-col overflow-auto border-line bg-ivory lg:border-r">
      <div className="px-4 py-5 sm:px-6">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">Démarche</p>
        <h1 className="mt-2 font-serif text-[1.65rem] leading-tight text-ink">
          {dossier.title || 'Nouvelle démarche'}
        </h1>
      </div>

      <div className="space-y-6 px-4 pb-10 sm:px-6">
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-ink">Objectif</span>
          <textarea
            value={dossier.objective}
            disabled={disabled}
            rows={3}
            onChange={(event) => onFieldChange('objective', event.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-6 outline-hidden focus:border-primary"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-ink">Destinataire</span>
          <input
            value={dossier.recipientName}
            disabled={disabled}
            onChange={(event) => onFieldChange('recipientName', event.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-ink">Catégorie</span>
          <select
            value={dossier.recipientCategory}
            disabled={disabled}
            onChange={(event) => onFieldChange('recipientCategory', event.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary"
          >
            <option value="">À préciser / à inférer</option>
            {RECIPIENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-ink">Contexte</span>
          <textarea
            value={dossier.context}
            disabled={disabled}
            rows={5}
            onChange={(event) => onFieldChange('context', event.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-6 outline-hidden focus:border-primary"
          />
        </label>

        {dossier.questions.length > 0 ? (
          <div className="space-y-4">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">
              Questions utiles
            </p>
            {dossier.questions.map((question) => (
              <div key={question.id} className="space-y-2 text-sm">
                <p className="font-medium text-ink">{question.prompt}</p>
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Réponse</span>
                  <textarea
                    value={question.answer}
                    disabled={disabled}
                    rows={2}
                    onChange={(event) => onQuestionAnswer(question.id, event.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary"
                  />
                </label>
              </div>
            ))}
          </div>
        ) : dossier.advice ? (
          <p className="text-sm leading-6 text-muted">
            Votre dossier semble suffisamment renseigné pour passer à la rédaction.
          </p>
        ) : null}

        {dossier.advice ? (
          <div className="rounded-xl border border-line bg-paper px-4 py-3">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">
              Conseil de l’assistant
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">{dossier.advice}</p>
            <p className="mt-2 text-xs text-muted">Assistant vous guide. Vous restez responsable du courrier envoyé.</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onAnalyze}
            className="w-full rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {dossier.advice ? 'Actualiser l’aide' : 'M’aider dans ma démarche'} · {analyzeCost} crédits
          </button>
          <p className="text-xs leading-5 text-muted">
            Facultatif. Un dossier déjà clair peut n’appeler aucune question.
          </p>
          <button
            type="button"
            disabled={disabled || busy || !canGenerate}
            onClick={onGenerate}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60"
          >
            Rédiger mon courrier · {generateCost} crédits
          </button>
        </div>
        <FeedbackForm dossierId={dossier.id} />
      </div>
    </section>
  );
}
