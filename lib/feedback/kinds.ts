import { AiOperation } from '@prisma/client';

export const USER_FEEDBACK_KINDS = [
  'TECHNICAL_ISSUE',
  'ADVICE_NOT_USEFUL',
  'MISUNDERSTANDING',
  'LETTER_UNSATISFACTORY',
  'REWRITE_INCORRECT',
  'OTHER',
] as const;

export type UserFeedbackKind = (typeof USER_FEEDBACK_KINDS)[number];

export const USER_FEEDBACK_RATINGS = ['USEFUL', 'NOT_USEFUL'] as const;
export type UserFeedbackRating = (typeof USER_FEEDBACK_RATINGS)[number];

export const USER_FEEDBACK_KIND_LABELS: Record<UserFeedbackKind, string> = {
  TECHNICAL_ISSUE: 'Problème technique',
  ADVICE_NOT_USEFUL: 'Conseil peu utile',
  MISUNDERSTANDING: 'Mauvaise compréhension',
  LETTER_UNSATISFACTORY: 'Lettre insatisfaisante',
  REWRITE_INCORRECT: 'Reformulation incorrecte',
  OTHER: 'Autre',
};

export const FEEDBACK_COMMENT_MAX = 2000;

export function isUserFeedbackKind(value: unknown): value is UserFeedbackKind {
  return typeof value === 'string' && (USER_FEEDBACK_KINDS as readonly string[]).includes(value);
}

export function isUserFeedbackRating(value: unknown): value is UserFeedbackRating {
  return typeof value === 'string' && (USER_FEEDBACK_RATINGS as readonly string[]).includes(value);
}

/** Opération IA associée au motif, sans stocker le prompt ni la lettre. */
export function operationFromFeedbackKind(kind: UserFeedbackKind): AiOperation | undefined {
  switch (kind) {
    case 'ADVICE_NOT_USEFUL':
      return AiOperation.ANALYZE_SITUATION;
    case 'LETTER_UNSATISFACTORY':
      return AiOperation.GENERATE_LETTER;
    case 'REWRITE_INCORRECT':
      return AiOperation.REWRITE_SELECTION;
    default:
      return undefined;
  }
}
