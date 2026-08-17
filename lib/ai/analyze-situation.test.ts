import { describe, expect, it } from 'vitest';
import {
  buildAnalyzeSituationUserMessage,
  mockAnalyzeSituationContent,
  mockMissingSituationQuestions,
  type AnalyzeSituationInput,
} from '@/lib/ai/analyze-situation';
import { parseAnalyzeSituation } from '@/lib/ai/payloads';

const incompleteDeposit: AnalyzeSituationInput = {
  objective: 'Je veux récupérer ma caution auprès de mon ancien propriétaire.',
  recipientName: 'Mon ancien propriétaire',
  recipientCategory: '',
  context: 'Il ne me l’a toujours pas rendue.',
  questions: [],
  sender: { fullName: 'Léa Martin', city: 'Lyon' },
};

const completeDeposit: AnalyzeSituationInput = {
  objective: 'Je veux récupérer les 850 € de dépôt de garantie auprès de mon ancien propriétaire.',
  recipientName: 'SCI Martin',
  recipientCategory: 'Propriétaire',
  context:
    'Le bail s’est terminé le 30 juin 2026. J’ai remis les clés en main propre. L’état des lieux de sortie ne mentionnait aucune dégradation. J’ai déjà envoyé une relance le 15 juillet ; le propriétaire n’a pas répondu.',
  questions: [],
  sender: { fullName: 'Léa Martin', city: 'Lyon' },
};

describe('ANALYZE_SITUATION mock — briefing incomplet', () => {
  it('génère des questions utiles quand des faits importants manquent', () => {
    const prompts = mockMissingSituationQuestions(incompleteDeposit);
    expect(prompts.length).toBeGreaterThan(0);
    const joined = prompts.join(' ').toLowerCase();
    expect(joined).toMatch(/clés|cles/);
    expect(joined).toMatch(/montant|dépôt|depot/);
    expect(joined).toMatch(/état des lieux|etat des lieux|dégradation|degradation/);
    expect(joined).toMatch(/relance/);
  });

  it('sépare le conseil des questions', () => {
    const parsed = parseAnalyzeSituation(mockAnalyzeSituationContent(incompleteDeposit));
    expect(parsed.questions.length).toBeGreaterThan(0);
    expect(parsed.advice.trim().length).toBeGreaterThan(20);
    for (const question of parsed.questions) {
      expect(parsed.advice).not.toBe(question.prompt);
      expect(question.prompt.endsWith('?')).toBe(true);
    }
    expect(parsed.advice.includes('?')).toBe(false);
  });
});

describe('ANALYZE_SITUATION mock — briefing complet', () => {
  it('autorise 0 question', () => {
    expect(mockMissingSituationQuestions(completeDeposit)).toEqual([]);
    const parsed = parseAnalyzeSituation(mockAnalyzeSituationContent(completeDeposit));
    expect(parsed.questions).toHaveLength(0);
    expect(parsed.advice.length).toBeGreaterThan(20);
  });
});

describe('ANALYZE_SITUATION mock — ne pas répéter le connu', () => {
  it('ne redemande pas un montant déjà fourni', () => {
    const input: AnalyzeSituationInput = {
      ...incompleteDeposit,
      objective: 'Je veux récupérer les 850 € de caution auprès de mon ancien propriétaire.',
    };
    const prompts = mockMissingSituationQuestions(input);
    expect(prompts.length).toBeGreaterThan(0);
    const joined = prompts.join(' ').toLowerCase();
    expect(joined).not.toMatch(/montant/);
    expect(joined).not.toMatch(/850/);
  });

  it('tient compte des réponses déjà fournies', () => {
    const input: AnalyzeSituationInput = {
      ...incompleteDeposit,
      questions: [
        { id: 'q1', prompt: 'Quel était le montant du dépôt de garantie ?', answer: '850 €' },
        { id: 'q2', prompt: 'Quand avez-vous rendu les clés ?', answer: '30 juin 2026' },
      ],
    };
    const prompts = mockMissingSituationQuestions(input);
    const joined = prompts.join(' ').toLowerCase();
    expect(joined).not.toMatch(/montant/);
    expect(joined).not.toMatch(/clés|cles/);
  });
});

describe('ANALYZE_SITUATION contexte envoyé', () => {
  it('n’inclut pas le document / courrier dans le message utilisateur', () => {
    const message = buildAnalyzeSituationUserMessage({
      ...incompleteDeposit,
      hasDocument: true,
    });
    expect(message).toMatch(/situation/i);
    expect(message).toMatch(/brouillon de courrier existe déjà : oui/i);
    expect(message).not.toMatch(/bodyBlocks/);
    expect(message).not.toMatch(/Madame, Monsieur/);
    expect(message).not.toMatch(/Je vous prie d'agréer/);
    expect(message).toContain(incompleteDeposit.objective);
    expect(message).toContain(incompleteDeposit.context);
  });

  it('indique l’absence de brouillon sans envoyer de lettre', () => {
    const message = buildAnalyzeSituationUserMessage(incompleteDeposit);
    expect(message).toMatch(/brouillon de courrier existe déjà : non/i);
    expect(message).not.toMatch(/letter:/i);
  });
});
