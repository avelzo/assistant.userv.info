import { estimateCostNanodollars } from '@/lib/credits/pricing';

export const MOCK_AI_USAGE = {
  inputTokens: 120,
  outputTokens: 240,
} as const;

export const MOCK_LETTER_PAYLOAD = {
  letter:
    "Objet : Demande de réexamen\n\nMadame, Monsieur,\n\nJe vous contacte afin de solliciter le réexamen de ma situation. Au regard des éléments transmis, je souhaite que mon dossier soit étudié à nouveau.\n\nJe reste à votre disposition pour fournir tout document complémentaire.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  emailVersion:
    "Bonjour,\n\nJe souhaite demander le réexamen de mon dossier. Je reste disponible pour transmettre tout justificatif complémentaire.\n\nCordialement.",
};

export type LetterGenerationResult = {
  letter: string;
  emailVersion: string;
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
  total_tokens?: number;
};

type OpenAiResponse = {
  model?: string;
  usage?: OpenAiUsage;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export function readProviderTokenUsage(usage?: OpenAiUsage): { inputTokens: number; outputTokens: number } {
  const inputTokens = Math.max(0, Number(usage?.prompt_tokens ?? usage?.input_tokens) || 0);
  const outputTokens = Math.max(0, Number(usage?.completion_tokens ?? usage?.output_tokens) || 0);
  return { inputTokens, outputTokens };
}

function parseLetterPayload(raw: string): { letter: string; emailVersion: string } | null {
  try {
    const parsed = JSON.parse(raw) as { letter?: unknown; emailVersion?: unknown };
    if (typeof parsed.letter !== 'string') {
      return null;
    }
    return {
      letter: parsed.letter.trim(),
      emailVersion: typeof parsed.emailVersion === 'string' ? parsed.emailVersion.trim() : '',
    };
  } catch {
    return null;
  }
}

export async function generateLetterContent(params: {
  category: string;
  tone: string;
  fullName: string;
  recipient: string;
  subject: string;
  details: string;
  attachments: string;
}): Promise<LetterGenerationResult> {
  if (process.env.MOCK_AI === 'true') {
    return {
      ...MOCK_LETTER_PAYLOAD,
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
        {
          role: 'system',
          content:
            'Tu es un assistant administratif francophone. Rends strictement un objet JSON avec deux clés: "letter" et "emailVersion". "letter": lettre formelle complète en français (Objet, formule d\'ouverture, corps clair, formule de clôture), max 250 mots. "emailVersion": version email concise et polie, max 140 mots.',
        },
        {
          role: 'user',
          content: [
            `Catégorie: ${params.category}`,
            `Ton: ${params.tone}`,
            `Nom: ${params.fullName}`,
            `Destinataire: ${params.recipient}`,
            `Objet demandé: ${params.subject}`,
            `Détails: ${params.details}`,
            `Pièces jointes: ${params.attachments}`,
          ].join('\n'),
        },
      ],
      max_completion_tokens: 900,
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

  const parsed = parseLetterPayload(content);
  if (!parsed?.letter) {
    throw Object.assign(new Error('Format de réponse IA invalide.'), { status: 502 });
  }

  const { inputTokens, outputTokens } = readProviderTokenUsage(data.usage);
  const resolvedModel = data.model || model;

  return {
    ...parsed,
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
