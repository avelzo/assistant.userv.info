'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function HeaderAuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />;
  }

  if (session) {
    const name = session.user?.name ?? session.user?.email ?? 'Mon compte';
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 sm:block">
          {name}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
    >
      Connexion
    </Link>
  );
}
