'use client';

import { authClient, useAuthSession } from '@/lib/auth-client';
import Link from 'next/link';
import { clearStorageOnSignOut } from '@/lib/storage';
import { hasAdminRole } from '@/lib/roles';

export function HeaderAuthButton() {
  const { data: session, status } = useAuthSession();

  if (status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-line/60" />;
  }

  if (session) {
    const name = session.user?.name ?? session.user?.email ?? 'Mon compte';
    const isAdmin = hasAdminRole((session.user as { role?: string }).role);
    return (
      <div className="group relative">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition hover:bg-ivory"
          aria-haspopup="menu"
          aria-label="Ouvrir le menu du compte"
        >
          <span className="max-w-36 truncate">{name}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            className="text-muted transition group-hover:rotate-180 group-focus-within:rotate-180"
            aria-hidden="true"
          >
            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="invisible absolute right-0 top-full z-50 w-56 translate-y-1 rounded-xl border border-line bg-paper p-1 opacity-0 shadow-lg shadow-ink/5 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <Link
            href="/dossiers"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ivory"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted" aria-hidden="true">
              <path d="M3.5 5.5h13v10h-13z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3.5 8.5h13" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>Mes dossiers</span>
          </Link>
          <Link
            href="/generate"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ivory"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted" aria-hidden="true">
              <path d="M4 16.25h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 3.75a1.77 1.77 0 0 1 2.5 2.5l-6.75 6.75L6 13.75l.75-2.75L13 3.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Commencer une démarche</span>
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ivory"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted" aria-hidden="true">
              <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16.5a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Compte</span>
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ivory"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted" aria-hidden="true">
                <path d="M4.5 4.5h4v4h-4zM11.5 4.5h4v4h-4zM4.5 11.5h4v4h-4zM11.5 11.5h4v4h-4z" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span>Administration</span>
            </Link>
          ) : null}
          <div className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={() => {
                clearStorageOnSignOut();
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = '/';
                    },
                  },
                });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-ivory"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted" aria-hidden="true">
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
      className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
    >
      Connexion
    </Link>
  );
}
