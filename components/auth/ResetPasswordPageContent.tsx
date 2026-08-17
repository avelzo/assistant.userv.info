'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fieldClass, primaryButtonClass } from '@/lib/ui/classes';

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
      <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">
        Ce lien de réinitialisation est invalide ou manquant.{' '}
        <Link href="/auth/forgot-password" className="underline">
          Demander un nouveau lien
        </Link>
      </p>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl bg-primary/10 px-4 py-4 text-sm text-primary">
        <p className="font-medium">Mot de passe mis à jour</p>
        <p className="mt-1 text-ink">Vous allez être redirigé vers la connexion…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
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
          className={fieldClass}
          placeholder="8 caractères minimum"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-ink">
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
          className={fieldClass}
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={`w-full ${primaryButtonClass}`}>
        {loading ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
      </button>
    </form>
  );
}

export function ResetPasswordPageContent() {
  return (
    <>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Nouveau mot de passe</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Choisissez un nouveau mot de passe pour accéder à nouveau à votre compte.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </>
  );
}
