'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '', firstname: '', lastname: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get('callbackUrl') || '/pricing';

  const loginHref = callbackUrl
    ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/auth/login';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.');
      return;
    }

    router.push(`/auth/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Créer un compte</h1>
      <p className="mb-6 text-sm text-slate-500">
        Créez votre compte pour suivre vos crédits et retrouver vos paiements plus facilement.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstname" className="mb-1 block text-sm font-medium text-slate-700">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              id="firstname"
              name="firstname"
              type="text"
              autoComplete="given-name"
              required
              value={form.firstname}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Jean"
            />
          </div>
          <div>
            <label htmlFor="lastname" className="mb-1 block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input
              id="lastname"
              name="lastname"
              type="text"
              autoComplete="family-name"
              value={form.lastname}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Dupont"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Adresse email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="vous@exemple.fr"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="8 caractères minimum"
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
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Vous avez déjà un compte ?{' '}
        <Link href={loginHref} className="font-medium text-indigo-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}