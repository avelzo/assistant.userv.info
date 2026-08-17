'use client';

import { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { RecaptchaNotice } from '@/components/auth/RecaptchaNotice';
import { executeRecaptcha, recaptchaSiteKey } from '@/lib/recaptcha-client';
import { fieldClass, primaryButtonClass } from '@/lib/ui/classes';

export function ForgotPasswordPageContent() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const siteKey = recaptchaSiteKey();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setError('');

    try {
      const recaptchaToken = await executeRecaptcha('forgot_password');
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken }),
      });

      setLoading(false);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || 'Une erreur est survenue. Veuillez réessayer.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch (err) {
      setLoading(false);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
    }
  }

  return (
    <>
      {siteKey ? (
        <Script src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`} strategy="afterInteractive" />
      ) : null}
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Réinitialiser votre mot de passe</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Indiquez l’adresse email de votre compte pour recevoir un lien de réinitialisation.
      </p>

      {status === 'success' ? (
        <div className="rounded-xl bg-primary/10 px-4 py-4 text-sm text-primary">
          <p className="font-medium">Email envoyé</p>
          <p className="mt-1 text-ink">Si cet email est enregistré, vous recevrez un lien dans quelques minutes.</p>
        </div>
      ) : (
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

          {status === 'error' ? (
            <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">
              {error || 'Une erreur est survenue. Veuillez réessayer.'}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className={`w-full ${primaryButtonClass}`}>
            {loading ? 'Envoi…' : 'Recevoir le lien'}
          </button>
          <RecaptchaNotice />
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </>
  );
}
