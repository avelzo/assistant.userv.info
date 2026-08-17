/** Aperçu statique de l’espace Assistant + Document. Démonstration visuelle, pas une illustration IA. */
export function ProductPreview() {
  return (
    <div className="relative mx-auto mt-12 w-full min-w-0 max-w-[980px] sm:mt-14">
      <p className="mb-3 text-center text-xs text-muted">
        La démarche à gauche, le courrier à droite — vous restez maître du document.
      </p>
      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_28px_70px_-40px_rgba(44,88,80,0.45)]">
        <div className="flex items-center gap-2 border-b border-line bg-ivory/80 px-3 py-2 sm:px-4">
          <span className="h-2 w-2 rounded-full bg-line sm:h-2.5 sm:w-2.5" />
          <span className="h-2 w-2 rounded-full bg-line sm:h-2.5 sm:w-2.5" />
          <span className="h-2 w-2 rounded-full bg-line sm:h-2.5 sm:w-2.5" />
          <span className="ml-2 truncate font-mono text-[10px] text-muted sm:text-xs">
            assistant · restitution du dépôt de garantie
          </span>
        </div>

        <div className="grid min-w-0 sm:grid-cols-[minmax(0,38%)_1fr]">
          <div className="min-w-0 border-b border-line p-4 sm:border-b-0 sm:border-r sm:p-5">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted">Objectif</p>
            <p className="mt-1.5 rounded-lg border border-line bg-ivory px-3 py-2 text-sm leading-snug text-ink">
              Mon ancien propriétaire ne m’a toujours pas rendu mon dépôt de garantie.
            </p>

            <div className="mt-4 rounded-xl border border-line bg-ivory p-3.5">
              <p className="text-[0.82rem] font-medium text-ink">Assistant</p>
              <p className="mt-2 text-[0.82rem] leading-snug text-ink">
                À quelle date avez-vous rendu les clés ?
              </p>
              <p className="mt-2 rounded-md bg-line/60 px-2.5 py-1.5 text-[0.8rem] text-ink">2 juillet 2026</p>
            </div>

            <div className="mt-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-accent">
                Démarche conseillée
              </p>
              <p className="mt-1.5 text-[0.8rem] leading-snug text-ink">
                Rappelez la date de remise des clés et le montant, en recommandé.
              </p>
            </div>
          </div>

          <div className="min-w-0 bg-desk p-4 sm:p-5">
            <div className="mx-auto max-w-[420px] rounded-sm bg-paper px-5 py-6 shadow-[0_2px_4px_rgba(44,88,80,0.06),0_18px_44px_-28px_rgba(44,88,80,0.4)] sm:px-7 sm:py-8">
              <div className="font-serif text-[0.75rem] leading-[1.7] text-ink sm:text-[0.8rem]">
                <p className="mb-2.5 text-muted">Expéditeur — 29200 Brest</p>
                <p className="mb-2.5 font-semibold">Objet : Restitution du dépôt de garantie</p>
                <p className="mb-2.5">Monsieur,</p>
                <p className="mb-2.5">
                  J’ai quitté le logement et vous ai remis les clés le 2 juillet 2026. Le dépôt de{' '}
                  <span className="rounded bg-accent/25 px-0.5">garantie de 850 €</span> doit m’être
                  restitué.
                </p>
                <p className="mb-0">Je vous prie d’agréer, Monsieur, mes salutations distinguées.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
