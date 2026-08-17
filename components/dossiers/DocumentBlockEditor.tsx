'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RewriteAction } from '@/lib/dossiers/categories';
import { REWRITE_ACTION_LABELS } from '@/lib/dossiers/categories';
import type { DocumentBlockView } from '@/components/dossiers/types';

const SELECTION_MENU_EVENT = 'assistant:selection-menu';

type SelectionState = {
  start: number;
  end: number;
  text: string;
  top: number;
  left: number;
};

type DocumentBlockEditorProps = {
  block: DocumentBlockView;
  rewriteCost: number;
  disabled?: boolean;
  onChange: (blockId: string, text: string) => void;
  onRewrite: (params: {
    blockId: string;
    start: number;
    end: number;
    selectedText: string;
    action: RewriteAction;
    instruction?: string;
  }) => Promise<void>;
};

export function DocumentBlockEditor({
  block,
  rewriteCost,
  disabled,
  onChange,
  onRewrite,
}: DocumentBlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);

  const closeMenu = useCallback(() => {
    setSelection(null);
    setCustomOpen(false);
    setInstruction('');
  }, []);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 28)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [block.text, resize]);

  useEffect(() => {
    if (!selection) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || textareaRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    }

    function onOtherMenu(event: Event) {
      const detail = (event as CustomEvent<{ blockId: string }>).detail;
      if (detail?.blockId && detail.blockId !== block.id) {
        closeMenu();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(SELECTION_MENU_EVENT, onOtherMenu);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(SELECTION_MENU_EVENT, onOtherMenu);
    };
  }, [selection, block.id, closeMenu]);

  function captureSelection() {
    const el = textareaRef.current;
    if (!el || disabled) {
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (end <= start) {
      closeMenu();
      return;
    }
    const rect = el.getBoundingClientRect();
    const next: SelectionState = {
      start,
      end,
      text: el.value.slice(start, end),
      top: rect.top + 8,
      left: Math.min(rect.left + 12, window.innerWidth - 280),
    };
    window.dispatchEvent(new CustomEvent(SELECTION_MENU_EVENT, { detail: { blockId: block.id } }));
    setCustomOpen(false);
    setInstruction('');
    setSelection(next);
  }

  async function runAction(action: RewriteAction, customInstruction?: string) {
    if (!selection) {
      return;
    }
    setBusy(true);
    try {
      await onRewrite({
        blockId: block.id,
        start: selection.start,
        end: selection.end,
        selectedText: selection.text,
        action,
        instruction: customInstruction,
      });
      closeMenu();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={block.text}
        disabled={disabled}
        onChange={(event) => onChange(block.id, event.target.value)}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        rows={1}
        className="w-full resize-none overflow-hidden border-0 bg-transparent font-serif text-[17px] leading-7 text-ink outline-hidden"
      />
      {selection ? (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Actions sur la sélection"
          className="fixed z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-paper p-2 shadow-lg"
          style={{ top: Math.max(8, selection.top - 8), left: selection.left }}
        >
          <div className="mb-1 flex items-center justify-between gap-2 px-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">Sélection</p>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Fermer le menu"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-ivory hover:text-ink"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>
          {customOpen ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAction('custom', instruction.trim());
              }}
              className="space-y-2"
            >
              <input
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                maxLength={500}
                placeholder="Mentionne que j’ai déjà envoyé deux relances."
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-hidden focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !instruction.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-60"
                >
                  Appliquer · {rewriteCost} crédits
                </button>
                <button type="button" onClick={() => setCustomOpen(false)} className="text-xs text-muted">
                  Retour
                </button>
              </div>
            </form>
          ) : (
            <ul className="max-h-72 overflow-auto text-sm">
              {(Object.keys(REWRITE_ACTION_LABELS) as RewriteAction[]).map((action) => (
                <li key={action}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (action === 'custom') {
                        setCustomOpen(true);
                        return;
                      }
                      void runAction(action);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-ivory disabled:opacity-60"
                  >
                    <span>{REWRITE_ACTION_LABELS[action]}</span>
                    <span className="font-mono text-xs text-muted">{rewriteCost} cr.</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
