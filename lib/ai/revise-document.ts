import { completeJsonObject } from '@/lib/ai/complete-json';
import { parseReviseDocument } from '@/lib/ai/payloads';

const SYSTEM_PROMPT = `Tu révises un courrier administratif francophone dans son ensemble.
Conserve les faits, destinataire et demande. L'utilisateur reste responsable du texte.
Réponds uniquement par un objet JSON :
- letter: courrier révisé, paragraphes séparés par une ligne vide, sans HTML ni Markdown
- emailSubject: objet d'e-mail éventuellement ajusté
- emailBody: version e-mail éventuellement ajustée`;

export function mockReviseDocumentContent(letter: string, emailSubject: string, emailBody: string): string {
  return JSON.stringify({
    letter: letter.trim(),
    emailSubject,
    emailBody,
  });
}

export async function reviseDocument(params: {
  letter: string;
  emailSubject: string;
  emailBody: string;
  instruction: string;
}) {
  const usage = await completeJsonObject({
    system: SYSTEM_PROMPT,
    user: [
      `Consigne: ${params.instruction}`,
      `Courrier actuel:\n${params.letter}`,
      `Objet e-mail: ${params.emailSubject}`,
      `E-mail:\n${params.emailBody}`,
    ].join('\n\n'),
    mockContent: mockReviseDocumentContent(params.letter, params.emailSubject, params.emailBody),
    maxTokens: 1200,
  });

  return {
    payload: parseReviseDocument(usage.content),
    usage,
  };
}
