export type LegalIdentity = {
  siteName: string;
  siteUrl: string;
  publisher: string;
  address: string;
  siret: string;
  host: string;
  contactEmail: string;
  director: string;
};

export function legalIdentity(): LegalIdentity {
  return {
    siteName: 'Assistant',
    siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://assistant.userv.info',
    publisher: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER || 'À compléter',
    address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || 'À compléter',
    siret: process.env.NEXT_PUBLIC_LEGAL_SIRET || 'À compléter',
    host: process.env.NEXT_PUBLIC_LEGAL_HOST || 'À compléter',
    contactEmail: process.env.NEXT_PUBLIC_SERVER_EMAIL || 'assistant@userv.info',
    director: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR || process.env.NEXT_PUBLIC_LEGAL_PUBLISHER || 'À compléter',
  };
}
