import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { displayName, assertRegisterGuards, GENERIC_REGISTER_SUCCESS } from '@/lib/register-guards';
import { getTrustedClientIp } from '@/lib/ip';
import { recordSecurityEvent } from '@/lib/security-event';
import { ROLES } from '@/lib/roles';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const guards = await assertRegisterGuards({ request: req, body });
  if (!guards.ok) {
    return guards.response;
  }

  const { email, password, firstname, lastname } = guards.data;
  const ip = getTrustedClientIp(req);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await recordSecurityEvent({
      kind: 'REGISTER_BLOCKED',
      route: '/api/auth/register',
      status: 201,
      ip,
    });
    return NextResponse.json({ message: GENERIC_REGISTER_SUCCESS }, { status: 201 });
  }

  const hashedPassword = await hashPassword(password);
  const name = displayName(firstname, lastname, email);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      firstname,
      lastname: lastname || undefined,
      emailVerified: false,
      role: ROLES.USER,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashedPassword,
    },
  });

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL: '/account',
      },
    });
  } catch {
    // La création du compte ne doit pas échouer ni révéler l'état SMTP.
  }

  return NextResponse.json({ message: GENERIC_REGISTER_SUCCESS }, { status: 201 });
}
