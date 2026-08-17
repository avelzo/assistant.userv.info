export class InsufficientCreditsError extends Error {
  readonly needed: number;
  readonly available: number;

  constructor(needed: number, available: number) {
    super('Crédits insuffisants.');
    this.name = 'InsufficientCreditsError';
    this.needed = needed;
    this.available = available;
  }
}

export class CreditConflictError extends Error {
  constructor(message = 'Opération de crédits concurrente. Réessayez.') {
    super(message);
    this.name = 'CreditConflictError';
  }
}
