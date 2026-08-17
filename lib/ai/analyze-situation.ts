import { completeJsonObject } from '@/lib/ai/complete-json';
import { parseAnalyzeSituation, type AnalyzeSituationPayload } from '@/lib/ai/payloads';
import { RECIPIENT_CATEGORIES } from '@/lib/dossiers/categories';
import type { DossierQuestion } from '@/lib/dossiers/questions';

export type AnalyzeSituationInput = {
  objective: string;
  recipientName: string;
  recipientCategory: string;
  context: string;
  questions: DossierQuestion[];
  sender: {
    fullName: string;
    city: string;
  };
  /** Un brouillon existe déjà. Ne jamais envoyer le texte du courrier. */
  hasDocument?: boolean;
};

export const ANALYZE_SITUATION_SYSTEM_PROMPT = `Tu es un copilote de DÉMARCHE administrative francophone.
Tu n'es pas un correcteur de courrier. Tu n'es pas un rédacteur.
Tu n'accomplis pas la démarche à la place de l'utilisateur.

Cette opération ANALYZE_SITUATION appartient à la colonne Démarche.
Elle intervient AVANT ou indépendamment de la rédaction.
La rédaction (GENERATE_LETTER, REWRITE_SELECTION, REVISE_DOCUMENT) est un autre rôle : ne le fais pas.

Ta tâche unique : analyser LA SITUATION.

1. Comprendre l'objectif de l'utilisateur.
2. Comprendre le destinataire.
3. Comprendre le contexte.
4. Déterminer quelles informations importantes manquent pour mener la démarche ou rédiger un courrier précis.
5. Générer 0..N questions vraiment utiles.
6. Fournir éventuellement un conseil de démarche succinct.

Règles pour les questions :
- Une question = une information concrète absente (date, montant, relance, réponse reçue, justificatif, délai…).
- Les questions doivent être utiles à la démarche ou au futur courrier.
- Ne demande JAMAIS une information déjà présente dans l'objectif, le destinataire, le contexte, le profil expéditeur ou les réponses déjà fournies.
- Ne pose pas de questions pour « produire des questions ». Si rien d'important ne manque, questions = [].
- Ne transforme pas cela en interrogatoire. Quelques questions importantes valent mieux que beaucoup de questions secondaires.
- 0 question est une réponse valide et souvent préférable. N'impose aucun minimum.

Règles pour le conseil (advice) :
- Court, à la 2e personne, sur la DÉMARCHE (ce que l'utilisateur peut faire ensuite).
- Distinct des questions : ne reformule pas les questions dans advice.
- Pas une critique de courrier. Pas une lettre. Pas un résumé de ce qui est déjà écrit.
- Formulations du type "vous pouvez" / "commencez par". Jamais "Assistant s'occupe de votre démarche".
- Ne présente jamais une information juridique comme certaine si elle dépend du contexte, d'un délai ou d'un texte précis.

Si un brouillon de courrier existe déjà : note-le seulement comme un fait. Analyse toujours la situation, jamais le texte du document. Ne révise pas, ne commente pas et ne réécris pas le courrier.

Réponds uniquement par un objet JSON avec :
- recipientCategory: une valeur parmi ${RECIPIENT_CATEGORIES.join(', ')} ou une chaîne vide
- suggestedTone: ton recommandé, court (ex. "ferme et courtois")
- questions: tableau d'objets { "prompt": "..." } (0 à 6)
- advice: conseil de démarche succinct`;

const MONTHS =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function knownFactsText(input: AnalyzeSituationInput): string {
  const answers = input.questions
    .filter((question) => question.answer.trim())
    .map((question) => `${question.prompt} ${question.answer}`)
    .join(' ');
  return fold(
    [
      input.objective,
      input.recipientName,
      input.recipientCategory,
      input.context,
      answers,
      input.sender.fullName,
      input.sender.city,
    ].join(' ')
  );
}

function hasAmount(text: string): boolean {
  return /\d[\d\s.,]*\s*(€|euros?)/.test(text);
}

function hasDate(text: string): boolean {
  return new RegExp(`\\d{1,2}[\\/.-]\\d{1,2}|20\\d{2}|\\b(?:${MONTHS})\\b`, 'i').test(text);
}

function hasKeysHandover(text: string): boolean {
  return /\bcles\b|remise des cles|rendu les cles/.test(text);
}

function hasEtatDesLieux(text: string): boolean {
  return /etat des lieux|degradation/.test(text);
}

function hasRelance(text: string): boolean {
  return /relance|deja (ecrit|demande|envoye)|mise en demeure|reponse (du |de )?(proprieta|bailleur)/.test(
    text
  );
}

function isHousingDepositCase(text: string): boolean {
  return /caution|depot de garantie|proprieta|bailleur/.test(text);
}

/** Questions mockées à partir des faits manquants — 0 est valide. */
export function mockMissingSituationQuestions(input: AnalyzeSituationInput): string[] {
  const known = knownFactsText(input);
  const questions: string[] = [];

  if (isHousingDepositCase(known)) {
    if (!hasDate(known) && !hasKeysHandover(known)) {
      questions.push('Quand avez-vous rendu les clés ?');
    }
    if (!hasAmount(known)) {
      questions.push('Quel était le montant du dépôt de garantie ?');
    }
    if (!hasEtatDesLieux(known)) {
      questions.push("L'état des lieux de sortie mentionnait-il des dégradations ?");
    }
    if (!hasRelance(known)) {
      questions.push(
        'Votre propriétaire vous a-t-il donné une raison ou avez-vous déjà effectué une relance ?'
      );
    }
    return questions;
  }

  if (!hasDate(known)) {
    questions.push('À quelle date les faits se sont-ils produits ?');
  }
  if (!hasRelance(known)) {
    questions.push('Avez-vous déjà envoyé une relance écrite ?');
  }
  return questions;
}

function inferMockCategory(input: AnalyzeSituationInput): string {
  const haystack = knownFactsText(input);
  if (isHousingDepositCase(haystack) || haystack.includes('loyer')) {
    return 'Propriétaire';
  }
  if (
    haystack.includes('caf') ||
    haystack.includes('prefecture') ||
    haystack.includes('mairie') ||
    haystack.includes('impot')
  ) {
    return 'Administration';
  }
  if (haystack.includes('banque') || haystack.includes('credit')) return 'Banque';
  if (haystack.includes('assurance')) return 'Assurance';
  if (haystack.includes('employeur') || haystack.includes('salaire')) return 'Employeur';
  if (input.recipientName.trim()) return 'Entreprise';
  return '';
}

export function buildAnalyzeSituationUserMessage(input: AnalyzeSituationInput): string {
  const answered = input.questions.filter((question) => question.answer.trim());
  return [
    "Analyse LA SITUATION (objectif, destinataire, contexte). Ce n'est pas une révision de courrier.",
    "Aucun texte de document n'est fourni. Ne commente pas, ne révise pas et ne réécris pas un courrier.",
    `Un brouillon de courrier existe déjà : ${input.hasDocument ? 'oui' : 'non'}.`,
    input.hasDocument
      ? "S'il existe un brouillon, note-le seulement comme un fait. Ton rôle reste d'identifier les informations manquantes pour la démarche."
      : '',
    `Objectif: ${input.objective || '(non précisé)'}`,
    `Destinataire: ${input.recipientName || '(non précisé)'}`,
    `Catégorie déjà indiquée: ${input.recipientCategory || '(à inférer)'}`,
    `Contexte: ${input.context || '(non précisé)'}`,
    answered.length
      ? `Réponses déjà fournies:\n${answered.map((question) => `- ${question.prompt}: ${question.answer}`).join('\n')}`
      : 'Aucune réponse complémentaire pour l’instant.',
    `Expéditeur: ${input.sender.fullName || '(non précisé)'}${input.sender.city ? `, ${input.sender.city}` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function mockAnalyzeSituationContent(input: AnalyzeSituationInput): string {
  const questions = mockMissingSituationQuestions(input);
  return JSON.stringify({
    recipientCategory: inferMockCategory(input) || 'Particulier',
    suggestedTone: 'ferme et courtois',
    questions: questions.map((prompt) => ({ prompt })),
    advice:
      questions.length === 0
        ? 'Le dossier contient les éléments utiles pour une demande écrite. Vous pouvez passer à la rédaction du courrier.'
        : 'Vous pouvez rassembler les faits manquants ci-dessus, puis relancer par écrit en rappelant l’objectif, les dates et les montants. Conservez une copie et les justificatifs.',
  });
}

export async function analyzeSituation(input: AnalyzeSituationInput): Promise<{
  payload: AnalyzeSituationPayload;
  usage: Awaited<ReturnType<typeof completeJsonObject>>;
}> {
  const usage = await completeJsonObject({
    system: ANALYZE_SITUATION_SYSTEM_PROMPT,
    user: buildAnalyzeSituationUserMessage(input),
    mockContent: mockAnalyzeSituationContent(input),
    maxTokens: 900,
  });

  return {
    payload: parseAnalyzeSituation(usage.content),
    usage,
  };
}
