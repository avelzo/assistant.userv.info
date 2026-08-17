'use client';

import Link from 'next/link';
import { useAuthSession } from '@/lib/auth-client';
import { useState } from 'react';

type ChangePasswordResponse = {
  message?: string;
  error?: string;
};

export function ChangePasswordCard() {
  const { status } = useAuthSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as ChangePasswordResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de mettre à jour le mot de passe.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(data.message || 'Mot de passe mis à jour avec succès.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-paper p-6 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
      <h2 className="font-serif text-2xl font-semibold text-ink">Mot de passe</h2>
      <p className="mt-1 text-sm text-muted">
        Modifiez votre mot de passe pour sécuriser votre compte.
      </p>

      {status !== 'authenticated' ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Vous devez être connecté pour changer votre mot de passe.{' '}
          <Link href="/auth/login" className="font-semibold underline">
            Se connecter
          </Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm font-medium text-ink">
            Mot de passe actuel
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Votre mot de passe actuel"
              className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
              minLength={8}
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-ink">
            Nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="8 caractères minimum"
              className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
              minLength={8}
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-ink">
            Confirmer le nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Répétez le nouveau mot de passe"
              className="w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-hidden focus:border-primary"
              minLength={8}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-paper hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      )}

      {message ? (
        <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{message}</p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
      ) : null}
    </section>
  );
}
