import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { hasAdminRole } from '@/lib/roles';

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAuthSession() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return null;
  }
  return session;
}

export async function requireAdminSession() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return { ok: false as const, status: 401 as const, session: null };
  }

  if (!hasAdminRole(session.user.role)) {
    return { ok: false as const, status: 403 as const, session };
  }

  return { ok: true as const, status: 200 as const, session };
}
