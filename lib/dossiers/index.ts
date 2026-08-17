export { dossierService, createDossierService, DOSSIER_LIMITS } from '@/lib/dossiers/dossier-service';
export { DossierAccessError, StaleRevisionError, InvalidAiPayloadError, isDossierAccessError } from '@/lib/dossiers/errors';
export { DOCUMENT_BODY_FORMAT, textToBlocks, blocksToText, normalizeDocumentBlocks } from '@/lib/dossiers/document-blocks';
export { normalizeQuestions } from '@/lib/dossiers/questions';
export { RECIPIENT_CATEGORIES, REWRITE_ACTIONS, REWRITE_ACTION_LABELS } from '@/lib/dossiers/categories';
