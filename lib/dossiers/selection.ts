export class SelectionMismatchError extends Error {
  constructor(message = 'La sélection ne correspond plus au document.') {
    super(message);
    this.name = 'SelectionMismatchError';
  }
}

export function applySelectionRewrite(params: {
  text: string;
  start: number;
  end: number;
  selectedText: string;
  replacement: string;
}): string {
  const { text, start, end, selectedText, replacement } = params;
  if (start < 0 || end > text.length || start >= end) {
    throw new SelectionMismatchError();
  }
  const current = text.slice(start, end);
  if (current !== selectedText) {
    throw new SelectionMismatchError();
  }
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}
