'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { RecaptchaNotice } from '@/components/auth/RecaptchaNotice';
import { executeRecaptcha, recaptchaSiteKey } from '@/lib/recaptcha-client';
import { fieldClass, primaryButtonClass } from '@/lib/ui/classes';

export function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstname: '',
    lastname: '',
    website: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formStartedAt] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get('callbackUrl') || '/pricing';
  const siteKey = recaptchaSiteKey();

  const loginHref = callbackUrl
    ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/auth/login';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('Veuillez accepter les conditions générales et la politique de confidentialité.');
      return;
    }
    setLoading(true);

    try {
      const recaptchaToken = await executeRecaptcha('register');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstname: form.firstname,
          lastname: form.lastname,
          website: form.website,
          recaptchaToken,
          formStartedAt,
          acceptedTerms,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        return;
      }

      router.push(`/auth/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {siteKey ? (
        <Script src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`} strategy="afterInteractive" />
      ) : null}
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Créer un compte</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Créez votre compte pour suivre vos crédits et retrouver vos démarches.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        >
          <label htmlFor="website">Site web</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstname" className="mb-1 block text-sm font-medium text-ink">
              Prénom <span className="text-accent">*</span>
            </label>
            <input
              id="firstname"
              name="firstname"
              type="text"
              autoComplete="given-name"
              required
              maxLength={80}
              value={form.firstname}
              onChange={handleChange}
              className={fieldClass}
              placeholder="Jean"
            />
          </div>
          <div>
            <label htmlFor="lastname" className="mb-1 block text-sm font-medium text-ink">
              Nom
            </label>
            <input
              id="lastname"
              name="lastname"
              type="text"
              autoComplete="family-name"
              maxLength={80}
              value={form.lastname}
              onChange={handleChange}
              className={fieldClass}
              placeholder="Dupont"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
            Adresse email <span className="text-accent">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={form.email}
            onChange={handleChange}
            className={fieldClass}
            placeholder="vous@exemple.fr"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
            Mot de passe <span className="text-accent">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={form.password}
            onChange={handleChange}
            className={fieldClass}
            placeholder="8 caractères minimum"
          />
        </div>

        <label className="flex items-start gap-2 text-sm leading-5 text-ink">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5"
            required
          />
          <span>
            J’accepte les{' '}
            <Link href="/conditions" className="text-primary hover:underline" target="_blank">
              conditions générales
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="text-primary hover:underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>

        {error ? (
          <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className={`w-full ${primaryButtonClass}`}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
        <RecaptchaNotice />
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Vous avez déjà un compte ?{' '}
        <Link href={loginHref} className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
