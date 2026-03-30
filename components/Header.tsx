export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Assistant Administratif AI</p>
        <h1 className="text-xl font-bold text-slate-900">Rédigez vos courriers administratifs en 60 secondes</h1>
      </div>
      <a
        href="#generateur"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Commencer
      </a>
    </header>
  );
}
