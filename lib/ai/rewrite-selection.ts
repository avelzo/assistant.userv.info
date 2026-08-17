import { completeJsonObject } from '@/lib/ai/complete-json';
import { parseRewriteSelection } from '@/lib/ai/payloads';
import { REWRITE_ACTION_LABELS, type RewriteAction } from '@/lib/dossiers/categories';

const ACTION_INSTRUCTIONS: Record<RewriteAction, string> = {
  reformulate: 'Reformule le passage en conservant le sens et le niveau de langue.',
  more_formal: 'Rends le passage plus formel, sans le allonger inutilement.',
  firmer: 'Rends le passage plus ferme, tout en restant poli et factuel.',
  warmer: 'Rends le passage plus cordial, sans familiarité excessive.',
  simplify: 'Simplifie le vocabulaire et la syntaxe.',
  shorten: 'Raccourcis le passage en gardant l’essentiel.',
  expand: 'Développe légèrement le passage, sans changer la demande.',
  custom: 'Applique strictement la consigne utilisateur au passage sélectionné uniquement.',
};

const SYSTEM_PROMPT = `Tu modifies uniquement le fragment de courrier fourni.
Ne réécris pas la lettre entière. Ne renvoie pas le contexte autour.
Réponds uniquement par un objet JSON { "replacement": "..." } : le nouveau texte qui remplace exactement la sélection.
Pas de HTML, pas de Markdown, pas de guillemets explicatifs.`;

export function mockRewriteSelectionContent(selectedText: string, action: RewriteAction): string {
  if (selectedText === 'bien vouloir') {
    return JSON.stringify({ replacement: 'procéder à' });
  }
  if (action === 'shorten') {
    const shortened = selectedText.trim().split(/\s+/).slice(0, Math.max(1, Math.ceil(selectedText.trim().split(/\s+/).length / 2))).join(' ');
    return JSON.stringify({ replacement: shortened || selectedText });
  }
  if (action === 'expand') {
    return JSON.stringify({ replacement: `${selectedText} Je vous remercie par avance de votre diligence.` });
  }
  return JSON.stringify({ replacement: selectedText });
}

export async function rewriteSelection(params: {
  selectedText: string;
  action: RewriteAction;
  instruction?: string;
  blockText: string;
}) {
  const custom = params.action === 'custom' ? params.instruction?.trim() || '' : '';
  const user = [
    `Action: ${REWRITE_ACTION_LABELS[params.action]}`,
    ACTION_INSTRUCTIONS[params.action],
    custom ? `Consigne utilisateur: ${custom}` : '',
    `Paragraphe: ${params.blockText}`,
    `Sélection à remplacer: ${params.selectedText}`,
  ]
    .filter(Boolean)
    .join('\n');

  const usage = await completeJsonObject({
    system: SYSTEM_PROMPT,
    user,
    mockContent: mockRewriteSelectionContent(params.selectedText, params.action),
    maxTokens: 400,
  });

  return {
    payload: parseRewriteSelection(usage.content),
    usage,
  };
}
