import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedOrigin, rejectIfDisallowedOrigin } from '@/lib/origin';

const originalEnv = { ...process.env };

function request(headers: Record<string, string>) {
  return new Request('http://localhost:3000/api/dossiers', { headers });
}

describe('isAllowedOrigin', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepte Origin localhost:3000', () => {
    expect(isAllowedOrigin(request({ Origin: 'http://localhost:3000' }))).toBe(true);
  });

  it('accepte Origin 127.0.0.1:3000', () => {
    expect(isAllowedOrigin(request({ Origin: 'http://127.0.0.1:3000' }))).toBe(true);
  });

  it('refuse une Origin non autorisée', () => {
    expect(isAllowedOrigin(request({ Origin: 'https://evil.example' }))).toBe(false);
    const rejected = rejectIfDisallowedOrigin(request({ Origin: 'https://evil.example' }));
    expect(rejected?.status).toBe(403);
  });

  it('refuse une requête sans Origin, sans Referer et sans Sec-Fetch-Site', () => {
    expect(isAllowedOrigin(request({}))).toBe(false);
  });

  it('accepte un GET same-origin sans Origin (Sec-Fetch-Site)', () => {
    expect(isAllowedOrigin(request({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(true);
  });

  it('accepte un Referer dont l’origine est autorisée', () => {
    expect(isAllowedOrigin(request({ Referer: 'http://localhost:3000/generate' }))).toBe(true);
  });

  it('refuse Sec-Fetch-Site cross-site sans Origin autorisée', () => {
    expect(
      isAllowedOrigin(
        request({
          'Sec-Fetch-Site': 'cross-site',
          Origin: 'https://evil.example',
        })
      )
    ).toBe(false);
  });
});
