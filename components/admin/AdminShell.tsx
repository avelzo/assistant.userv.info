'use client';

import type { ReactNode } from 'react';
import { HeaderAuthButton } from '@/components/HeaderAuthButton';

export const ADMIN_TABS = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'ai', label: 'IA & consommation' },
  { id: 'feedback', label: 'Feedback' },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]['id'];

type AdminShellProps = {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: ReactNode;
};

export function AdminShell({ tab, onTabChange, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-ivory">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-paper lg:flex lg:flex-col">
          <div className="border-b border-line px-5 py-5">
            <p className="font-serif text-[1.15rem] font-semibold tracking-tight text-ink">Assistant</p>
            <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-accent">
              Administration
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Administration">
            {ADMIN_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                  tab === item.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted hover:bg-ivory hover:text-ink'
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur-md">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <div className="min-w-0 lg:hidden">
                <p className="font-serif text-[1.05rem] font-semibold leading-none text-ink">Assistant</p>
                <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.16em] text-accent">Administration</p>
              </div>
              <div className="ml-auto">
                <HeaderAuthButton />
              </div>
            </div>
            <nav
              className="flex gap-1 overflow-x-auto border-t border-line px-2 sm:px-4 lg:hidden"
              aria-label="Administration"
            >
              {ADMIN_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`relative shrink-0 px-3 py-2.5 text-sm transition ${
                    tab === item.id ? 'text-ink' : 'text-muted hover:text-ink'
                  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                >
                  {item.label}
                  {tab === item.id ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              ))}
            </nav>
          </header>

          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
