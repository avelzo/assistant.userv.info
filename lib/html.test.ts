import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/lib/html';

describe('escapeHtml', () => {
  it('échappe les caractères HTML', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });
});
