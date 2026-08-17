import { describe, expect, it } from 'vitest';
import { readProviderTokenUsage } from '@/lib/ai/generate-letter';

describe('readProviderTokenUsage', () => {
  it('lit prompt_tokens / completion_tokens', () => {
    expect(
      readProviderTokenUsage({
        prompt_tokens: 80,
        completion_tokens: 120,
        total_tokens: 200,
      })
    ).toEqual({ inputTokens: 80, outputTokens: 120 });
  });

  it('lit input_tokens / output_tokens', () => {
    expect(
      readProviderTokenUsage({
        input_tokens: 11,
        output_tokens: 22,
      })
    ).toEqual({ inputTokens: 11, outputTokens: 22 });
  });
});
