import { describe, expect, it } from 'vitest';
import { formatCount, formatUsdAmount } from '@/lib/admin/format';
import { operationTitle } from '@/lib/admin/labels';

describe('admin display', () => {
  it('formate USD et crédits sans mélanger les unités', () => {
    expect(formatUsdAmount(148_200_000)).toBe('$0.1482');
    expect(formatCount(1284)).toMatch(/1[\s\u00a0\u202f]284/);
  });

  it('expose un libellé métier pour chaque opération', () => {
    expect(operationTitle('ANALYZE_SITUATION')).toMatch(/démarche/i);
    expect(operationTitle('GENERATE_LETTER')).toBe('Rédaction');
    expect(operationTitle('REWRITE_SELECTION')).toBe('Reformulation');
    expect(operationTitle('REVISE_DOCUMENT')).toBe('Révision');
  });
});
