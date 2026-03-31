export const FREE_GENERATIONS = Number(
  process.env.NEXT_PUBLIC_FREE_GENERATIONS ?? 1
);

export const LOCAL_STORAGE_KEY = 'assistant-admin-generations-used';
export const PREMIUM_KEY = 'assistant-admin-premium-unlocked';

export function getUsedGenerations(): number {
  if (typeof window === 'undefined') return 0;

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? Number(raw) || 0 : 0;
}

export function incrementUsedGenerations(): number {
  if (typeof window === 'undefined') return 0;

  const nextValue = getUsedGenerations() + 1;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, String(nextValue));
  return nextValue;
}

export function hasFreeGenerationLeft(usedGenerations?: number): boolean {
  const used =
    typeof usedGenerations === 'number'
      ? usedGenerations
      : getUsedGenerations();
  // console.log({ used, free: FREE_GENERATIONS });
  return used < FREE_GENERATIONS;
}

export function isPremiumUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PREMIUM_KEY) === 'true';
}

export function unlockPremium(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREMIUM_KEY, 'true');
}

