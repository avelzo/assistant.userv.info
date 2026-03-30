# Assistant Administratif AI

MVP Next.js pour générer des lettres et emails administratifs en français.

## Fonctionnalités incluses

- Landing page simple
- Générateur de lettre administrative
- Catégories principales (CAF, assurance, résiliation, employeur, banque, logement)
- Ton du courrier (standard, ferme, très poli)
- Résultat avec copie dans le presse-papiers
- Export PDF
- Version email générée automatiquement
- Essai gratuit local
- Paiement Stripe à l'unité (MVP)

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI API
- Stripe Checkout

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Variables d'environnement

```env
OPENAI_API_KEY=sk-...
#OPENAI_MODEL=gpt-4o-mini
OPENAI_MODEL=gpt-5.4-nano
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Assistant Administratif AI
MOCK_AI=false
NEXT_PUBLIC_FREE_GENERATIONS=1
```

## Structure

- `app/` : pages et routes API
- `components/` : interface utilisateur
- `lib/` : constantes, helpers PDF, stockage local

## Limites MVP importantes

Ce projet est volontairement simple pour démarrer vite.

### Paiement
Le déblocage premium se fait côté navigateur après redirection Stripe `?payment=success`.
C'est acceptable pour un prototype, mais **pas assez sécurisé pour une vraie production**.

Pour une version production propre, il faut :
- créer un produit/prix Stripe réel
- utiliser un identifiant client ou session
- gérer un webhook Stripe
- enregistrer l'état du paiement dans une base de données
- lier l'accès premium à un compte utilisateur

### Gratuit / premium
Le compteur gratuit est stocké en `localStorage`.
Là aussi, c'est parfait pour un MVP, mais pas pour empêcher les contournements.

## Déploiement sur Vercel

1. pousser le projet sur GitHub
2. importer le repo dans Vercel
3. ajouter les variables d'environnement
4. déployer

Le plan Hobby de Vercel suffit pour tester ce MVP.

## Évolutions recommandées

- authentification
- historique des lettres
- dashboard admin
- templates plus spécialisés
- suivi de paiement sécurisé
- webhook Stripe
- base Supabase / PostgreSQL
- analytics
- SEO et landing pages par cas d'usage
