'use client';

import { useState } from 'react';
import {
  FEEDBACK_COMMENT_MAX,
  USER_FEEDBACK_KIND_LABELS,
  USER_FEEDBACK_KINDS,
  type UserFeedbackKind,
  type UserFeedbackRating,
} from '@/lib/feedback/kinds';

type FeedbackFormProps = {
  dossierId?: string;
  compact?: boolean;
};

export function FeedbackForm({ dossierId, compact }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<UserFeedbackKind>('OTHER');
  const [rating, setRating] = useState<UserFeedbackRating | ''>('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          rating: rating || undefined,
          comment: comment.trim() || undefined,
          dossierId,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Envoi impossible.');
      }
      setComment('');
      setRating('');
      setKind('OTHER');
      setOpen(false);
      setMessage('Merci, votre retour a bien été enregistré.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? '' : 'mt-6'}>
      {message ? <p className="mb-2 text-xs text-muted">{message}</p> : null}
      {open ? (
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Un retour sur cette démarche ?</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Le courrier et le prompt ne sont pas envoyés automatiquement. Ajoutez un extrait seulement si
                vous le souhaitez.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted hover:text-ink"
              aria-label="Fermer le formulaire de retour"
            >
              Fermer
            </button>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-ink">Motif</legend>
            {USER_FEEDBACK_KINDS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="feedback-kind"
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                {USER_FEEDBACK_KIND_LABELS[value]}
              </label>
            ))}
          </fieldset>
          <fieldset className="mt-4 flex flex-wrap gap-3 text-sm">
            <legend className="mb-2 w-full text-xs font-medium text-ink">Utile ? (facultatif)</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="feedback-rating"
                checked={rating === 'USEFUL'}
                onChange={() => setRating('USEFUL')}
              />
              Utile
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="feedback-rating"
                checked={rating === 'NOT_USEFUL'}
                onChange={() => setRating('NOT_USEFUL')}
              />
              Pas utile
            </label>
          </fieldset>
          <label className="mt-4 block space-y-2 text-sm">
            <span className="font-medium text-ink">Commentaire (facultatif)</span>
            <textarea
              value={comment}
              maxLength={FEEDBACK_COMMENT_MAX}
              rows={3}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Décrivez le souci, ou collez un court extrait si c’est utile."
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-hidden focus:border-primary"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-paper disabled:opacity-60"
          >
            Envoyer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMessage('');
            setOpen(true);
          }}
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Signaler un problème ou donner un avis
        </button>
      )}
    </div>
  );
}
