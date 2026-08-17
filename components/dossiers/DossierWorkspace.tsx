'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VerifyEmailNotice } from '@/components/VerifyEmailNotice';
import { DemarchePane } from '@/components/dossiers/DemarchePane';
import { DocumentPane } from '@/components/dossiers/DocumentPane';
import { newIdempotencyKey, type DossierDocumentView, type DossierView } from '@/components/dossiers/types';
import { useCredits } from '@/lib/credits/use-credits';
import type { RewriteAction } from '@/lib/dossiers/categories';

type DossierWorkspaceProps = {
  dossierId: string;
  emailVerified: boolean;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function DossierWorkspace({ dossierId, emailVerified }: DossierWorkspaceProps) {
  const credits = useCredits();
  const [dossier, setDossier] = useState<DossierView | null>(null);
  const [pane, setPane] = useState<'assistant' | 'document'>('assistant');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<number | null>(null);
  const dossierRef = useRef<DossierView | null>(null);

  useEffect(() => {
    dossierRef.current = dossier;
  }, [dossier]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/dossiers/${dossierId}`);
        const data = (await response.json()) as { dossier?: DossierView; error?: string };
        if (cancelled) {
          return;
        }
        if (!response.ok || !data.dossier) {
          throw new Error(data.error || 'Dossier introuvable.');
        }
        setDossier(data.dossier);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le dossier.');
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [dossierId]);

  const persist = useCallback(
    async (next: DossierView, includeDocument = false) => {
      setSaveStatus('saving');
      try {
        const response = await fetch(`/api/dossiers/${dossierId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objective: next.objective,
            recipientName: next.recipientName,
            recipientCategory: next.recipientCategory,
            context: next.context,
            questions: next.questions,
            ...(includeDocument && next.document
              ? {
                  document: {
                    bodyBlocks: next.document.bodyBlocks,
                    emailSubject: next.document.emailSubject,
                    emailBody: next.document.emailBody,
                    expectedRevision: next.document.revision,
                  },
                }
              : {}),
          }),
        });
        const data = (await response.json()) as { dossier?: DossierView; error?: string };
        if (!response.ok || !data.dossier) {
          throw new Error(data.error || 'Enregistrement impossible.');
        }
        setDossier(data.dossier);
        setSaveStatus('saved');
        return data.dossier;
      } catch {
        setSaveStatus('error');
        return null;
      }
    },
    [dossierId]
  );

  const documentDirty = useRef(false);

  const scheduleSave = useCallback(
    (next: DossierView, includeDocument = false) => {
      setDossier(next);
      if (includeDocument) {
        documentDirty.current = true;
      }
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        const shouldSaveDocument = documentDirty.current;
        documentDirty.current = false;
        void persist(next, shouldSaveDocument);
      }, 800);
    },
    [persist]
  );

  async function flushSave(): Promise<DossierView | null> {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!dossierRef.current) {
      return null;
    }
    const shouldSaveDocument = documentDirty.current;
    documentDirty.current = false;
    return persist(dossierRef.current, shouldSaveDocument);
  }

  async function postJson(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': newIdempotencyKey(),
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { dossier?: DossierView; error?: string };
    if (!response.ok || !data.dossier) {
      throw new Error(data.error || 'Opération impossible.');
    }
    setDossier(data.dossier);
    window.dispatchEvent(new Event('credits-updated'));
    return data.dossier;
  }

  async function analyze() {
    setBusy(true);
    setError('');
    try {
      await flushSave();
      await postJson(`/api/dossiers/${dossierId}/analyze`, {});
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : 'Analyse impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError('');
    try {
      await flushSave();
      await postJson(`/api/dossiers/${dossierId}/generate-letter`, {});
      setPane('document');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Génération impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function rewrite(params: {
    blockId: string;
    start: number;
    end: number;
    selectedText: string;
    action: RewriteAction;
    instruction?: string;
  }) {
    const current = (await flushSave()) || dossierRef.current;
    if (!current?.document) {
      throw new Error('Document introuvable.');
    }
    await postJson(`/api/dossiers/${dossierId}/rewrite`, {
      documentId: current.document.id,
      blockId: params.blockId,
      selectedText: params.selectedText,
      start: params.start,
      end: params.end,
      action: params.action,
      instruction: params.instruction || '',
      revision: current.document.revision,
    });
  }

  async function revise(instruction: string) {
    const current = (await flushSave()) || dossierRef.current;
    if (!current?.document) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await postJson(`/api/dossiers/${dossierId}/revise`, {
        instruction,
        revision: current.document.revision,
      });
    } catch (reviseError) {
      setError(reviseError instanceof Error ? reviseError.message : 'Révision impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (!dossier) {
    return (
      <div className="px-6 py-12 text-sm text-muted">
        {error || 'Chargement du dossier…'}
      </div>
    );
  }

  const disabled = !emailVerified || busy;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-[1440px] flex-col">
      <div className="no-print px-4 pt-4 sm:px-6">
        <VerifyEmailNotice emailVerified={emailVerified} />
        {error ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        <div className="mb-3 flex rounded-full bg-line/50 p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setPane('assistant')}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${pane === 'assistant' ? 'bg-paper text-ink shadow-sm' : 'text-muted'}`}
          >
            Assistant
          </button>
          <button
            type="button"
            onClick={() => setPane('document')}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${pane === 'document' ? 'bg-paper text-ink shadow-sm' : 'text-muted'}`}
          >
            Document
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(280px,38%)_1fr]">
        <div className={`${pane === 'assistant' ? 'block' : 'hidden'} min-h-0 lg:block`}>
          <DemarchePane
            dossier={dossier}
            analyzeCost={credits.costs.ANALYZE_SITUATION}
            generateCost={credits.costs.GENERATE_LETTER}
            busy={busy}
            disabled={disabled}
            onFieldChange={(field, value) => scheduleSave({ ...dossier, [field]: value })}
            onQuestionAnswer={(questionId, answer) =>
              scheduleSave({
                ...dossier,
                questions: dossier.questions.map((question) =>
                  question.id === questionId ? { ...question, answer } : question
                ),
              })
            }
            onAnalyze={() => void analyze()}
            onGenerate={() => void generate()}
          />
        </div>
        <div className={`${pane === 'document' ? 'flex' : 'hidden'} min-h-0 flex-col bg-desk lg:flex`}>
          <DocumentPane
            dossier={dossier}
            saveStatus={saveStatus}
            rewriteCost={credits.costs.REWRITE_SELECTION}
            reviseCost={credits.costs.REVISE_DOCUMENT}
            disabled={disabled}
            onBlocksChange={(document: DossierDocumentView) =>
              scheduleSave({ ...dossier, document }, true)
            }
            onEmailChange={(field, value) => {
              if (!dossier.document) {
                return;
              }
              scheduleSave(
                {
                  ...dossier,
                  document: { ...dossier.document, [field]: value },
                },
                true
              );
            }}
            onRewrite={rewrite}
            onRevise={revise}
          />
        </div>
      </div>
    </div>
  );
}
