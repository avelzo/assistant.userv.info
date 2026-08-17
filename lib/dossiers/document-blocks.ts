export const DOCUMENT_BODY_FORMAT = 'blocks-v1';

export type DocumentBlockType = 'paragraph';

export type DocumentBlock = {
  id: string;
  type: DocumentBlockType;
  text: string;
};

const MAX_BLOCKS = 200;
const MAX_BLOCK_TEXT = 20_000;

function newBlockId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `blk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createParagraphBlock(text: string, id?: string): DocumentBlock {
  return {
    id: id || newBlockId(),
    type: 'paragraph',
    text: text.slice(0, MAX_BLOCK_TEXT),
  };
}

export function textToBlocks(text: string): DocumentBlock[] {
  const normalized = text.replace(/\r\n/g, '\n').trimEnd();
  if (!normalized.trim()) {
    return [];
  }

  const parts = normalized.split(/\n{2,}/).map((part) => part.trimEnd());
  return parts.slice(0, MAX_BLOCKS).map((part) => createParagraphBlock(part));
}

export function blocksToText(blocks: DocumentBlock[]): string {
  return blocks.map((block) => block.text).join('\n\n').trim();
}

export function normalizeDocumentBlocks(value: unknown): DocumentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks: DocumentBlock[] = [];
  for (const entry of value.slice(0, MAX_BLOCKS)) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as { id?: unknown; type?: unknown; text?: unknown };
    const text = typeof record.text === 'string' ? record.text.slice(0, MAX_BLOCK_TEXT) : '';
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim().slice(0, 80) : newBlockId();
    blocks.push({
      id,
      type: 'paragraph',
      text,
    });
  }
  return blocks;
}

export function replaceBlockText(blocks: DocumentBlock[], blockId: string, text: string): DocumentBlock[] {
  return blocks.map((block) =>
    block.id === blockId ? { ...block, text: text.slice(0, MAX_BLOCK_TEXT) } : block
  );
}
