import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.email) {
    return NextResponse.json({ error: 'Email obligatoire.' }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  console.log({ email });
  const user = await prisma.user.findUnique({ where: { email } });
  console.log({ user });

  // Réponse identique que l'utilisateur existe ou non (sécurité)
  if (!user) {
    return NextResponse.json({
      message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.',
    });
  }

  // Supprimer les tokens existants pour cet email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

  const baseUrl = String(process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  try {
    await sendEmail({
      to: email,
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@userv.info',
      replyTo: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Bonjour,

Vous avez demandé à réinitialiser votre mot de passe.

Cliquez sur le lien suivant pour définir un nouveau mot de passe : ${resetUrl}

Ce lien expire dans 1 heure.

Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.
`,
      html: `
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Utilisez le lien suivant pour définir un nouveau mot de passe :</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.</p>
      `,
    });
  } catch (error) {
    console.error('[forgot-password] impossible d’envoyer l’email de réinitialisation', error);
  }

  return NextResponse.json({
    message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.',
  });
}
