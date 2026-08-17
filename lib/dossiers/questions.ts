export type DossierQuestion = {
  id: string;
  prompt: string;
  answer: string;
};

const MAX_QUESTIONS = 30;
const MAX_PROMPT = 500;
const MAX_ANSWER = 4000;

function newQuestionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeQuestions(value: unknown): DossierQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const questions: DossierQuestion[] = [];
  for (const entry of value.slice(0, MAX_QUESTIONS)) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as { id?: unknown; prompt?: unknown; answer?: unknown };
    const prompt = typeof record.prompt === 'string' ? record.prompt.trim().slice(0, MAX_PROMPT) : '';
    const answer = typeof record.answer === 'string' ? record.answer.slice(0, MAX_ANSWER) : '';
    if (!prompt && !answer) {
      continue;
    }
    questions.push({
      id: typeof record.id === 'string' && record.id.trim() ? record.id.trim().slice(0, 80) : newQuestionId(),
      prompt,
      answer,
    });
  }
  return questions;
}

export function mergeQuestionPrompts(existing: DossierQuestion[], prompts: string[]): DossierQuestion[] {
  const incoming = prompts.map((prompt) => prompt.trim()).filter(Boolean).slice(0, MAX_QUESTIONS);
  if (incoming.length === 0) {
    return [];
  }

  return incoming.map((prompt) => {
    const found = existing.find((question) => question.prompt === prompt);
    return {
      id: found?.id ?? newQuestionId(),
      prompt: prompt.slice(0, MAX_PROMPT),
      answer: found?.answer ?? '',
    };
  });
}
