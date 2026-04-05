'use client';

import { useEffect, useState } from 'react';
import { getAccountProfile, saveAccountProfile } from '@/lib/storage';

type AccountResponse = {
  account?: {
    email: string;
    firstname: string;
    lastname: string;
    credits: number;
  };
  error?: string;
};

export function AccountCard() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [previousEmail, setPreviousEmail] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const profile = getAccountProfile();
    setFirstname(profile.firstname);
    setLastname(profile.lastname);
    setEmail(profile.email);
    setPreviousEmail(profile.email);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim()) {
      setMessage('Renseignez l\'adresse email à associer à votre compte.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstname,
          lastname,
          email,
          previousEmail,
        }),
      });

      const data = (await response.json()) as AccountResponse;

      if (!response.ok || !data.account) {
        throw new Error(data.error || 'Impossible de sauvegarder le compte.');
      }

      saveAccountProfile({
        firstname: data.account.firstname,
        lastname: data.account.lastname,
        email: data.account.email,
      });

      setFirstname(data.account.firstname);
      setLastname(data.account.lastname);
      setEmail(data.account.email);
      setPreviousEmail(data.account.email);
      setCredits(data.account.credits);
      setMessage('Compte enregistré. Vos crédits et informations de paiement sont maintenant associés à cet email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Mon compte</h2>
      <p className="mt-1 text-sm text-slate-500">
        Renseignez les informations de votre compte pour retrouver plus facilement vos paiements et vos crédits.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Prénom
          <input
            value={firstname}
            onChange={(event) => setFirstname(event.target.value)}
            placeholder="Ex: Laurent"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Nom
          <input
            value={lastname}
            onChange={(event) => setLastname(event.target.value)}
            placeholder="Ex: Hunaut"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ex: laurent@email.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer mon compte'}
        </button>
      </form>

      {credits !== null ? (
        <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Solde actuel sur votre compte : {credits} crédit{credits > 1 ? 's' : ''}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</p>
      ) : null}
    </section>
  );
}
