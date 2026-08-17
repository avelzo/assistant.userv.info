import { describe, expect, it } from 'vitest';
import { maskEmail } from '@/lib/admin/mask-email';

describe('maskEmail', () => {
  it('masque la partie locale en conservant le domaine', () => {
    expect(maskEmail('laurent@userv.info')).toBe('la***@userv.info');
    expect(maskEmail('A@example.com')).toBe('a***@example.com');
  });

  it('refuse une valeur illisible', () => {
    expect(maskEmail('not-an-email')).toBe('***');
    expect(maskEmail('')).toBe('***');
  });
});
