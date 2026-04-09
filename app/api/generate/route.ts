import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GenerationBillingType, CreditLedgerEntryType } from '@prisma/client';
import { API_MAX_REQUESTS } from '@/lib/constants';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

type FreeTrialEntry = {
  used: boolean;
  timestamp: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();
const freeTrialMap = new Map<string, FreeTrialEntry>();
const WINDOW_MS = 60 * 60 * 1000; // 1h
const FREE_TRIAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
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
  try {
    const ipHeader = request.headers.get('x-forwarded-for');
    const ip = ipHeader?.split(',')[0]?.trim() || 'unknown';

    // Rate limiting
    const now = Date.now();
    const userData = rateLimitMap.get(ip) ?? { count: 0, lastReset: now };
    if (now - userData.lastReset > WINDOW_MS) {
      userData.count = 0;
      userData.lastReset = now;
    }
    userData.count += 1;
    rateLimitMap.set(ip, userData);

    if (userData.count > API_MAX_REQUESTS) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessaie plus tard.' }, { status: 429 });
    }

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

    // Vérifier session et crédits
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase() || '';

    const maxFreeGenerations = Number(process.env.NEXT_PUBLIC_FREE_GENERATIONS || '1');

    let billingType: GenerationBillingType = GenerationBillingType.FREE;
    let accountEmail: string | null = null;

    if (email) {
      // Utilisateur connecté
      accountEmail = email;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { freeGenerationsUsed: true },
      });

      const historicalFreeGenerations = await prisma.letterGeneration.count({
        where: {
          accountEmail: email,
          billingType: GenerationBillingType.FREE,
        },
      });

      const recordedFreeGenerationsUsed = user?.freeGenerationsUsed ?? 0;
      const freeGenerationsUsed = Math.max(recordedFreeGenerationsUsed, historicalFreeGenerations);

      if (user && historicalFreeGenerations > recordedFreeGenerationsUsed) {
        await prisma.user.update({
          where: { email },
          data: { freeGenerationsUsed: historicalFreeGenerations },
        });
      }

      if (freeGenerationsUsed >= maxFreeGenerations) {
        // Essai gratuit déjà utilisé, vérifier crédits payants
        const balance = await prisma.creditBalance.findUnique({ where: { email } });
        if (!balance || balance.credits < 1) {
          return NextResponse.json(
            { error: 'Vous n\'avez pas assez de crédits. Achetez-en ci-dessous.' },
            { status: 402 }
          );
        }
        billingType = GenerationBillingType.CREDIT;
      } else {
        // Essai gratuit disponible
        billingType = GenerationBillingType.FREE;
      }
    } else {
      // Utilisateur non connecté, vérifier essai gratuit par IP
      const trialEntry = freeTrialMap.get(ip);
      if (trialEntry && now - trialEntry.timestamp < FREE_TRIAL_WINDOW_MS && trialEntry.used) {
        return NextResponse.json(
          { error: 'Vous avez déjà utilisé votre essai gratuit. Créez un compte ou achetez des crédits.' },
          { status: 402 }
        );
      }
      billingType = GenerationBillingType.FREE;
    }

    // Appeler OpenAI
    const aiResponse = await fetch(process.env.OPENAPI_URL || '', {
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

    const aiData = (await aiResponse.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!aiResponse.ok) {
      return NextResponse.json(
        { error: aiData.error?.message || 'Erreur OpenAI.' },
        { status: aiResponse.status || 500 }
      );
    }

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Réponse IA vide.' }, { status: 502 });
    }

    const parsed = parseAiPayload(content);
    if (!parsed?.letter) {
      return NextResponse.json({ error: 'Format de réponse IA invalide.' }, { status: 502 });
    }

    // Créer la LetterGeneration et déduire crédits si nécessaire
    await prisma.$transaction(async (transaction) => {
      await transaction.letterGeneration.create({
        data: {
          accountEmail,
          category: body.category || 'Autre',
          tone: body.tone || 'Standard',
          fullName: body.fullName || null,
          recipient: body.recipient || null,
          subject: body.subject || null,
          details,
          attachments: body.attachments || null,
          letter: parsed.letter,
          emailVersion: parsed.emailVersion,
          billingType,
          creditsSpent: billingType === GenerationBillingType.FREE ? 0 : 1,
        },
      });

      if (billingType === GenerationBillingType.CREDIT && email) {
        // Déduire 1 crédit de la balance
        await transaction.creditBalance.update({
          where: { email },
          data: { credits: { decrement: 1 } },
        });

        // Créer une entrée de ledger
        await transaction.creditLedgerEntry.create({
          data: {
            accountEmail: email,
            delta: -1,
            type: CreditLedgerEntryType.CONSUMPTION,
            source: 'GENERATION',
            label: 'Génération d\'une lettre',
          },
        });
      } else if (billingType === GenerationBillingType.FREE && email) {
        await transaction.user.update({
          where: { email },
          data: { freeGenerationsUsed: { increment: 1 } },
        });
      } else if (billingType === GenerationBillingType.FREE && !email) {
        // Marquer l'essai gratuit comme utilisé pour cette IP
        freeTrialMap.set(ip, { used: true, timestamp: now });
      }
    });

    // Retourner la génération + crédits restants
    let remainingCredits = 0;
    if (email) {
      const updatedBalance = await prisma.creditBalance.findUnique({ where: { email } });
      remainingCredits = updatedBalance?.credits ?? 0;
    }

    return NextResponse.json(
      {
        letter: parsed.letter,
        emailVersion: parsed.emailVersion,
        billingType,
        remainingCredits,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur génération';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}