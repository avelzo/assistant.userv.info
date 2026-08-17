export type DossierQuestionView = {
  id: string;
  prompt: string;
  answer: string;
};

export type DocumentBlockView = {
  id: string;
  type: 'paragraph';
  text: string;
};

export type DossierDocumentView = {
  id: string;
  bodyFormat: string;
  bodyBlocks: DocumentBlockView[];
  emailSubject: string;
  emailBody: string;
  revision: number;
  updatedAt: string;
};

export type DossierView = {
  id: string;
  title: string;
  objective: string;
  recipientName: string;
  recipientCategory: string;
  suggestedTone: string;
  context: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'READY' | 'FINALIZED';
  advice: string;
  questions: DossierQuestionView[];
  createdAt: string;
  updatedAt: string;
  document: DossierDocumentView | null;
};

export type DossierSummaryView = {
  id: string;
  title: string;
  objective: string;
  recipientName: string;
  recipientCategory: string;
  status: DossierView['status'];
  createdAt: string;
  updatedAt: string;
  contextPreview: string;
  questionCount: number;
  hasDocument: boolean;
};

export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
