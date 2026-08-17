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
    <section className="space-y-6 rounded-2xl border border-line bg-paper p-6 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink">Votre lettre</h3>
          <p className="text-sm text-muted">Relisez toujours avant envoi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy(content)}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ivory"
          >
            Copier la lettre
          </button>
          <button
            onClick={() => downloadLetterPdf('lettre-administrative', content)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-paper hover:bg-primary-hover"
          >
            Télécharger en PDF
          </button>
        </div>
      </div>

      <pre className="whitespace-pre-wrap rounded-xl bg-ivory p-4 text-sm leading-6 text-ink">{content}</pre>

      {emailVersion ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-ink">Version email</h4>
            <button
              onClick={() => handleCopy(emailVersion)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ivory"
            >
              {`Copier l'email`}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-ivory p-4 text-sm leading-6 text-ink">
            {emailVersion}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
