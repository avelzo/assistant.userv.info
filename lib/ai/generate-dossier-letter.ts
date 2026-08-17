import { completeJsonObject } from '@/lib/ai/complete-json';
import { parseGeneratedLetter } from '@/lib/ai/payloads';
import { MOCK_LETTER_PAYLOAD } from '@/lib/ai/generate-letter';
import type { DossierQuestion } from '@/lib/dossiers/questions';

export type GenerateDossierLetterInput = {
  objective: string;
  recipientName: string;
  recipientCategory: string;
  suggestedTone: string;
  context: string;
  advice: string;
  questions: DossierQuestion[];
  sender: {
    fullName: string;
    addressLine: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
  };
};

const SYSTEM_PROMPT = `Tu rédiges un courrier administratif francophone à partir d'un dossier.
L'utilisateur reste responsable du texte final. Tu ne prétends pas accomplir la démarche.
Ne présente pas comme certaine une règle juridique incertaine ou dépendante du contexte.
Réponds uniquement par un objet JSON avec :
- letter: lettre formelle complète (coordonnées si possibles, date, objet, corps, formule de politesse, signature textuelle). Paragraphes séparés par une ligne vide. Pas de HTML, pas de Markdown.
- emailSubject: objet d'e-mail court
- emailBody: version e-mail polie et concise, sans HTML`;

export function mockGeneratedLetterContent(input: GenerateDossierLetterInput): string {
  const recipient = input.recipientName || 'Madame, Monsieur';
  const sender = input.sender.fullName || 'L’expéditeur';
  return JSON.stringify({
    letter: [
      sender,
      input.sender.addressLine,
      [input.sender.postalCode, input.sender.city].filter(Boolean).join(' '),
      '',
      recipient,
      '',
      'Objet : Demande relative à votre dossier',
      '',
      'Madame, Monsieur,',
      '',
      input.objective || MOCK_LETTER_PAYLOAD.letter,
      '',
      input.context ? `Pour rappel : ${input.context}` : '',
      '',
      'Je reste à votre disposition pour tout complément.',
      '',
      'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
      '',
      sender,
    ]
      .filter((line) => line !== undefined)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
    emailSubject: 'Demande relative à votre dossier',
    emailBody: MOCK_LETTER_PAYLOAD.emailVersion,
  });
}

export async function generateDossierLetter(input: GenerateDossierLetterInput) {
  const answers = input.questions.filter((question) => question.prompt.trim());
  const user = [
    `Objectif: ${input.objective}`,
    `Destinataire: ${input.recipientName || '(non précisé)'}`,
    `Catégorie: ${input.recipientCategory || '(non précisée)'}`,
    `Ton suggéré: ${input.suggestedTone || 'professionnel et courtois'}`,
    `Contexte: ${input.context || '(non précisé)'}`,
    input.advice ? `Conseil de démarche déjà formulé (à respecter, sans le recopier tel quel dans la lettre): ${input.advice}` : '',
    answers.length
      ? `Questions / réponses:\n${answers.map((question) => `- ${question.prompt}: ${question.answer || '(sans réponse)'}`).join('\n')}`
      : '',
    `Profil expéditeur: ${input.sender.fullName || '(non précisé)'}`,
    input.sender.addressLine,
    `${input.sender.postalCode} ${input.sender.city}`.trim(),
    input.sender.phone,
    input.sender.email,
  ]
    .filter(Boolean)
    .join('\n');

  const usage = await completeJsonObject({
    system: SYSTEM_PROMPT,
    user,
    mockContent: mockGeneratedLetterContent(input),
    maxTokens: 1200,
  });

  return {
    payload: parseGeneratedLetter(usage.content),
    usage,
  };
}
