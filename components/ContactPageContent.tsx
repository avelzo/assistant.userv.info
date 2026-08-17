'use client';

import { useState } from 'react';
import Script from 'next/script';
import { RecaptchaNotice } from '@/components/auth/RecaptchaNotice';
import { executeRecaptcha, recaptchaSiteKey } from '@/lib/recaptcha-client';
import { fieldClass, paperCardClass, primaryButtonClass } from '@/lib/ui/classes';

const emailContact = process.env.NEXT_PUBLIC_SERVER_EMAIL ?? 'assistant@userv.info';

export function ContactPageContent() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const siteKey = recaptchaSiteKey();

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const recaptchaToken = await executeRecaptcha('contact_form');
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });

      if (response.ok) {
        setStatus('success');
        setForm({ name: '', email: '', subject: '', message: '', website: '' });
        return;
      }

      const data = await response.json().catch(() => null);
      setStatus('error');
      setErrorMessage(data?.error || 'Une erreur est survenue.');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center px-6 py-16">
      {siteKey ? (
        <Script src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`} strategy="afterInteractive" />
      ) : null}
      <div className={`${paperCardClass} p-8 sm:p-10`}>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">Contact</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">Une question ? Un retour ?</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Envoyez-nous un message via le formulaire ou écrivez à{' '}
          <a href={`mailto:${emailContact}`} className="font-medium text-primary hover:underline">
            {emailContact}
          </a>
          .
        </p>

        {status === 'success' ? (
          <div className="mt-8 rounded-xl bg-primary/10 p-5 text-primary">
            <p className="font-semibold">Message envoyé</p>
            <p className="mt-1 text-sm text-ink">Nous vous répondrons dès que possible.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative mt-8 space-y-5">
            <div
              aria-hidden="true"
              className="absolute left-[-10000px] h-px w-px overflow-hidden"
            >
              <label htmlFor="website">Site web</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => handleChange('website', event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-ink">
                Nom
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-ink">
              Sujet
              <input
                type="text"
                value={form.subject}
                onChange={(event) => handleChange('subject', event.target.value)}
                placeholder="Ex. : Problème de connexion"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-ink">
              Message
              <textarea
                value={form.message}
                onChange={(event) => handleChange('message', event.target.value)}
                required
                rows={8}
                className={fieldClass}
              />
            </label>

            {status === 'error' ? (
              <div className="rounded-xl bg-accent/10 p-4 text-sm text-accent">{errorMessage}</div>
            ) : null}
            <button type="submit" disabled={loading} className={primaryButtonClass}>
              {loading ? 'Envoi…' : 'Envoyer le message'}
            </button>
            <RecaptchaNotice />
          </form>
        )}
      </div>
    </div>
  );
}
