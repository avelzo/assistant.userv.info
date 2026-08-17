type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedTimeToUtc(parts: Omit<ZonedParts, 'hour' | 'minute' | 'second'> & { hour?: number }, timeZone: string): Date {
  const hour = parts.hour ?? 0;
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, hour, 0, 0);
  const asZoned = zonedParts(new Date(guess), timeZone);
  const zonedAsUtc = Date.UTC(asZoned.year, asZoned.month - 1, asZoned.day, asZoned.hour, asZoned.minute, asZoned.second);
  return new Date(guess - (zonedAsUtc - guess));
}

export function creditDayKey(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function startOfCreditDay(date: Date, timeZone: string): Date {
  const parts = zonedParts(date, timeZone);
  return zonedTimeToUtc({ year: parts.year, month: parts.month, day: parts.day }, timeZone);
}

export function nextCreditResetAt(date: Date, timeZone: string): Date {
  const start = startOfCreditDay(date, timeZone);
  const nextGuess = new Date(start.getTime() + 36 * 60 * 60 * 1000);
  return startOfCreditDay(nextGuess, timeZone);
}

export function isSameCreditDay(left: Date, right: Date, timeZone: string): boolean {
  return creditDayKey(left, timeZone) === creditDayKey(right, timeZone);
}
