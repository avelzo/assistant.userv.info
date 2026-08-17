import { describe, expect, it } from 'vitest';
import {
  parseAnalyzeSituation,
  parseGeneratedLetter,
  parseRewriteSelection,
} from '@/lib/ai/payloads';
import { InvalidAiPayloadError } from '@/lib/dossiers/errors';

describe('payloads IA', () => {
  it('valide une analyse structurée', () => {
    const parsed = parseAnalyzeSituation(
      JSON.stringify({
        recipientCategory: 'Propriétaire',
        suggestedTone: 'ferme et courtois',
        questions: [],
        advice: 'Commencez par une demande écrite.',
      })
    );
    expect(parsed.questions).toEqual([]);
    expect(parsed.recipientCategory).toBe('Propriétaire');
    expect(parsed.advice).toMatch(/demande écrite/);
  });

  it('refuse une réponse IA invalide', () => {
    expect(() => parseAnalyzeSituation('{')).toThrow(InvalidAiPayloadError);
    expect(() => parseAnalyzeSituation(JSON.stringify({ questions: [] }))).toThrow(InvalidAiPayloadError);
    expect(() => parseGeneratedLetter(JSON.stringify({ emailBody: 'x' }))).toThrow(InvalidAiPayloadError);
    expect(() => parseRewriteSelection(JSON.stringify({ replacement: '' }))).toThrow(InvalidAiPayloadError);
  });

  it('ignore une catégorie destinataire inconnue', () => {
    const parsed = parseAnalyzeSituation(
      JSON.stringify({
        recipientCategory: 'Alien',
        advice: 'Rédigez une demande écrite factuelle.',
      })
    );
    expect(parsed.recipientCategory).toBe('');
  });
});
