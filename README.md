# Assistant Administratif AI

Application Next.js pour générer des lettres et emails administratifs en français, avec authentification et système de crédits.

## Fonctionnalités incluses

- Landing page marketing
- Générateur de courrier administratif (lettre + version email)
- Catégories principales (CAF, assurance, résiliation, employeur, banque, logement)
- Ton du courrier (standard, ferme, très poli)
- Résultat avec copie presse-papiers
- Export PDF
- Essai gratuit initial (local)
- Authentification (inscription, connexion, mot de passe oublié/réinitialisation)
- Paiement Stripe par packs de crédits
- Ajout des crédits au compte après paiement et historique de crédits

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- MongoDB
- NextAuth (Credentials)
- OpenAI API
- Stripe Checkout

## Installation

```bash
npm install
cp .env.example .env.local
npm run seed
npm run dev
```

Notes:
- `npm run seed` est recommandé pour initialiser les packs de crédits.
- Vérifiez que MongoDB est accessible avant de lancer l'application.

## Variables d'environnement

```env
OPENAI_API_KEY=sk-...
OPENAPI_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Assistant Administratif AI
MOCK_AI=false
NEXT_PUBLIC_FREE_GENERATIONS=1
DATABASE_HOST=127.0.0.1
DATABASE_NAME=database_name
DATABASE_PORT=27017
DATABASE_USER="username"
DATABASE_USERPASS="userPasswd"
# Pour Prisma (à définir explicitement dans .env)
# DATABASE_URL=mongodb://${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?directConnection=true&ssl=false&authSource=admin
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me
```

## Structure

- `app/` : pages et routes API
	- `app/auth/*` : écrans d'authentification
	- `app/generate/*` : formulaire de génération
	- `app/result/*` : rendu du courrier généré
- `components/` : interface utilisateur
- `lib/` : auth, helpers, stockage local
- `prisma/` : schéma et seed

## Limites MVP importantes

Ce projet est volontairement simple pour démarrer vite.

### Paiement
Le flux repose sur une redirection Stripe puis une validation de session (`/api/credits/claim`) pour ajouter les crédits au compte.
Cela fonctionne bien pour un MVP, mais une version production doit renforcer la robustesse avec des webhooks Stripe.

Pour une version production propre, il faut :
- créer un produit/prix Stripe réel
- gérer des webhooks Stripe idempotents
- consolider la traçabilité des paiements et statuts de sessions

Carte de test Stripe (mode test):
- `4000 0025 0000 1001`
- date future
- CVC 3 chiffres

Voir aussi `DOCUMENTATION.md` pour d'autres cartes de test Stripe.

### Essai gratuit et crédits
Une partie de l'UX (essai gratuit, cache local de crédits, profil local) reste en `localStorage`.
Le serveur conserve toutefois une source de vérité via Prisma/MongoDB pour les comptes et crédits.

## Déploiement sur Vercel

1. pousser le projet sur GitHub
2. importer le repo dans Vercel
3. ajouter les variables d'environnement (OpenAI, Stripe, NextAuth, base MongoDB)
4. déployer

Le plan Hobby de Vercel suffit pour tester ce MVP.

## Évolutions recommandées

- webhooks Stripe + reprise automatique des événements
- limite de débit et anti-abus côté base/session
- dashboard admin
- templates plus spécialisés
- historique complet côté compte utilisateur
- analytics
- SEO et landing pages par cas d'usage
