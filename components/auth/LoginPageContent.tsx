'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { fieldClass, primaryButtonClass } from '@/lib/ui/classes';

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const registered = searchParams.get('registered') === '1';

  const registerHref = callbackUrl
    ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/auth/register';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError('Email ou mot de passe incorrect.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Connexion</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Connectez-vous pour retrouver votre compte, vos crédits et vos démarches.
      </p>
      {registered ? (
        <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
          Vérifiez votre adresse e-mail pour utiliser Assistant. Vous pouvez déjà vous connecter à votre compte.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="vous@exemple.fr"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Mot de passe
            </label>
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Connexion…' : 'Accéder à mon compte'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {`Vous n'avez pas encore de compte ? `}
        <Link href={registerHref} className="font-medium text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
