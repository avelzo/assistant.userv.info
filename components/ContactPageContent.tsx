'use client';

import { useState } from 'react';
import Script from 'next/script'
declare global {
    interface Window {
        grecaptcha?: {
            ready: (callback: () => void) => void
            execute: (siteKey: string, options: { action: string }) => Promise<string>
        }
    }
}

const emailContact = process.env.NEXT_PUBLIC_SERVER_EMAIL ?? 'assistant@userv.info';

export function ContactPageContent() {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaError, setCaptchaError] = useState<string | null>(null)
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''

    const executeRecaptcha = async () => {
        if (!siteKey) {
            throw new Error('Clé publique reCAPTCHA manquante. Ajoutez NEXT_PUBLIC_RECAPTCHA_SITE_KEY dans .env.local.')
        }

        return new Promise<string>((resolve, reject) => {
            const grecaptcha = window.grecaptcha
            if (!grecaptcha) {
                reject(new Error(`reCAPTCHA n'a pas encore été chargé. Rechargez la page ou vérifiez votre script.`))
                return
            }

            grecaptcha.ready(() => {
                grecaptcha.execute(siteKey, { action: 'contact_form' })
                    .then(resolve)
                    .catch((err) => reject(new Error(`Impossible d'exécuter reCAPTCHA: ` + err.message)))
            })
        })
    }

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCaptchaError(null)
        setLoading(true);
        setStatus('idle');
        setErrorMessage('');

        
        const recaptchaToken = await executeRecaptcha()
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, recaptchaToken}),
        });

        setLoading(false);

        if (response.ok) {
            setStatus('success');
            setForm({ name: '', email: '', subject: '', message: '' });
            return;
        }

        const data = await response.json().catch(() => null);
        setStatus('error');
        setErrorMessage(data?.error || 'Une erreur est survenue.');
    };

    return (
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col justify-center px-6 py-16">
            <Script
                src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
                strategy="afterInteractive"
            />
            <div className="mb-12 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
                <div className="mb-8 flex flex-col gap-4 text-center sm:text-left">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Contact</p>
                    <h1 className="mt-4 text-4xl font-bold text-slate-900">Une question ? Un retour ?</h1>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                    Envoyez-nous un message via le formulaire ou écrivez directement à{' '}
                    <a href={`mailto:${emailContact}`} className="font-medium text-indigo-600 hover:underline">
                    {emailContact}
                    </a>.
                </p>
                </div>

                {status === 'success' ? (
                <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900 shadow-sm">
                    <p className="font-semibold">Message envoyé !</p>
                    <p className="mt-1 text-sm">Nous vous répondrons dès que possible.</p>
                </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        Nom
                        <input
                        type="text"
                        value={form.name}
                        onChange={(event) => handleChange('name', event.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        Email
                        <input
                        type="email"
                        value={form.email}
                        onChange={(event) => handleChange('email', event.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </label>
                    </div>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                    Sujet
                    <input
                        type="text"
                        value={form.subject}
                        onChange={(event) => handleChange('subject', event.target.value)}
                        placeholder="Ex: Problème de connexion"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                    Message
                    <textarea
                        value={form.message}
                        onChange={(event) => handleChange('message', event.target.value)}
                        required
                        rows={8}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    </label>

                    {status === 'error' && (
                    <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                        {errorMessage}
                    </div>
                    )}
                    {captchaError ? <div className="text-red-500 text-center mt-6">{captchaError}</div> : null}
                    <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                    {loading ? 'Envoi…' : 'Envoyer le message'}
                    </button>
                </form>
                )}
            </div>
        </div>
    );
}
