import { z } from 'zod';
import { isRecipientCategory, RECIPIENT_CATEGORIES } from '@/lib/dossiers/categories';
import { InvalidAiPayloadError } from '@/lib/dossiers/errors';

const questionSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
});

export const analyzeSituationSchema = z.object({
  recipientCategory: z.string().trim().max(80).optional().default(''),
  suggestedTone: z.string().trim().max(80).optional().default(''),
  questions: z.array(questionSchema).max(6).optional().default([]),
  advice: z.string().trim().min(1).max(2000),
});

export const generatedLetterSchema = z.object({
  letter: z.string().trim().min(1).max(20_000),
  emailSubject: z.string().trim().max(300).optional().default(''),
  emailBody: z.string().trim().max(20_000).optional().default(''),
});

export const rewriteSelectionSchema = z.object({
  replacement: z.string().min(1).max(8000),
});

export const reviseDocumentSchema = z.object({
  letter: z.string().trim().min(1).max(20_000),
  emailSubject: z.string().trim().max(300).optional(),
  emailBody: z.string().trim().max(20_000).optional(),
});

export type AnalyzeSituationPayload = z.infer<typeof analyzeSituationSchema> & {
  recipientCategory: string;
};

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidAiPayloadError();
  }
}

export function parseAnalyzeSituation(raw: string): AnalyzeSituationPayload {
  const parsed = analyzeSituationSchema.safeParse(parseJsonObject(raw));
  if (!parsed.success) {
    throw new InvalidAiPayloadError();
  }
  const recipientCategory = parsed.data.recipientCategory;
  return {
    ...parsed.data,
    recipientCategory: isRecipientCategory(recipientCategory) ? recipientCategory : '',
    questions: parsed.data.questions.slice(0, 6),
  };
}

export function parseGeneratedLetter(raw: string): z.infer<typeof generatedLetterSchema> {
  const parsed = generatedLetterSchema.safeParse(parseJsonObject(raw));
  if (!parsed.success) {
    throw new InvalidAiPayloadError();
  }
  return parsed.data;
}

export function parseRewriteSelection(raw: string): { replacement: string } {
  const parsed = rewriteSelectionSchema.safeParse(parseJsonObject(raw));
  if (!parsed.success) {
    throw new InvalidAiPayloadError();
  }
  return { replacement: parsed.data.replacement };
}

export function parseReviseDocument(raw: string): z.infer<typeof reviseDocumentSchema> {
  const parsed = reviseDocumentSchema.safeParse(parseJsonObject(raw));
  if (!parsed.success) {
    throw new InvalidAiPayloadError();
  }
  return parsed.data;
}

export { RECIPIENT_CATEGORIES };
