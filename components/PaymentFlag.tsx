'use client';

import { useEffect, useState } from 'react';
import {
  addCreditHistoryEntry,
  markCheckoutSessionProcessed,
  setPaidCredits,
} from '@/lib/storage';

export function PaymentFlag() {
  const [message, setMessage] = useState('');

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
      };

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de valider le crédit après paiement.');
      }
      console.log({data});
      return data;
    };

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id') || '';

    if (payment === 'success') {
      if (!sessionId) {
        setMessage('Paiement validé. Impossible de créditer automatiquement sans identifiant de session.');
        return;
      }

      const applyClaim = async () => {
        try {
          const data = await claimCredits(sessionId);
          const wasProcessedNow = markCheckoutSessionProcessed(sessionId);

          if (typeof data.availableCredits === 'number') {
            setPaidCredits(data.availableCredits);
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
            setMessage(
              `Paiement déjà pris en compte. Crédits disponibles: ${data.availableCredits ?? 0}.`
            );
            return;
          }

          setMessage(
            `Paiement validé. ${Math.max(1, data.credits || 1)} crédit${Math.max(1, data.credits || 1) > 1 ? 's' : ''} ajouté${Math.max(1, data.credits || 1) > 1 ? 's' : ''}. Crédits disponibles: ${data.availableCredits ?? 0}.`
          );
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
        }
      };

      void applyClaim();
    }
    console.log({ payment, sessionId });
    if (payment === 'cancelled') {
      setMessage('Paiement annulé. Vous pouvez réessayer quand vous voulez.');
    }
  }, []);

  if (!message) return null;
  
  return <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>;
}
