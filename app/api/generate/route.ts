import { NextResponse } from 'next/server';

type GenerateRequestBody = {
  category?: string;
  tone?: string;
  fullName?: string;
  recipient?: string;
  subject?: string;
  details?: string;
  attachments?: string;
};

type RateLimitEntry = {
  count: number;
  lastReset: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1h
const MOCK_AI = process.env.MOCK_AI === 'true';

const parseAiPayload = (raw: string): { letter: string; emailVersion: string } | null => {
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
};

export async function POST(request: Request) {
  if (MOCK_AI) {
    return NextResponse.json(
      {
        letter:
          "Objet : Demande de réexamen\n\nMadame, Monsieur,\n\nJe vous contacte afin de solliciter le réexamen de ma situation. Au regard des éléments transmis, je souhaite que mon dossier soit étudié à nouveau.\n\nJe reste à votre disposition pour fournir tout document complémentaire.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
        emailVersion:
          "Bonjour,\n\nJe souhaite demander le réexamen de mon dossier. Je reste disponible pour transmettre tout justificatif complémentaire.\n\nCordialement.",
      },
      { status: 200 }
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'API key manquante' }, { status: 500 });
  }

  const ipHeader = request.headers.get('x-forwarded-for');
  const ip = ipHeader?.split(',')[0]?.trim() || 'unknown';

  const now = Date.now();
  const userData = rateLimitMap.get(ip) ?? { count: 0, lastReset: now };

  if (now - userData.lastReset > WINDOW_MS) {
    userData.count = 0;
    userData.lastReset = now;
  }

  userData.count += 1;
  rateLimitMap.set(ip, userData);

  if (userData.count > MAX_REQUESTS) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 });
  }

  let body: GenerateRequestBody;
  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const details = body.details?.trim() || '';
  if (!details || details.length > 3000) {
    return NextResponse.json({ error: 'Description invalide.' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
              `Catégorie: ${body.category || 'Autre'}`,
              `Ton: ${body.tone || 'Standard'}`,
              `Nom: ${body.fullName || 'Non précisé'}`,
              `Destinataire: ${body.recipient || 'Non précisé'}`,
              `Objet demandé: ${body.subject || 'Non précisé'}`,
              `Détails: ${details}`,
              `Pièces jointes: ${body.attachments || 'Aucune'}`,
            ].join('\n'),
          },
        ],
        max_completion_tokens: 900,
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Erreur OpenAI.' },
        { status: response.status || 500 },
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Réponse IA vide.' }, { status: 502 });
    }

    const parsed = parseAiPayload(content);
    if (!parsed?.letter) {
      return NextResponse.json({ error: 'Format de réponse IA invalide.' }, { status: 502 });
    }

    return NextResponse.json({ letter: parsed.letter, emailVersion: parsed.emailVersion }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur génération' }, { status: 500 });
  }
}