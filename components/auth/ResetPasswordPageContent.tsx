'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!token) {
      setError('Lien de réinitialisation invalide.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.');
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/auth/login'), 2500);
  }

  if (!token) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        Ce lien de réinitialisation est invalide ou manquant.{' '}
        <Link href="/auth/forgot-password" className="underline">
          Demander un nouveau lien
        </Link>
      </p>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-800">
        <p className="font-medium">Mot de passe mis à jour !</p>
        <p className="mt-1">Vous allez être redirigé vers la connexion…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="8 caractères minimum"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-slate-700">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
      </button>
    </form>
  );
}

export function ResetPasswordPageContent() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
      <p className="mb-6 text-sm text-slate-500">
        Choisissez un nouveau mot de passe pour accéder à nouveau à votre compte.
      </p>
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/auth/login" className="font-medium text-indigo-600 hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </>
  );
}