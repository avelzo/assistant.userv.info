# Better Auth

L’application utilise Better Auth 1.6.29 avec l’adaptateur Prisma MongoDB.

## Mot de passe (bcrypt)

Les comptes existants stockent un hash bcrypt dans `User.password`.
À la migration, ce hash est copié vers `Account.password` (`providerId: credential`) sans être réaffiché.

Better Auth vérifie et crée les mots de passe via `lib/password.ts` (`bcryptjs`, 12 rounds).
Les hash `$2a$` / `$2b$` / `$2y$` restent acceptés.

Plus tard, `hash` pourra passer à l’algorithme recommandé par Better Auth (scrypt) tout en
conservant `verify` bcrypt, sans forcer de reset.

## Inscription

Le signup HTTP Better Auth est désactivé (`disableSignUp` + hook).
L’inscription publique reste `/api/auth/register` avec les gardes Phase 1, puis création User + Account.

## Rôles

Valeurs : `user` (défaut) et `admin`. Contrôle serveur uniquement.
Aucun compte n’est promu automatiquement. Promotion explicite :

```bash
OWNER_EMAIL=adresse-du-proprietaire npx tsx scripts/promote-admin.ts
```

Le compte local existant n’est pas auto-vérifié. Après configuration SMTP, utiliser le bouton de renvoi, ou :

```bash
OWNER_EMAIL=adresse-du-proprietaire npx tsx scripts/mark-email-verified.ts
```
