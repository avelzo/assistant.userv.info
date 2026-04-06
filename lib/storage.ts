export const FREE_GENERATIONS = Number(
  process.env.NEXT_PUBLIC_FREE_GENERATIONS ?? 1
);

export const LOCAL_STORAGE_KEY = 'assistant-admin-generations-used';
export const PAID_CREDITS_KEY = 'assistant-admin-paid-generation-credits';
export const PREMIUM_KEY = 'assistant-admin-premium-unlocked';
export const PROCESSED_SESSIONS_KEY = 'assistant-admin-processed-checkout-sessions';
export const ACCOUNT_PROFILE_KEY = 'assistant-admin-account-profile';
export const CREDIT_HISTORY_KEY = 'assistant-admin-credit-history';

export type AccountProfile = {
  firstname: string;
  lastname: string;
  email: string;
};

export type CreditHistoryEntry = {
  id: string;
  type: 'purchase' | 'consume';
  credits: number;
  source: 'stripe' | 'generation';
  label: string;
  createdAt: string;
};

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

export function getPaidCredits(): number {
  if (typeof window === 'undefined') return 0;

  const raw = window.localStorage.getItem(PAID_CREDITS_KEY);
  return raw ? Math.max(0, Number(raw) || 0) : 0;
}

export function addPaidCredits(quantity = 1): number {
  if (typeof window === 'undefined') return 0;

  const safeQuantity = Math.max(0, Math.floor(quantity));
  const nextValue = getPaidCredits() + safeQuantity;
  window.localStorage.setItem(PAID_CREDITS_KEY, String(nextValue));
  return nextValue;
}

export function setPaidCredits(value: number): number {
  if (typeof window === 'undefined') return 0;

  const safeValue = Math.max(0, Math.floor(value));
  window.localStorage.setItem(PAID_CREDITS_KEY, String(safeValue));
  return safeValue;
}

export function consumePaidCredit(): number {
  if (typeof window === 'undefined') return 0;

  const nextValue = Math.max(0, getPaidCredits() - 1);
  window.localStorage.setItem(PAID_CREDITS_KEY, String(nextValue));
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

export function markCheckoutSessionProcessed(sessionId: string): boolean {
  if (typeof window === 'undefined' || !sessionId.trim()) return false;

  const raw = window.localStorage.getItem(PROCESSED_SESSIONS_KEY);
  const parsed = raw ? raw.split(',').map((value) => value.trim()).filter(Boolean) : [];

  if (parsed.includes(sessionId)) {
    return false;
  }

  parsed.push(sessionId);
  window.localStorage.setItem(PROCESSED_SESSIONS_KEY, parsed.join(','));
  return true;
}

export function getAccountProfile(): AccountProfile {
  if (typeof window === 'undefined') {
    return { firstname: '', lastname: '', email: '' };
  }

  const raw = window.localStorage.getItem(ACCOUNT_PROFILE_KEY);
  if (!raw) {
    return { firstname: '', lastname: '', email: '' };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AccountProfile> & { name?: string };
    const legacyName = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const legacyParts = legacyName ? legacyName.split(/\s+/) : [];
    const legacyFirstname = legacyParts.length > 0 ? legacyParts[0] : '';
    const legacyLastname = legacyParts.length > 1 ? legacyParts.slice(1).join(' ') : '';

    return {
      firstname:
        typeof parsed.firstname === 'string'
          ? parsed.firstname
          : legacyFirstname,
      lastname:
        typeof parsed.lastname === 'string'
          ? parsed.lastname
          : legacyLastname,
      email: typeof parsed.email === 'string' ? parsed.email : '',
    };
  } catch {
    return { firstname: '', lastname: '', email: '' };
  }
}

export function saveAccountProfile(profile: AccountProfile): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    ACCOUNT_PROFILE_KEY,
    JSON.stringify({
      firstname: profile.firstname.trim(),
      lastname: profile.lastname.trim(),
      email: profile.email.trim().toLowerCase(),
    })
  );
}

export function getCreditHistory(): CreditHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(CREDIT_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is CreditHistoryEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<CreditHistoryEntry>;
      return (
        typeof candidate.id === 'string' &&
        (candidate.type === 'purchase' || candidate.type === 'consume') &&
        typeof candidate.credits === 'number' &&
        (candidate.source === 'stripe' || candidate.source === 'generation') &&
        typeof candidate.label === 'string' &&
        typeof candidate.createdAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function clearStorageOnSignOut(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(PAID_CREDITS_KEY);
  window.localStorage.removeItem(PREMIUM_KEY);
  window.localStorage.removeItem(CREDIT_HISTORY_KEY);
  window.localStorage.removeItem(PROCESSED_SESSIONS_KEY);
  window.localStorage.removeItem(ACCOUNT_PROFILE_KEY);
}

export function addCreditHistoryEntry(entry: Omit<CreditHistoryEntry, 'id' | 'createdAt'>): CreditHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  const current = getCreditHistory();
  const nextEntry: CreditHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [nextEntry, ...current].slice(0, 50);
  window.localStorage.setItem(CREDIT_HISTORY_KEY, JSON.stringify(next));
  return next;
}

