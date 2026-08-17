import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

  try {
    await auth.api.resetPassword({
      body: {
        newPassword: password,
        token,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Lien de réinitialisation invalide ou expiré.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: 'Mot de passe mis à jour avec succès.' });
}
