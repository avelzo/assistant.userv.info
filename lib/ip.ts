const DEFAULT_TRUSTED_HEADER = 'x-real-ip';

function headerName(): string {
  return (process.env.TRUSTED_IP_HEADER || DEFAULT_TRUSTED_HEADER).trim().toLowerCase() || DEFAULT_TRUSTED_HEADER;
}

function isSingleAddress(value: string): boolean {
  return value.length > 0 && !value.includes(',');
}

/**
 * IP client de confiance.
 * En production (derrière Nginx), n'utiliser que l'en-tête posé par le reverse proxy (X-Real-IP par défaut).
 * Ne jamais prendre le premier X-Forwarded-For : il est contrôlé par le client.
 * En dev (`npm run dev`, sans Nginx), repli local uniquement.
 */
export function getTrustedClientIp(request: Request): string {
  const trustedHeader = headerName();
  const trusted = request.headers.get(trustedHeader)?.trim();

  if (trusted && isSingleAddress(trusted)) {
    return trusted;
  }

  if (process.env.NODE_ENV !== 'production') {
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp && isSingleAddress(realIp)) {
      return realIp;
    }

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) {
      return forwarded;
    }
  }

  return 'unknown';
}
