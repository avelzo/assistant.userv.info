import { nanodollarsToUsd } from '@/lib/credits/pricing';

export function formatCount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function formatUsdAmount(nanodollars: number): string {
  const usd = nanodollarsToUsd(nanodollars);
  if (usd === 0) {
    return '$0';
  }
  if (Math.abs(usd) < 0.01) {
    return `$${usd.toFixed(6)}`;
  }
  return `$${usd.toFixed(4)}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function formatDayTick(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split('-');
  const day = Number(parts[2]);
  const month = Number(parts[1]);
  if (!day || !month) {
    return yyyyMmDd;
  }
  return `${day}/${month}`;
}
