/**
 * Tarifs provider — source : documentation OpenAI (août 2026).
 * https://developers.openai.com/api/docs/pricing
 *
 * gpt-4o-mini : 0,15 USD / 1M input, 0,60 USD / 1M output.
 * Les prix évoluent : modifier uniquement cette table.
 *
 * Unité stored : nanodollars USD (1 USD = 1_000_000_000).
 */
export type ProviderPrice = {
  provider: string;
  model: string;
  inputNanodollarsPerToken: number;
  outputNanodollarsPerToken: number;
  source: string;
  asOf: string;
};

const USD_NANODOLLARS = 1_000_000_000;

export const PROVIDER_PRICES: ProviderPrice[] = [
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputNanodollarsPerToken: 150,
    outputNanodollarsPerToken: 600,
    source: 'https://developers.openai.com/api/docs/pricing',
    asOf: '2026-08-15',
  },
  {
    provider: 'mock',
    model: 'mock-ai',
    inputNanodollarsPerToken: 150,
    outputNanodollarsPerToken: 600,
    source: 'deterministic test mirror of gpt-4o-mini',
    asOf: '2026-08-15',
  },
];

export function findProviderPrice(provider: string, model: string): ProviderPrice {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedModel = model.trim().toLowerCase();
  const exact = PROVIDER_PRICES.find(
    (row) => row.provider === normalizedProvider && row.model === normalizedModel
  );
  if (exact) {
    return exact;
  }

  const providerDefault = PROVIDER_PRICES.find((row) => row.provider === normalizedProvider);
  if (providerDefault) {
    return providerDefault;
  }

  return PROVIDER_PRICES[0];
}

export function estimateCostNanodollars(params: {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const price = findProviderPrice(params.provider, params.model);
  const input = Math.max(0, Math.floor(params.inputTokens));
  const output = Math.max(0, Math.floor(params.outputTokens));
  return input * price.inputNanodollarsPerToken + output * price.outputNanodollarsPerToken;
}

export function nanodollarsToUsd(nanodollars: number): number {
  return nanodollars / USD_NANODOLLARS;
}
