import { AiOperation, AiUsageStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { formatUsdFromNanodollars, getAiUsageDashboard, rangeStart } from '@/lib/admin/ai-usage-stats';

describe('ai-usage-stats', () => {
  it('formate les petits montants USD avec assez de décimales', () => {
    expect(formatUsdFromNanodollars(0)).toBe('0.000000 USD');
    expect(formatUsdFromNanodollars(450_000)).toBe('0.000450 USD');
    expect(formatUsdFromNanodollars(1_200_000)).toBe('0.001200 USD');
    expect(formatUsdFromNanodollars(25_000_000)).toBe('0.0250 USD');
  });

  it('ancre aujourd’hui et 7 jours sur Europe/Paris', () => {
    const now = new Date('2026-08-16T01:30:00.000Z');
    const today = rangeStart('today', now, 'Europe/Paris');
    const week = rangeStart('7d', now, 'Europe/Paris');
    expect(today.toISOString()).toBe('2026-08-15T22:00:00.000Z');
    expect(week.getTime()).toBe(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  });

  it('agrège AiUsage SETTLED par opération sans inventer de données sensibles', async () => {
    const groupBy = vi.fn().mockResolvedValue([
      {
        operation: AiOperation.ANALYZE_SITUATION,
        _count: { _all: 2 },
        _sum: { inputTokens: 100, outputTokens: 40, estimatedCost: 450_000, creditsCharged: 10 },
      },
      {
        operation: AiOperation.GENERATE_LETTER,
        _count: { _all: 1 },
        _sum: { inputTokens: 200, outputTokens: 80, estimatedCost: 900_000, creditsCharged: 10 },
      },
    ]);

    const findMany = vi.fn().mockResolvedValue([
      {
        userId: 'u1',
        createdAt: new Date('2026-08-16T08:00:00.000+02:00'),
        estimatedCost: 450_000,
        creditsCharged: 5,
      },
      {
        userId: 'u1',
        createdAt: new Date('2026-08-16T09:00:00.000+02:00'),
        estimatedCost: 450_000,
        creditsCharged: 5,
      },
      {
        userId: 'u2',
        createdAt: new Date('2026-08-15T10:00:00.000+02:00'),
        estimatedCost: 900_000,
        creditsCharged: 10,
      },
    ]);

    const dashboard = await getAiUsageDashboard('7d', {
      prisma: { aiUsage: { groupBy, findMany } } as never,
      now: () => new Date('2026-08-16T12:00:00.000+02:00'),
      timeZone: 'Europe/Paris',
    });

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['operation'],
        where: expect.objectContaining({ status: AiUsageStatus.SETTLED }),
      })
    );
    expect(dashboard.totals.calls).toBe(3);
    expect(dashboard.totals.creditsCharged).toBe(20);
    expect(dashboard.totals.estimatedCostUsd).toBe('0.001350 USD');
    expect(dashboard.byOperation).toHaveLength(4);
    expect(dashboard.byOperation.find((row) => row.operation === 'REWRITE_SELECTION')?.calls).toBe(0);
    expect(dashboard.currency).toBe('USD');
    expect(dashboard.totals.totalTokens).toBe(420);
    expect(dashboard.totals.activeUsers).toBe(2);
    expect(dashboard.series.length).toBeGreaterThanOrEqual(7);
    expect(dashboard.series.reduce((sum, point) => sum + point.calls, 0)).toBe(3);
  });
});
