'use client';

import { useAuthSession } from '@/lib/auth-client';
import { formatResetLabel, useCredits } from '@/lib/credits/use-credits';

export function CreditsBadge() {
  const { status } = useAuthSession();
  const credits = useCredits();

  if (status !== 'authenticated') {
    return null;
  }

  if (credits.loading) {
    return <div className="hidden h-9 w-40 animate-pulse rounded-full bg-line/60 sm:block" />;
  }

  const reset = formatResetLabel(credits.nextFreeResetAt);

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-right sm:flex"
      title={[reset, `${credits.paidCredits} crédits achetés`].filter(Boolean).join(' · ') || undefined}
    >
      <p className="font-mono text-[0.82rem] text-ink">{credits.freeCredits}</p>
      <p className="hidden text-xs text-muted lg:inline">crédits gratuits</p>
    </div>
  );
}
