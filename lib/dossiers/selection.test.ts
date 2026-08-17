import { describe, expect, it } from 'vitest';
import { applySelectionRewrite, SelectionMismatchError } from '@/lib/dossiers/selection';

describe('applySelectionRewrite', () => {
  it('remplace uniquement le fragment sélectionné', () => {
    const text = 'Je vous demande de bien vouloir me rendre ma caution.';
    const start = text.indexOf('bien vouloir');
    const end = start + 'bien vouloir'.length;
    expect(
      applySelectionRewrite({
        text,
        start,
        end,
        selectedText: 'bien vouloir',
        replacement: 'procéder à',
      })
    ).toBe('Je vous demande de procéder à me rendre ma caution.');
  });

  it('refuse une sélection qui ne correspond plus au texte', () => {
    expect(() =>
      applySelectionRewrite({
        text: 'Texte actuel.',
        start: 0,
        end: 5,
        selectedText: 'Autre',
        replacement: 'Nouveau',
      })
    ).toThrow(SelectionMismatchError);
  });
});
