'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { clearStorageOnSignOut } from '@/lib/storage';

export function HeaderAuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />;
  }

  if (session) {
    const name = session.user?.name ?? session.user?.email ?? 'Mon compte';
    return (
      <div className="group relative">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          aria-haspopup="menu"
          aria-label="Ouvrir le menu du compte"
        >
          <span className="max-w-36 truncate">{name}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            className="text-slate-500 transition group-hover:rotate-180 group-focus-within:rotate-180"
            aria-hidden="true"
          >
            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="invisible absolute right-0 top-full z-50 w-52 translate-y-1 rounded-xl border border-slate-200 bg-white p-1 opacity-0 shadow-lg shadow-slate-900/5 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <Link
            href="/generate"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-500" aria-hidden="true">
              <path d="M4 16.25h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 3.75a1.77 1.77 0 0 1 2.5 2.5l-6.75 6.75L6 13.75l.75-2.75L13 3.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Générer Courrier</span>
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-500" aria-hidden="true">
              <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16.5a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Compte</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-500" aria-hidden="true">
              <path d="M10 7.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16.2 10a6.6 6.6 0 0 0-.08-1l1.33-1.04-1.5-2.58-1.62.58a6.77 6.77 0 0 0-1.72-1L12.35 3H7.65l-.26 1.96c-.62.24-1.2.57-1.72 1l-1.62-.58-1.5 2.58L3.88 9a6.65 6.65 0 0 0 0 2l-1.33 1.04 1.5 2.58 1.62-.58c.52.43 1.1.76 1.72 1L7.65 17h4.7l.26-1.96c.62-.24 1.2-.57 1.72-1l1.62.58 1.5-2.58L16.12 11c.05-.33.08-.66.08-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Paramètres</span>
          </Link>
          <div className="mt-1 border-t border-slate-200 pt-1">
            <button
              type="button"
              onClick={() => { clearStorageOnSignOut(); void signOut({ callbackUrl: '/' }); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-500" aria-hidden="true">
                <path d="M12.5 5.5V4.75A1.75 1.75 0 0 0 10.75 3h-5A1.75 1.75 0 0 0 4 4.75v10.5C4 16.22 4.78 17 5.75 17h5a1.75 1.75 0 0 0 1.75-1.75v-.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 10h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m13.5 7 2.5 3-2.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
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
