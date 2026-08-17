import { describe, expect, it } from 'vitest';
import { mergeQuestionPrompts, type DossierQuestion } from '@/lib/dossiers/questions';

describe('mergeQuestionPrompts', () => {
  it('remplace par une liste vide quand l’analyse ne pose plus de question', () => {
    const existing: DossierQuestion[] = [
      { id: 'q1', prompt: 'Quel était le montant du dépôt de garantie ?', answer: '850 €' },
    ];
    expect(mergeQuestionPrompts(existing, [])).toEqual([]);
  });

  it('conserve la réponse si le même prompt revient', () => {
    const existing: DossierQuestion[] = [
      { id: 'q1', prompt: 'Quand avez-vous rendu les clés ?', answer: '30 juin' },
    ];
    const merged = mergeQuestionPrompts(existing, ['Quand avez-vous rendu les clés ?', 'Avez-vous relancé ?']);
    expect(merged[0]).toMatchObject({ id: 'q1', prompt: 'Quand avez-vous rendu les clés ?', answer: '30 juin' });
    expect(merged[1]?.prompt).toBe('Avez-vous relancé ?');
    expect(merged[1]?.answer).toBe('');
  });
});
