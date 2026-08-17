import { formatCount, formatDayTick } from '@/lib/admin/format';
import { operationCode, operationTitle } from '@/lib/admin/labels';
import type { AiUsageDayPoint, AiUsageOperationStats } from '@/lib/admin/ai-usage-stats';

type CallsBarChartProps = {
  series: AiUsageDayPoint[];
};

export function CallsBarChart({ series }: CallsBarChartProps) {
  const max = Math.max(...series.map((point) => point.calls), 1);
  const labelEvery = series.length > 12 ? Math.ceil(series.length / 6) : 1;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-medium text-ink">Évolution des appels IA</p>
        <p className="font-mono text-[0.68rem] text-muted">appels / jour</p>
      </div>
      {series.every((point) => point.calls === 0) ? (
        <p className="mt-6 text-sm text-muted">Aucune activité sur la période.</p>
      ) : (
        <div className="mt-5 flex h-36 items-end gap-px sm:gap-1">
          {series.map((point, index) => (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full max-w-6 rounded-t bg-primary/85 hover:bg-primary"
                style={{ height: `${Math.max(4, (point.calls / max) * 100)}%` }}
                title={`${point.date} · ${point.calls} appel${point.calls > 1 ? 's' : ''}`}
              />
              {index % labelEvery === 0 || index === series.length - 1 ? (
                <span className="hidden text-[0.58rem] text-muted sm:block">{formatDayTick(point.date)}</span>
              ) : (
                <span className="h-3" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CostLineChartProps = {
  series: AiUsageDayPoint[];
};

export function CostLineChart({ series }: CostLineChartProps) {
  const width = 360;
  const height = 128;
  const padX = 8;
  const padY = 10;
  const max = Math.max(...series.map((point) => point.estimatedCostNanodollars), 1);
  const coords = series.map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(series.length - 1, 1);
    const y = height - padY - (point.estimatedCostNanodollars / max) * (height - padY * 2);
    return { x, y };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;
  const empty = series.every((point) => point.estimatedCostNanodollars === 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-medium text-ink">Évolution du coût provider</p>
        <p className="font-mono text-[0.68rem] text-muted">USD / jour</p>
      </div>
      {empty ? (
        <p className="mt-6 text-sm text-muted">Aucun coût estimé sur la période.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-36 w-full" role="img" aria-label="Coût provider par jour">
          <polygon points={area} fill="#2c5850" fillOpacity="0.08" />
          <polyline points={line} fill="none" stroke="#2c5850" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

type CreditsByOperationChartProps = {
  rows: AiUsageOperationStats[];
};

export function CreditsByOperationChart({ rows }: CreditsByOperationChartProps) {
  const max = Math.max(...rows.map((row) => row.creditsCharged), 1);

  return (
    <div>
      <p className="text-sm font-medium text-ink">Répartition des crédits par opération</p>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.operation}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{operationTitle(row.operation)}</p>
                <p className="font-mono text-[0.65rem] text-muted">{operationCode(row.operation)}</p>
              </div>
              <p className="shrink-0 font-mono text-xs text-ink">{formatCount(row.creditsCharged)}</p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-desk">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(row.creditsCharged === 0 ? 0 : 4, (row.creditsCharged / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

