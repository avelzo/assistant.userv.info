import { describe, expect, it } from 'vitest';
import { blocksToText, replaceBlockText, textToBlocks } from '@/lib/dossiers/document-blocks';
import { normalizeQuestions } from '@/lib/dossiers/questions';
import { planLetterGenerationMigration } from '@/lib/dossiers/migration';

describe('document blocks-v1', () => {
  it('convertit un texte en blocs et revient au texte', () => {
    const blocks = textToBlocks('Premier paragraphe.\n\nSecond paragraphe.');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.id).toBeTruthy();
    expect(blocksToText(blocks)).toBe('Premier paragraphe.\n\nSecond paragraphe.');
  });

  it('remplace un bloc ciblé sans toucher les autres', () => {
    const blocks = textToBlocks('A\n\nB');
    const next = replaceBlockText(blocks, blocks[0]!.id, 'A réécrit');
    expect(next[0]?.text).toBe('A réécrit');
    expect(next[1]?.text).toBe('B');
  });
});

describe('questions embarquées', () => {
  it('accepte 0 question', () => {
    expect(normalizeQuestions([])).toEqual([]);
    expect(normalizeQuestions(undefined)).toEqual([]);
  });

  it('normalise plusieurs questions/réponses', () => {
    const questions = normalizeQuestions([
      { prompt: 'Date des clés ?', answer: '30 juin' },
      { prompt: 'Relance déjà faite ?', answer: '' },
    ]);
    expect(questions).toHaveLength(2);
    expect(questions[0]?.id).toBeTruthy();
  });
});

describe('migration LetterGeneration → Dossier', () => {
  it('ne recrée pas un dossier déjà lié', () => {
    expect(
      planLetterGenerationMigration({
        alreadyLinked: true,
        legacyDossierExists: false,
        hasUser: true,
      })
    ).toBe('skip');
  });

  it('relie une génération si le dossier legacy existe déjà', () => {
    expect(
      planLetterGenerationMigration({
        alreadyLinked: false,
        legacyDossierExists: true,
        hasUser: true,
      })
    ).toBe('link');
  });
});
