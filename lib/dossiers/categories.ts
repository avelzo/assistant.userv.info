export const RECIPIENT_CATEGORIES = [
  'Administration',
  'Entreprise',
  'Propriétaire',
  'Employeur',
  'Banque',
  'Assurance',
  'Fournisseur',
  'Particulier',
] as const;

export type RecipientCategory = (typeof RECIPIENT_CATEGORIES)[number];

export function isRecipientCategory(value: string): value is RecipientCategory {
  return (RECIPIENT_CATEGORIES as readonly string[]).includes(value);
}

export const DOSSIER_STATUS_LABELS = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  READY: 'Prêt',
  FINALIZED: 'Finalisé',
} as const;

export const REWRITE_ACTIONS = [
  'reformulate',
  'more_formal',
  'firmer',
  'warmer',
  'simplify',
  'shorten',
  'expand',
  'custom',
] as const;

export type RewriteAction = (typeof REWRITE_ACTIONS)[number];

export const REWRITE_ACTION_LABELS: Record<RewriteAction, string> = {
  reformulate: 'Reformuler',
  more_formal: 'Plus formel',
  firmer: 'Plus ferme',
  warmer: 'Plus cordial',
  simplify: 'Simplifier',
  shorten: 'Raccourcir',
  expand: 'Développer',
  custom: 'Demander à l’IA…',
};
