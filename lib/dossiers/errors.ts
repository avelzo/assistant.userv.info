export class DossierAccessError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'DossierAccessError';
    this.status = status;
  }
}

export class StaleRevisionError extends DossierAccessError {
  constructor(message = 'Le document a été modifié. Actualisez puis réessayez.') {
    super(409, message);
    this.name = 'StaleRevisionError';
  }
}

export class InvalidAiPayloadError extends Error {
  readonly status = 502;

  constructor(message = 'Format de réponse IA invalide.') {
    super(message);
    this.name = 'InvalidAiPayloadError';
  }
}

export function isDossierAccessError(error: unknown): error is DossierAccessError {
  if (error instanceof DossierAccessError) {
    return true;
  }
  const name = error && typeof error === 'object' ? (error as { name?: string }).name : undefined;
  return Boolean(
    error &&
      typeof error === 'object' &&
      (name === 'DossierAccessError' || name === 'StaleRevisionError') &&
      typeof (error as { status?: unknown }).status === 'number'
  );
}

