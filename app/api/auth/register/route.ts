import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.email || !body?.password || !body?.firstname) {
    return NextResponse.json(
      { error: 'Les champs email, mot de passe et prénom sont obligatoires.' },
      { status: 400 }
    );
  }

  const email = String(body.email).toLowerCase().trim();
  const password = String(body.password);
  const firstname = String(body.firstname).trim();
  const lastname = body.lastname ? String(body.lastname).trim() : undefined;

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'Un compte avec cet email existe déjà.' },
      { status: 409 }
    );
  }

  const hashedPassword = await hash(password, 12);

  await prisma.user.create({
    data: { email, password: hashedPassword, firstname, lastname },
  });

  return NextResponse.json({ message: 'Compte créé avec succès.' }, { status: 201 });
}
