import { AiOperation, AiUsageStatus } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { getCreditTimeZone } from '@/lib/credits/config';
import { nanodollarsToUsd } from '@/lib/credits/pricing';
import { creditDayKey, nextCreditResetAt, startOfCreditDay } from '@/lib/credits/timezone';

export const AI_USAGE_RANGES = ['today', '7d', '30d'] as const;
export type AiUsageRange = (typeof AI_USAGE_RANGES)[number];

export const AI_USAGE_DASHBOARD_OPERATIONS = [
  AiOperation.ANALYZE_SITUATION,
  AiOperation.GENERATE_LETTER,
  AiOperation.REWRITE_SELECTION,
  AiOperation.REVISE_DOCUMENT,
] as const;

export function isAiUsageRange(value: unknown): value is AiUsageRange {
  return typeof value === 'string' && (AI_USAGE_RANGES as readonly string[]).includes(value);
}

export function rangeStart(range: AiUsageRange, now = new Date(), timeZone = getCreditTimeZone()): Date {
  const todayStart = startOfCreditDay(now, timeZone);
  if (range === 'today') {
    return todayStart;
  }
  const days = range === '7d' ? 7 : 30;
  return new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
}

export function formatUsdFromNanodollars(nanodollars: number): string {
  const usd = nanodollarsToUsd(nanodollars);
  if (usd === 0) {
    return '0.000000 USD';
  }
  if (Math.abs(usd) < 0.01) {
    return `${usd.toFixed(6)} USD`;
  }
  return `${usd.toFixed(4)} USD`;
}

type UsageRow = {
  userId: string;
  createdAt: Date;
  estimatedCost: number;
  creditsCharged: number;
};

type PrismaLike = {
  aiUsage: {
    groupBy: typeof defaultPrisma.aiUsage.groupBy;
    findMany: (args: unknown) => Promise<UsageRow[]>;
  };
};

export type AiUsageDayPoint = {
  date: string;
  calls: number;
  estimatedCostNanodollars: number;
  creditsCharged: number;
};

export type AiUsageOperationStats = {
  operation: (typeof AI_USAGE_DASHBOARD_OPERATIONS)[number];
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostNanodollars: number;
  estimatedCostUsd: string;
  creditsCharged: number;
};

export type AiUsageDashboard = {
  range: AiUsageRange;
  from: string;
  to: string;
  currency: 'USD';
  totals: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostNanodollars: number;
    estimatedCostUsd: string;
    creditsCharged: number;
    activeUsers: number;
  };
  byOperation: AiUsageOperationStats[];
  series: AiUsageDayPoint[];
};

export function enumerateCreditDayKeys(from: Date, to: Date, timeZone: string): string[] {
  const keys: string[] = [];
  let cursor = startOfCreditDay(from, timeZone);
  const end = startOfCreditDay(to, timeZone);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(creditDayKey(cursor, timeZone));
    cursor = nextCreditResetAt(cursor, timeZone);
  }
  return keys;
}

export function bucketUsageByDay(rows: UsageRow[], dayKeys: string[], timeZone: string): AiUsageDayPoint[] {
  const byDay = new Map(
    dayKeys.map((date) => [date, { date, calls: 0, estimatedCostNanodollars: 0, creditsCharged: 0 }])
  );
  for (const row of rows) {
    const key = creditDayKey(row.createdAt, timeZone);
    const bucket = byDay.get(key);
    if (!bucket) {
      continue;
    }
    bucket.calls += 1;
    bucket.estimatedCostNanodollars += row.estimatedCost;
    bucket.creditsCharged += row.creditsCharged;
  }
  return dayKeys.map((date) => byDay.get(date)!);
}

export async function getAiUsageDashboard(
  range: AiUsageRange,
  deps: { prisma?: PrismaLike; now?: () => Date; timeZone?: string } = {}
): Promise<AiUsageDashboard> {
  const db = (deps.prisma ?? defaultPrisma) as PrismaLike;
  const now = deps.now?.() ?? new Date();
  const timeZone = deps.timeZone ?? getCreditTimeZone();
  const from = rangeStart(range, now, timeZone);
  const usageWhere = {
    createdAt: { gte: from, lte: now },
    status: AiUsageStatus.SETTLED,
    operation: { in: [...AI_USAGE_DASHBOARD_OPERATIONS] },
  };

  const [grouped, rows] = await Promise.all([
    db.aiUsage.groupBy({
      by: ['operation'],
      where: usageWhere,
      _count: { _all: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        creditsCharged: true,
      },
    }),
    db.aiUsage.findMany({
      where: usageWhere,
      select: { userId: true, createdAt: true, estimatedCost: true, creditsCharged: true },
    }),
  ]);

  const byKey = new Map(grouped.map((row) => [row.operation, row]));
  const byOperation = AI_USAGE_DASHBOARD_OPERATIONS.map((operation) => {
    const row = byKey.get(operation);
    const estimatedCostNanodollars = row?._sum.estimatedCost ?? 0;
    return {
      operation,
      calls: row?._count._all ?? 0,
      inputTokens: row?._sum.inputTokens ?? 0,
      outputTokens: row?._sum.outputTokens ?? 0,
      estimatedCostNanodollars,
      estimatedCostUsd: formatUsdFromNanodollars(estimatedCostNanodollars),
      creditsCharged: row?._sum.creditsCharged ?? 0,
    };
  });

  const totals = byOperation.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      inputTokens: acc.inputTokens + row.inputTokens,
      outputTokens: acc.outputTokens + row.outputTokens,
      estimatedCostNanodollars: acc.estimatedCostNanodollars + row.estimatedCostNanodollars,
      creditsCharged: acc.creditsCharged + row.creditsCharged,
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostNanodollars: 0, creditsCharged: 0 }
  );
  const series = bucketUsageByDay(rows, enumerateCreditDayKeys(from, now, timeZone), timeZone);
  const activeUsers = new Set(rows.map((row) => row.userId)).size;

  return {
    range,
    from: from.toISOString(),
    to: now.toISOString(),
    currency: 'USD',
    totals: {
      ...totals,
      totalTokens: totals.inputTokens + totals.outputTokens,
      estimatedCostUsd: formatUsdFromNanodollars(totals.estimatedCostNanodollars),
      activeUsers,
    },
    byOperation,
    series,
  };
}
