import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.email) {
    return NextResponse.json({ error: 'Email obligatoire.' }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

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

  // TODO: envoyer l'email avec le lien de réinitialisation
  // Le lien serait : `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`
  console.info(`[forgot-password] Lien de réinitialisation pour ${email}: /auth/reset-password?token=${token}`);

  return NextResponse.json({
    message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.',
  });
}
