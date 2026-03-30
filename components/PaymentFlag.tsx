'use client';

import { useEffect, useState } from 'react';
import { unlockPremium } from '@/lib/storage';

export function PaymentFlag() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');

    if (payment === 'success') {
      unlockPremium();
      setMessage('Paiement validé. L’accès premium est maintenant débloqué sur cet appareil.');
    }

    if (payment === 'cancelled') {
      setMessage('Paiement annulé. Vous pouvez réessayer quand vous voulez.');
    }
  }, []);

  if (!message) return null;

  return <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>;
}
