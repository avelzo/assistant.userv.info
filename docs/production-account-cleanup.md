# Nettoyage production des faux comptes

Procédure **indépendante** de la migration Better Auth et de l’upgrade fonctionnel.

La base de développement ne contient pas ces comptes. Ne pas concevoir Better Auth autour d’eux.

## Règles

- Aucune suppression sans e-mail propriétaire **explicitement fourni**.
- Toujours commencer par un dry-run.
- Ne jamais afficher un hash de mot de passe, un token, ni une lettre.
- Masquer les e-mails (`la***@example.com`).
- Le compte propriétaire est conservé et recevra le rôle ADMIN plus tard (Better Auth).

## Ordre

1. Backup MongoDB.
2. Dry-run : `npx tsx scripts/audit-users.ts`
3. Relire le résumé anonymisé.
4. Fournir `OWNER_EMAIL` (e-mail exact du compte à conserver).
5. Dry-run ciblé : `OWNER_EMAIL=... npx tsx scripts/audit-users.ts`
6. Validation humaine écrite.
7. Exécution : `OWNER_EMAIL=... CONFIRM=DELETE_FAKE_ACCOUNTS npx tsx scripts/audit-users.ts --execute`
8. Vérifier que le compte propriétaire existe encore (`hasPassword: true` sans afficher le hash).
9. Seulement ensuite, migration Better Auth des comptes légitimes restants.

`--execute` sans `OWNER_EMAIL` et `CONFIRM=DELETE_FAKE_ACCOUNTS` est refusé.
