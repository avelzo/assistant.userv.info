'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/auth-client';
import {
  getAccountProfile,
  saveAccountProfile,
  setCreditHistory,
  setPaidCredits,
  type CreditHistoryEntry,
} from '@/lib/storage';
import { getDailyFreeCredits } from '@/lib/credits/config';

type AccountResponse = {
  account?: {
    email: string;
    firstname: string;
    lastname: string;
    addressLine?: string;
    postalCode?: string;
    city?: string;
    phone?: string;
    credits: number;
    freeCredits?: number;
    paidCredits?: number;
    dailyFreeLimit?: number;
    nextFreeResetAt?: string;
  };
  history?: CreditHistoryEntry[];
  error?: string;
};

export function AccountCard() {
  const { status } = useAuthSession();
  const [firstname, setFirstname] = useState(() => getAccountProfile().firstname);
  const [lastname, setLastname] = useState(() => getAccountProfile().lastname);
  const [email, setEmail] = useState(() => getAccountProfile().email);
  const [previousEmail, setPreviousEmail] = useState(() => getAccountProfile().email);
  const [credits, setCredits] = useState<number | null>(null);
  const [freeCredits, setFreeCredits] = useState<number | null>(null);
  const [paidCredits, setPaidCreditsState] = useState<number | null>(null);
  const [dailyFreeLimit, setDailyFreeLimit] = useState(getDailyFreeCredits);
  const [nextFreeResetAt, setNextFreeResetAt] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    const hydrateAccountFromServer = async () => {
      try {
        const response = await fetch('/api/account', { method: 'GET' });
        const data = (await response.json()) as AccountResponse;

        if (!response.ok || !data.account) {
          return;
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
        setAddressLine(data.account.addressLine || '');
        setPostalCode(data.account.postalCode || '');
        setCity(data.account.city || '');
        setPhone(data.account.phone || '');
        setCredits(data.account.credits);
        setFreeCredits(data.account.freeCredits ?? null);
        setPaidCreditsState(data.account.paidCredits ?? null);
        setDailyFreeLimit(data.account.dailyFreeLimit ?? getDailyFreeCredits());
        setNextFreeResetAt(data.account.nextFreeResetAt ?? null);
        setPaidCredits(data.account.paidCredits ?? data.account.credits);

        if (Array.isArray(data.history)) {
          setCreditHistory(data.history);
        }

        window.dispatchEvent(new Event('credits-updated'));
      } catch {
        // La page continue avec l'état local si la synchro échoue.
      }
    };

    void hydrateAccountFromServer();
  }, [status]);

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
          addressLine,
          postalCode,
          city,
          phone,
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
        setAddressLine(data.account.addressLine || '');
        setPostalCode(data.account.postalCode || '');
        setCity(data.account.city || '');
        setPhone(data.account.phone || '');
        setCredits(data.account.credits);
      setFreeCredits(data.account.freeCredits ?? null);
      setPaidCreditsState(data.account.paidCredits ?? null);
      setPaidCredits(data.account.paidCredits ?? data.account.credits);
      if (Array.isArray(data.history)) {
        setCreditHistory(data.history);
      }
      window.dispatchEvent(new Event('credits-updated'));
      setMessage('Compte enregistré. Vos crédits et informations de paiement sont maintenant associés à cet email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-paper p-6 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
      <h2 className="font-serif text-2xl font-semibold text-ink">Mon compte</h2>
      <p className="mt-1 text-sm text-muted">
        Renseignez les informations de votre compte pour retrouver plus facilement vos paiements et vos crédits.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block space-y-2 text-sm font-medium text-ink">
          Prénom
          <input
            value={firstname}
            onChange={(event) => setFirstname(event.target.value)}
            placeholder="Ex: Laurent"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-ink">
          Nom
          <input
            value={lastname}
            onChange={(event) => setLastname(event.target.value)}
            placeholder="Ex: Hunaut"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-ink">
          Adresse
          <input
            value={addressLine}
            onChange={(event) => setAddressLine(event.target.value)}
            placeholder="12 rue des Lilas"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium text-ink">
            Code postal
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="75000"
              className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-ink">
            Ville
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Paris"
              className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm font-medium text-ink">
          Téléphone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="06 00 00 00 00"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-ink">
          Email
          <input
            type="email"
            value={email}
            readOnly
            className="w-full rounded-xl border border-line bg-desk px-4 py-3 outline-hidden"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-paper hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer mon compte'}
        </button>
      </form>

      {freeCredits !== null && paidCredits !== null ? (
        <div className="mt-4 space-y-1 rounded-xl bg-ivory px-4 py-3 text-sm text-ink">
          <p className="font-mono text-xs">{freeCredits} crédits gratuits</p>
          <p className="font-mono text-xs">{paidCredits} crédits achetés</p>
          {nextFreeResetAt ? (
            <p className="text-xs text-muted">
              Renouvellement gratuit : {new Date(nextFreeResetAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
            </p>
          ) : null}
        </div>
      ) : credits !== null ? (
        <p className="mt-4 rounded-xl bg-ivory px-4 py-3 text-sm text-ink">
          Solde actuel sur votre compte : {credits} crédit{credits > 1 ? 's' : ''}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{message}</p>
      ) : null}
    </section>
  );
}
