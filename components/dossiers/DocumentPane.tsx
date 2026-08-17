'use client';

import { useEffect, useState } from 'react';
import { DocumentBlockEditor } from '@/components/dossiers/DocumentBlockEditor';
import type { DossierDocumentView, DossierView } from '@/components/dossiers/types';
import { blocksToText } from '@/lib/dossiers/document-blocks';
import { downloadLetterPdf } from '@/lib/pdf';
import type { RewriteAction } from '@/lib/dossiers/categories';

type DocumentPaneProps = {
  dossier: DossierView;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  rewriteCost: number;
  reviseCost: number;
  disabled?: boolean;
  onBlocksChange: (document: DossierDocumentView) => void;
  onEmailChange: (field: 'emailSubject' | 'emailBody', value: string) => void;
  onRewrite: (params: {
    blockId: string;
    start: number;
    end: number;
    selectedText: string;
    action: RewriteAction;
    instruction?: string;
  }) => Promise<void>;
  onRevise: (instruction: string) => Promise<void>;
};

export function DocumentPane({
  dossier,
  saveStatus,
  rewriteCost,
  reviseCost,
  disabled,
  onBlocksChange,
  onEmailChange,
  onRewrite,
  onRevise,
}: DocumentPaneProps) {
  const [tab, setTab] = useState<'letter' | 'email'>('letter');
  const [copyMessage, setCopyMessage] = useState('');
  const document = dossier.document;
  const blocks = document?.bodyBlocks || [];
  const hasLetter = blocks.some((block) => block.text.trim());

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timer = window.setTimeout(() => setCopyMessage(''), 2000);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopyMessage(label);
  }

  function updateBlock(blockId: string, text: string) {
    if (!document) {
      return;
    }
      onBlocksChange({
        ...document,
        bodyBlocks: document.bodyBlocks.map((block) => (block.id === blockId ? { ...block, text } : block)),
      });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex rounded-full bg-ivory p-1">
          <button
            type="button"
            onClick={() => setTab('letter')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === 'letter' ? 'bg-paper text-ink shadow-sm' : 'text-muted'}`}
          >
            Lettre
          </button>
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === 'email' ? 'bg-paper text-ink shadow-sm' : 'text-muted'}`}
          >
            E-mail
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-muted">
            {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Enregistré' : saveStatus === 'error' ? 'Erreur d’enregistrement' : ''}
          </span>
          {tab === 'letter' ? (
            <>
              <button
                type="button"
                disabled={!hasLetter}
                onClick={() => void copy(blocksToText(blocks), 'Courrier copié')}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory disabled:opacity-40"
              >
                Copier
              </button>
              <button
                type="button"
                disabled={!hasLetter}
                onClick={() => window.print()}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory disabled:opacity-40"
              >
                Imprimer
              </button>
              <button
                type="button"
                disabled={!hasLetter}
                onClick={() => downloadLetterPdf(dossier.title || 'courrier', blocksToText(blocks))}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory disabled:opacity-40"
              >
                PDF
              </button>
              <label className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory">
                Réviser
                <select
                  disabled={disabled || !hasLetter}
                  className="ml-1 bg-transparent text-sm outline-hidden"
                  defaultValue=""
                  onChange={(event) => {
                    const value = event.target.value;
                    event.target.value = '';
                    if (value) {
                      void onRevise(value);
                    }
                  }}
                >
                  <option value="" disabled>
                    · {reviseCost} cr.
                  </option>
                  <option value="Rendre le courrier plus concis, sans perdre les faits.">Plus concis</option>
                  <option value="Rendre le ton plus formel, tout en restant clair.">Plus formel</option>
                  <option value="Vérifier la cohérence du courrier et corriger les maladresses.">Vérifier la cohérence</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void copy(document?.emailSubject || '', 'Objet copié')}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory"
              >
                Copier l’objet
              </button>
              <button
                type="button"
                onClick={() => void copy(document?.emailBody || '', 'Message copié')}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory"
              >
                Copier le message
              </button>
              <button
                type="button"
                onClick={() =>
                  void copy(
                    `Objet : ${document?.emailSubject || ''}\n\n${document?.emailBody || ''}`,
                    'E-mail copié'
                  )
                }
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ivory"
              >
                Copier l’ensemble
              </button>
            </>
          )}
        </div>
      </div>
      {copyMessage ? <p className="no-print px-6 pt-3 text-xs text-primary">{copyMessage}</p> : null}

      {tab === 'letter' ? (
        <div className="min-h-0 flex-1 overflow-auto px-3 py-6 sm:px-8">
          <div
            className="print-paper print-document mx-auto min-h-[32rem] max-w-[720px] rounded-sm border border-line bg-paper px-6 py-10 shadow-[0_2px_4px_rgba(44,88,80,0.06),0_20px_50px_-28px_rgba(44,88,80,0.4)] sm:px-14 sm:py-16"
          >
            {hasLetter ? (
              <div className="space-y-5">
                {blocks.map((block) => (
                  <DocumentBlockEditor
                    key={block.id}
                    block={block}
                    rewriteCost={rewriteCost}
                    disabled={disabled}
                    onChange={updateBlock}
                    onRewrite={onRewrite}
                  />
                ))}
              </div>
            ) : (
              <p className="font-serif text-lg leading-8 text-muted">
                Le courrier apparaîtra ici après génération. Sur mobile, privilégiez la lecture et l’édition ;
                la mise en page papier est destinée à l’écran large et à l’impression.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-auto px-4 py-6 sm:px-8">
          <label className="block space-y-2 text-sm font-medium text-ink">
            Objet
            <input
              value={document?.emailSubject || ''}
              disabled={disabled}
              onChange={(event) => onEmailChange('emailSubject', event.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-hidden focus:border-primary"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-ink">
            Message
            <textarea
              value={document?.emailBody || ''}
              disabled={disabled}
              rows={14}
              onChange={(event) => onEmailChange('emailBody', event.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-serif text-base leading-7 outline-hidden focus:border-primary"
            />
          </label>
        </div>
      )}
    </section>
  );
}
