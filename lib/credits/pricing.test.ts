import { describe, expect, it } from 'vitest';
import { estimateCostNanodollars, nanodollarsToUsd } from '@/lib/credits/pricing';
import { AI_CREDIT_COSTS, approximatePackUsage, paidCreditsForPack } from '@/lib/credits/config';
import { MOCK_AI_USAGE } from '@/lib/ai/generate-letter';

describe('pricing and credit costs', () => {
  it('calcule un coût entier en nanodollars', () => {
    const cost = estimateCostNanodollars({
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(cost).toBe(1000 * 150 + 500 * 600);
    expect(nanodollarsToUsd(cost)).toBeCloseTo(0.00045);
  });

  it('utilise une consommation MOCK déterministe', () => {
    const cost = estimateCostNanodollars({
      provider: 'mock',
      model: 'mock-ai',
      inputTokens: MOCK_AI_USAGE.inputTokens,
      outputTokens: MOCK_AI_USAGE.outputTokens,
    });
    expect(cost).toBeGreaterThan(0);
  });

  it('mappe les packs historiques vers des crédits payants', () => {
    expect(paidCreditsForPack({ code: 'pack-1', credits: 1 })).toBe(AI_CREDIT_COSTS.GENERATE_LETTER);
    expect(paidCreditsForPack({ code: 'pack-30', credits: 30, creditsGranted: 30 })).toBe(30);
    expect(approximatePackUsage(80)).toEqual({ letters: 8, questions: 40 });
    expect(approximatePackUsage(200)).toEqual({ letters: 20, questions: 100 });
  });

  it('facture une lettre plus cher qu’une question', () => {
    expect(AI_CREDIT_COSTS.GENERATE_LETTER).toBeGreaterThan(AI_CREDIT_COSTS.ASK_QUESTION);
    expect(AI_CREDIT_COSTS.GENERATE_LETTER).toBeGreaterThan(AI_CREDIT_COSTS.REWRITE_SELECTION);
  });
});
