# Dossiers

Un **Dossier** est l’unité métier (une démarche). Il appartient à `userId`.

Le **Document** vivant est en 1:1. Corps = blocs JSON `blocks-v1` (`{ id, type: "paragraph", text }`), plus `emailSubject` / `emailBody` en texte.

Les questions de l’assistant sont un tableau JSON embarqué `{ id, prompt, answer }` (0..N). Pas d’IA dans cette phase.

`LetterGeneration` est conservé. `dossierId` optionnel. Script de migration dry-run par défaut :

```bash
npx tsx --env-file=.env scripts/migrate-letter-generations-to-dossiers.ts
npx tsx --env-file=.env scripts/migrate-letter-generations-to-dossiers.ts --execute
```
