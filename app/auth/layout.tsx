import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-paper">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <span className="font-serif text-lg font-semibold tracking-tight text-ink">Assistant</span>
          </Link>
          <p className="mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">Démarches et courriers</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-8 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
          {children}
        </div>
      </div>
    </main>
  );
}
