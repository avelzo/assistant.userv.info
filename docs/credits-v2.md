# Crédits v2

MongoDB est la seule source de vérité. Le frontend peut cacher un état, mais se resynchronise via `/api/credits/balance`.

## Pools

1. `freeCredits` — quota quotidien (**15** par défaut, `FREE_DAILY_CREDITS`), **sans accumulation**. Reset lazy à minuit `CREDIT_TZ` (défaut `Europe/Paris`).
2. `paidCredits` — achats Stripe, cadeaux admin, solde v1 migré.

Consommation : **free puis paid**. Une opération peut traverser les deux pools.

Les cadeaux `ADMIN_GIFT` vont toujours dans `paidCredits`, pour ne pas disparaître au reset.

## Ledger

Convention unique : `amount` positif = crédit ajouté, négatif = consommé.

Idempotence : `idempotencyKey` unique. Un rejeu retourne le résultat existant.

## Réservation IA

`reserve` → appel provider → `settle`. Échec provider → `rollback` (restitution exacte des pools).

## Packs Stripe

Les packs Stripe ne changent pas le moteur. Mapping actuel : `pack-30` → 30, `pack-80` → 80, `pack-200` → 200 (`creditsGranted`). Anciens `pack-1` / `pack-5` / `pack-20` désactivés au seed.

Webhook `checkout.session.completed` = source de vérité. `/api/credits/claim` reste un filet UX, même clé d’idempotence.

`REFUND` est prévu au ledger pour un futur remboursement Stripe ; pas d’UX refund dans cette phase.

Après un provider réussi, un échec d’écriture `settle` laisse l’usage `RESERVED` (pas de rollback) pour qu’un retry avec la même clé puisse solder sans re-débiter.

## AIUsage

Métadonnées uniquement (tokens, coût nanodollars USD, crédits). Pas de prompt ni de lettre.

Barème crédits : `lib/credits/config.ts` (provisoire).  
Prix provider : `lib/credits/pricing.ts` (OpenAI gpt-4o-mini, août 2026).

## Migration

```bash
npx tsx scripts/migrate-credits-v2.ts --dry-run
npm run migrate:credits
```

Ancien `CreditBalance.credits` → `paidCredits`, une seule fois.

`User.freeGenerationsUsed` est déprécié : plus lu ni incrémenté.
