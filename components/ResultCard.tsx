'use client';

import { downloadLetterPdf } from '@/lib/pdf';

type ResultCardProps = {
  content: string;
  emailVersion?: string;
};

export function ResultCard({ content, emailVersion }: ResultCardProps) {
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert('Texte copié dans le presse-papiers.');
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Votre lettre</h3>
          <p className="text-sm text-slate-500">Relisez toujours avant envoi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy(content)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Copier la lettre
          </button>
          <button
            onClick={() => downloadLetterPdf('lettre-administrative', content)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Télécharger en PDF
          </button>
        </div>
      </div>

      <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">{content}</pre>

      {emailVersion ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-slate-900">Version email</h4>
            <button
              onClick={() => handleCopy(emailVersion)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Copier l'email
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
            {emailVersion}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
