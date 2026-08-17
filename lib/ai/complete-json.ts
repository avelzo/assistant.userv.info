import { estimateCostNanodollars } from '@/lib/credits/pricing';
import { MOCK_AI_USAGE } from '@/lib/ai/generate-letter';

export type ProviderJsonResult = {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
};

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

type OpenAiResponse = {
  model?: string;
  usage?: OpenAiUsage;
  choices?: Array<{ message?: { content?: string } }>;
};

export async function completeJsonObject(params: {
  system: string;
  user: string;
  mockContent: string;
  maxTokens?: number;
}): Promise<ProviderJsonResult> {
  if (process.env.MOCK_AI === 'true') {
    return {
      content: params.mockContent,
      provider: 'mock',
      model: 'mock-ai',
      inputTokens: MOCK_AI_USAGE.inputTokens,
      outputTokens: MOCK_AI_USAGE.outputTokens,
      estimatedCost: estimateCostNanodollars({
        provider: 'mock',
        model: 'mock-ai',
        inputTokens: MOCK_AI_USAGE.inputTokens,
        outputTokens: MOCK_AI_USAGE.outputTokens,
      }),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error('Service de génération indisponible.'), { status: 500 });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch(process.env.OPENAPI_URL || '', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      max_completion_tokens: params.maxTokens ?? 900,
    }),
  });

  const data = (await response.json()) as OpenAiResponse;
  if (!response.ok) {
    throw Object.assign(new Error('Erreur de génération. Réessayez plus tard.'), {
      status: response.status >= 400 && response.status < 500 ? 502 : response.status || 500,
    });
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw Object.assign(new Error('Réponse IA vide.'), { status: 502 });
  }

  const inputTokens = Math.max(0, Number(data.usage?.prompt_tokens ?? data.usage?.input_tokens) || 0);
  const outputTokens = Math.max(0, Number(data.usage?.completion_tokens ?? data.usage?.output_tokens) || 0);
  const resolvedModel = data.model || model;

  return {
    content,
    provider: 'openai',
    model: resolvedModel,
    inputTokens,
    outputTokens,
    estimatedCost: estimateCostNanodollars({
      provider: 'openai',
      model: resolvedModel,
      inputTokens,
      outputTokens,
    }),
  };
}
