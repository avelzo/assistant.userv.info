import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertRecaptcha } from '@/lib/recaptcha';

describe('assertRecaptcha', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refuse un token manquant', async () => {
    const result = await assertRecaptcha({ token: '', expectedAction: 'register' });
    expect(result).toEqual({ ok: false, reason: 'missing_token' });
  });

  it('refuse une action différente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          action: 'contact_form',
          score: 0.9,
          hostname: 'localhost',
        }),
      })
    );
    process.env.RECAPTCHA_SECRET_KEY = 'test';
    process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'localhost';

    const result = await assertRecaptcha({ token: 'abc', expectedAction: 'register' });
    expect(result).toEqual({ ok: false, reason: 'bad_action' });
  });

  it('refuse un hostname non autorisé', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          action: 'register',
          score: 0.9,
          hostname: 'evil.example',
        }),
      })
    );
    process.env.RECAPTCHA_SECRET_KEY = 'test';
    process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'assistant.userv.info';

    const result = await assertRecaptcha({ token: 'abc', expectedAction: 'register' });
    expect(result).toEqual({ ok: false, reason: 'bad_hostname' });
  });

  it('refuse un score insuffisant', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          action: 'register',
          score: 0.1,
          hostname: 'localhost',
        }),
      })
    );
    process.env.RECAPTCHA_SECRET_KEY = 'test';
    process.env.RECAPTCHA_MIN_SCORE = '0.5';
    process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'localhost';

    const result = await assertRecaptcha({ token: 'abc', expectedAction: 'register' });
    expect(result).toEqual({ ok: false, reason: 'low_score' });
  });
});
