'use client';

import { useEffect, useState } from 'react';
import {
  addPaidCredits,
  addCreditHistoryEntry,
  getAccountProfile,
  markCheckoutSessionProcessed,
  saveAccountProfile,
  setPaidCredits,
} from '@/lib/storage';

type Notice = {
  message: string;
  variant: 'success' | 'warning' | 'error';
};

export function PaymentFlag() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const claimCredits = async (sessionId: string) => {
      const response = await fetch('/api/credits/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = (await response.json()) as {
        error?: string;
        credited?: boolean;
        alreadyProcessed?: boolean;
        credits?: number;
        availableCredits?: number;
        email?: string;
        firstname?: string;
        lastname?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de valider le crédit après paiement.');
      }

      return data;
    };

    void Promise.resolve().then(async () => {
      const params = new URLSearchParams(window.location.search);
      const payment = params.get('payment');
      const sessionId = params.get('session_id') || '';

      if (payment === 'cancelled') {
        setNotice({
          variant: 'warning',
          message: "Paiement annulé. Aucun crédit n'a été débité. Vous pouvez reprendre l'achat quand vous voulez.",
        });
        return;
      }

      if (payment !== 'success') {
        return;
      }

      if (!sessionId) {
        setNotice({
          variant: 'warning',
          message: 'Paiement validé. Impossible de créditer automatiquement sans identifiant de session.',
        });
        return;
      }

      try {
        const data = await claimCredits(sessionId);
        const wasProcessedNow = markCheckoutSessionProcessed(sessionId);

        if (data.email) {
          const currentProfile = getAccountProfile();

          saveAccountProfile({
            email: data.email,
            firstname: data.firstname || currentProfile.firstname,
            lastname: data.lastname || currentProfile.lastname,
          });
        }

        if (typeof data.availableCredits === 'number') {
          setPaidCredits(data.availableCredits);
        } else if (data.credited && typeof data.credits === 'number') {
          addPaidCredits(data.credits);
        }

        if (data.credited && wasProcessedNow) {
          const credits = Math.max(1, data.credits || 1);

          addCreditHistoryEntry({
            type: 'purchase',
            credits,
            source: 'stripe',
            label: `Achat de ${credits} crédit${credits > 1 ? 's' : ''}`,
          });
        }

        window.dispatchEvent(new Event('credits-updated'));

        if (data.alreadyProcessed) {
          const availableCredits = data.availableCredits ?? 0;

          setNotice({
            variant: 'success',
            message: `Paiement déjà enregistré. Votre compte dispose actuellement de ${availableCredits} crédit${availableCredits > 1 ? 's' : ''}.`,
          });

          return;
        }

        const credits = Math.max(1, data.credits || 1);

        setNotice({
          variant: 'success',
          message: `Paiement confirmé. ${credits} crédit${credits > 1 ? 's' : ''} ajouté${credits > 1 ? 's' : ''} à votre compte. Solde actuel : ${data.availableCredits ?? 0}.`,
        });
      } catch (error) {
        setNotice({
          variant: 'error',
          message: error instanceof Error ? error.message : 'Erreur inconnue.',
        });
      }
    });
  }, []);

  if (!notice) return null;

  const toneClass =
    notice.variant === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : notice.variant === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      {notice.message}
    </div>
  );
}