'use client';

import { useState } from 'react';
import { authClient, useAuthSession } from '@/lib/auth-client';

type VerifyEmailNoticeProps = {
  emailVerified: boolean;
};

export function VerifyEmailNotice({ emailVerified }: VerifyEmailNoticeProps) {
  const { data: session } = useAuthSession();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const email = session?.user?.email;

  if (emailVerified) {
    return null;
  }

  async function handleResend() {
    if (!email) {
      setStatus('error');
      return;
    }

    setStatus('sending');
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/account',
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-ink">
      <p className="font-semibold">Vérifiez votre adresse e-mail pour utiliser Assistant.</p>
      <p className="mt-1 text-muted">
        Un lien de confirmation vous a été envoyé. Sans cette vérification, les opérations IA restent bloquées.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={status === 'sending' || status === 'sent'}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-paper hover:bg-primary-hover disabled:opacity-60"
        >
          {status === 'sending' ? 'Envoi…' : status === 'sent' ? 'E-mail renvoyé' : 'Renvoyer l’e-mail'}
        </button>
        {status === 'error' ? (
          <span className="text-xs text-red-700">Trop de tentatives ou envoi impossible. Réessayez plus tard.</span>
        ) : null}
      </div>
    </div>
  );
}
