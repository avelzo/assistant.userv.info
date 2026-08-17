import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('password bcrypt', () => {
  it('accepte un hash bcrypt existant', async () => {
    const password = 'legacy-pass-12';
    const hash = await hashPassword(password);

    await expect(verifyPassword({ password, hash })).resolves.toBe(true);
    await expect(verifyPassword({ password: 'wrong-password', hash })).resolves.toBe(false);
  });

  it('refuse un hash non bcrypt', async () => {
    await expect(
      verifyPassword({ password: 'password12', hash: 'not-a-bcrypt-hash' })
    ).resolves.toBe(false);
  });
});
