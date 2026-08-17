# Mise à jour production — assistant.userv.info (VPS)

Nginx écoute déjà le site et reverse-proxy vers **127.0.0.1:3006**. **Ne pas modifier Nginx** pour cette mise à jour.

MongoDB = Prisma `db push` (pas de migrations SQL). Le **seed packs est obligatoire** pour cette release.

---

## 0. Depuis le PC, avant le VPS

Le dépôt GitHub est encore l’ancienne version. Commit + push `main` d’abord.

Vérifier ensuite : https://github.com/avelzo/assistant.userv.info (commit récent visible).

---

## 1. Stripe (5 minutes, dashboard live)

Créer 3 prix **one-shot EUR** (ou réutiliser l’ancien 13,99 € pour 200 crédits) :

| Pack | Montant | Variable `.env` |
|---|---|---|
| 30 crédits | 2,99 € | `STRIPE_PRICE_ID_PACK_30` |
| 80 crédits | 6,99 € | `STRIPE_PRICE_ID_PACK_80` |
| 200 crédits | 13,99 € | `STRIPE_PRICE_ID_PACK_200` |

Sans Price ID, le checkout marche quand même (`price_data` depuis la DB). Les Price ID évitent des produits Stripe « fantômes » à chaque paiement.

Webhook : garder `checkout.session.completed` vers `https://assistant.userv.info/api/stripe/webhook`.

---

## 2. SSH + sauvegarde MongoDB (obligatoire)

```bash
ssh user@VPS
cd /chemin/vers/assistant.userv.info   # adapter
```

Charger l’URI (souvent dans `.env`) :

```bash
set -a && source .env && set +a
mkdir -p ~/backups
mongodump --uri="$DATABASE_URL" --out=~/backups/assistant-$(date +%F-%H%M)
```

Noter le dossier de backup. Ne pas continuer si le dump échoue.

---

## 3. Arrêter l’app

Trouver comment elle tourne :

```bash
pm2 list
# ou
systemctl list-units --type=service | grep -i assistant
# ou
ss -tlnp | grep 3006
```

Puis :

```bash
pm2 stop assistant     # adapter le nom
# ou
sudo systemctl stop assistant
```

---

## 4. Récupérer le code

```bash
git status
git pull origin main
```

Si des fichiers locaux ont été modifiés sur le VPS : `git stash` puis `git pull`.

```bash
npm ci
npx prisma generate
```

---

## 5. Variables `.env` prod à ajouter / vérifier

Ne pas écraser les secrets existants (`BETTER_AUTH_SECRET`, Stripe live, SMTP, Mongo).

```env
NEXT_PUBLIC_BASE_URL=https://assistant.userv.info
BETTER_AUTH_URL=https://assistant.userv.info
APP_ALLOWED_ORIGINS=https://assistant.userv.info
RECAPTCHA_ALLOWED_HOSTNAMES=assistant.userv.info,www.assistant.userv.info
TRUSTED_IP_HEADER=x-real-ip
CREDIT_TZ=Europe/Paris
FREE_DAILY_CREDITS=15

STRIPE_PRICE_ID_PACK_30=price_...
STRIPE_PRICE_ID_PACK_80=price_...
STRIPE_PRICE_ID_PACK_200=price_...

# Mentions légales (sinon le site affiche « À compléter »)
NEXT_PUBLIC_LEGAL_PUBLISHER=
NEXT_PUBLIC_LEGAL_ADDRESS=
NEXT_PUBLIC_LEGAL_SIRET=
NEXT_PUBLIC_LEGAL_HOST=
NEXT_PUBLIC_LEGAL_DIRECTOR=
NEXT_PUBLIC_SERVER_EMAIL=assistant@userv.info
```

`NEXT_PUBLIC_*` est figé au **build** : les renseigner **avant** `npm run build`.

reCAPTCHA : clés déjà en prod si l’ancien site les avait ; sinon register / forgot / contact échouent (fail-closed).

---

## 6. Base de données — ordre

### 6.1 Schéma Prisma (collections / index)

```bash
npx prisma db push
```

Ne **pas** passer `--accept-data-loss` sauf si Prisma l’exige et que tu as lu l’avertissement. Le dump du §2 doit exister.

### 6.2 Migrations de données — seulement si pas déjà faites

Dry-run d’abord. Si le dry-run dit « déjà migré / 0 à faire », **ne pas** relancer en execute.

```bash
# Comptes Better Auth (User.password → Account credential)
npm run migrate:auth

# Ancien solde unique → paidCredits (Credits v2)
npx tsx scripts/migrate-credits-v2.ts --dry-run
# si le dry-run montre des lignes à migrer :
npm run migrate:credits

# Anciennes lettres → dossiers
npx tsx --env-file=.env scripts/migrate-letter-generations-to-dossiers.ts
# si des lettres restent à lier :
npx tsx --env-file=.env scripts/migrate-letter-generations-to-dossiers.ts --execute
```

### 6.3 Seed packs — **obligatoire pour cette release**

Idempotent : upsert `pack-30` / `pack-80` / `pack-200`, désactive `pack-1` / `pack-5` / `pack-20`. Ne touche pas aux utilisateurs ni aux soldes.

```bash
npm run seed
```

Attendu :

```
- pack-30: 30 crédits (2.99€)
- pack-80: 80 crédits (6.99€)
- pack-200: 200 crédits (13.99€)
```

Si les `STRIPE_PRICE_ID_PACK_*` ont été ajoutés après un premier seed : **re-seed** pour les écrire en base.

### 6.4 Compte admin (si pas déjà admin)

```bash
OWNER_EMAIL=ton-email-prod npx tsx scripts/promote-admin.ts
```

---

## 7. Build + redémarrage

```bash
npm run build
pm2 start assistant    # ou restart / systemctl start
# ou, à la main :
npm start              # next start -p 3006
```

Vérifier : `ss -tlnp | grep 3006` puis https://assistant.userv.info

---

## 8. Contrôles (2 minutes)

- Accueil + favicon crayon vert (Ctrl+Shift+R)
- Header : Comment ça marche, Tarifs
- `/pricing` sans login : 30 / 80 / 200 crédits
- Connexion d’un vrai compte
- Quota affiché **15** (un reliquat 150 d’aujourd’hui tient jusqu’à minuit Paris)
- Bandeau cookies
- `/mentions-legales` (plus de « À compléter » si l’env légal est rempli)
- Achat test **1 €** en live seulement si tu assumes le paiement réel

---

## 9. Rollback si ça casse

1. Stopper l’app.
2. `git log -1` puis `git checkout <commit-avant>`.
3. `npm ci && npx prisma generate && npm run build`.
4. Restaurer Mongo : `mongorestore --uri="$DATABASE_URL" --drop ~/backups/assistant-AAAA-MM-JJ-HHMM`
5. Relancer l’app.

Le restore **écrase** la DB actuelle. Ne le faire que si le dump est le bon.

---

## Ce que cette release ne fait pas toute seule

| Sujet | Action humaine |
|---|---|
| Quota 15 | `.env` + rebuild. Les 150 déjà attribués aujourd’hui tiennent jusqu’à minuit. |
| Packs | `npm run seed` |
| Schéma (dossiers, feedback, crédits v2…) | `prisma db push` |
| Price ID Stripe | Dashboard + `.env` + re-seed |
| Mentions légales | `NEXT_PUBLIC_LEGAL_*` avant le build |
| Nginx | Rien |
