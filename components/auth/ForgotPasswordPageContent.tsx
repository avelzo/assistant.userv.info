'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ForgotPasswordPageContent() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setStatus(res.ok ? 'success' : 'error');
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Réinitialiser votre mot de passe</h1>
      <p className="mb-6 text-sm text-slate-500">
        Indiquez l'adresse email de votre compte pour recevoir un lien de réinitialisation.
      </p>

      {status === 'success' ? (
        <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-800">
          <p className="font-medium">Email envoyé !</p>
          <p className="mt-1">
            Si cet email est enregistré, vous recevrez un lien dans quelques minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="vous@exemple.fr"
            />
          </div>

          {status === 'error' && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Envoi…' : 'Recevoir le lien'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/auth/login" className="font-medium text-indigo-600 hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </>
  );
}