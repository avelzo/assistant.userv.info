import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.token || !body?.password) {
    return NextResponse.json(
      { error: 'Token et nouveau mot de passe obligatoires.' },
      { status: 400 }
    );
  }

  const token = String(body.token);
  const password = String(body.password);

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
      { status: 400 }
    );
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Lien de réinitialisation invalide ou expiré.' },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(password, 12);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ message: 'Mot de passe mis à jour avec succès.' });
}
