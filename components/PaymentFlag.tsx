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

export function PaymentFlag() {
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<'success' | 'warning' | 'error'>('success');

  useEffect(() => {
    const claimCredits = async (sessionId: string) => {
      const response = await fetch('/api/credits/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id') || '';

    if (payment === 'success') {
      if (!sessionId) {
        setVariant('warning');
        setMessage('Paiement validé. Impossible de créditer automatiquement sans identifiant de session.');
        return;
      }

      const applyClaim = async () => {
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
            addCreditHistoryEntry({
              type: 'purchase',
              credits: Math.max(1, data.credits || 1),
              source: 'stripe',
              label: `Achat de ${Math.max(1, data.credits || 1)} crédit${Math.max(1, data.credits || 1) > 1 ? 's' : ''}`,
            });
          }

          window.dispatchEvent(new Event('credits-updated'));

          if (data.alreadyProcessed) {
            setVariant('success');
            setMessage(
              `Paiement déjà enregistré. Votre compte dispose actuellement de ${data.availableCredits ?? 0} crédit${(data.availableCredits ?? 0) > 1 ? 's' : ''}.`
            );
            return;
          }

          setVariant('success');
          setMessage(
            `Paiement confirmé. ${Math.max(1, data.credits || 1)} crédit${Math.max(1, data.credits || 1) > 1 ? 's' : ''} ajouté${Math.max(1, data.credits || 1) > 1 ? 's' : ''} à votre compte. Solde actuel : ${data.availableCredits ?? 0}.`
          );
        } catch (error) {
          setVariant('error');
          setMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
        }
      };

      void applyClaim();
    }

    if (payment === 'cancelled') {
      setVariant('warning');
      setMessage('Paiement annulé. Aucun crédit n\'a été débité. Vous pouvez reprendre l\'achat quand vous voulez.');
    }
  }, []);

  if (!message) return null;

  const toneClass =
    variant === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : variant === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{message}</div>;
}
