export const AI_OPERATION_LABELS: Record<string, { title: string; code: string }> = {
  ANALYZE_SITUATION: { title: 'M’aider dans ma démarche', code: 'ANALYZE_SITUATION' },
  GENERATE_LETTER: { title: 'Rédaction', code: 'GENERATE_LETTER' },
  REWRITE_SELECTION: { title: 'Reformulation', code: 'REWRITE_SELECTION' },
  REVISE_DOCUMENT: { title: 'Révision', code: 'REVISE_DOCUMENT' },
};

export function operationTitle(operation: string): string {
  return AI_OPERATION_LABELS[operation]?.title ?? operation;
}

export function operationCode(operation: string): string {
  return AI_OPERATION_LABELS[operation]?.code ?? operation;
}

export const LEDGER_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Achat',
  CONSUMPTION: 'Consommation',
  ADJUSTMENT: 'Ajustement',
  REFUND: 'Remboursement',
  FREE_DAILY: 'Quota quotidien',
  AI_USAGE: 'Usage IA',
  ADMIN_GIFT: 'Cadeau admin',
  ADMIN_ADJUSTMENT: 'Ajustement admin',
  ROLLBACK: 'Annulation',
};

export const LEDGER_POOL_LABELS: Record<string, string> = {
  FREE: 'Gratuits',
  PAID: 'Achetés',
};
