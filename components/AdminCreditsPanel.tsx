'use client';

import { useState } from 'react';

type Balance = {
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
};

export function AdminCreditsPanel() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [ledger, setLedger] = useState<Array<{ id: string; amount: number; type: string; createdAt: string }>>([]);
  const [balance, setBalance] = useState<Balance | null>(null);

  async function postJson(url: string, body: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { error?: string; balance?: Balance };
    if (!response.ok) {
      throw new Error(data.error || 'Action impossible.');
    }
    return data;
  }

  async function handleGift() {
    setMessage('');
    try {
      const data = await postJson('/api/admin/credits/gift', {
        email,
        amount: Number(amount),
        reason,
      });
      setBalance(data.balance ?? null);
      setMessage('Cadeau enregistré sur les crédits achetés.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur.');
    }
  }

  async function handleAdjust(sign: 1 | -1) {
    setMessage('');
    try {
      const data = await postJson('/api/admin/credits/adjust', {
        email,
        amount: sign * Math.abs(Number(amount)),
        pool: 'PAID',
        reason,
      });
      setBalance(data.balance ?? null);
      setMessage('Ajustement enregistré.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur.');
    }
  }

  async function handleLedger() {
    setMessage('');
    const response = await fetch(`/api/admin/credits/ledger?email=${encodeURIComponent(email)}`);
    const data = (await response.json()) as {
      error?: string;
      balance?: Balance;
      ledger?: Array<{ id: string; amount: number; type: string; createdAt: string }>;
    };
    if (!response.ok) {
      setMessage(data.error || 'Lecture impossible.');
      return;
    }
    setBalance(data.balance ?? null);
    setLedger(data.ledger ?? []);
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Crédits</h2>
      <p className="mt-1 text-sm text-slate-500">
        Les cadeaux admin vont toujours dans les crédits achetés, pour ne pas disparaître au reset quotidien.
      </p>
      <div className="mt-4 grid gap-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email utilisateur"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Montant"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Raison obligatoire"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleGift()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
          Offrir (paid)
        </button>
        <button type="button" onClick={() => void handleAdjust(1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Ajuster +
        </button>
        <button type="button" onClick={() => void handleAdjust(-1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Ajuster −
        </button>
        <button type="button" onClick={() => void handleLedger()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Voir le ledger
        </button>
      </div>
      {balance ? (
        <p className="mt-4 text-sm text-slate-700">
          Gratuits {balance.freeCredits} · Achetés {balance.paidCredits} · Total {balance.totalCredits}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {ledger.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          {ledger.map((entry) => (
            <li key={entry.id}>
              {entry.createdAt.slice(0, 16)} · {entry.type} · {entry.amount}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
