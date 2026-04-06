import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accountEmail = session?.user?.email?.trim().toLowerCase() || '';

    if (!accountEmail) {
      return NextResponse.json({ error: 'Vous devez être connecté pour changer votre mot de passe.' }, { status: 401 });
    }

    let body: ChangePasswordBody;
    try {
      body = (await request.json()) as ChangePasswordBody;
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const currentPassword = (body.currentPassword || '').trim();
    const newPassword = (body.newPassword || '').trim();
    const confirmPassword = (body.confirmPassword || '').trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Tous les champs sont obligatoires.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit être différent de l\'ancien.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: accountEmail } });

    if (!user?.password) {
      return NextResponse.json(
        { error: 'Aucun mot de passe local n\'est configuré pour ce compte.' },
        { status: 400 }
      );
    }

    const passwordMatches = await compare(currentPassword, user.password);
    if (!passwordMatches) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { email: accountEmail },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Mot de passe mis à jour avec succès.' }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la mise à jour du mot de passe.' },
      { status: 500 }
    );
  }
}
