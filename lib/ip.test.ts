import { describe, expect, it } from 'vitest';
import { getTrustedClientIp } from '@/lib/ip';

describe('getTrustedClientIp', () => {
  it('utilise X-Real-IP lorsqu’il est unique', () => {
    const request = new Request('http://localhost/api', {
      headers: {
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '1.2.3.4, 10.0.0.1',
      },
    });

    expect(getTrustedClientIp(request)).toBe('203.0.113.10');
  });

  it('ignore un X-Real-IP contenant une liste', () => {
    const request = new Request('http://localhost/api', {
      headers: {
        'x-real-ip': '1.2.3.4, 5.6.7.8',
      },
    });

    expect(getTrustedClientIp(request)).not.toBe('1.2.3.4, 5.6.7.8');
  });
});
