export type LetterGenerationMigrationPlan = 'skip' | 'link' | 'create';

export function planLetterGenerationMigration(input: {
  alreadyLinked: boolean;
  legacyDossierExists: boolean;
  hasUser: boolean;
}): LetterGenerationMigrationPlan {
  if (input.alreadyLinked) {
    return 'skip';
  }
  if (input.legacyDossierExists) {
    return 'link';
  }
  if (!input.hasUser) {
    return 'skip';
  }
  return 'create';
}
