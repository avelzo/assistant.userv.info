import { sendEmail } from '@/lib/mail';

function appBaseUrl(): string {
  return String(process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}

export async function sendVerificationEmailMessage(params: { to: string; url: string }) {
  await sendEmail({
    to: params.to,
    subject: 'Vérifiez votre adresse e-mail',
    text: `Bonjour,

Veuillez confirmer votre adresse e-mail en ouvrant ce lien :

${params.url}

Si vous n’avez pas créé de compte, ignorez ce message.`,
    html: `<p>Bonjour,</p>
<p>Veuillez confirmer votre adresse e-mail en cliquant sur le lien suivant :</p>
<p><a href="${params.url}">Vérifier mon adresse</a></p>
<p>Si vous n’avez pas créé de compte, ignorez ce message.</p>`,
  });
}

export async function sendResetPasswordEmailMessage(params: { to: string; url: string }) {
  await sendEmail({
    to: params.to,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Bonjour,

Vous avez demandé à réinitialiser votre mot de passe.

Ouvrez ce lien pour en choisir un nouveau :

${params.url}

Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
    html: `<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser votre mot de passe.</p>
<p><a href="${params.url}">Choisir un nouveau mot de passe</a></p>
<p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`,
  });
}

export function defaultAuthCallbackUrl(path = '/account'): string {
  return `${appBaseUrl()}${path}`;
}
