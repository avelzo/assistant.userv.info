# Project Guidelines

## Code Style
- Use TypeScript with strict typing and avoid any.
- Keep imports using the @/* alias when importing from project root.
- Match existing Next.js App Router patterns and Tailwind utility style used in the app.
- Keep user-facing copy and API error messages in French unless a task explicitly asks for another language.

## Architecture
- App routes live in app/ using App Router:
  - app/page.tsx is the marketing/landing entry.
  - app/generate/page.tsx is the generator flow.
  - app/result/page.tsx renders generated content from session storage.
  - app/auth/* hosts login/register/forgot/reset flows.
  - app/account/page.tsx and app/settings/page.tsx expose account and profile settings.
- API routes are in app/api:
  - app/api/generate/route.ts handles OpenAI generation and in-memory rate limiting.
  - app/api/create-checkout-session/route.ts handles Stripe checkout session creation.
  - app/api/credits/claim/route.ts validates Stripe sessions and credits user balances.
  - app/api/packs/route.ts exposes active credit packs.
  - app/api/account/route.ts upserts account profile data.
  - app/api/auth/* and app/api/auth/[...nextauth]/route.ts handle auth flows.
- Reusable UI lives in components/, and shared client helpers live in lib/.
- Server-side persistence exists via Prisma + MongoDB for users, credits, and generations.
- Client-side persistence remains intentional for UX continuity:
  - lib/storage.ts mirrors usage/credits/account hints in localStorage.
  - Generation results are passed through sessionStorage between pages.

## Build and Test
- Install: npm install
- Dev server: npm run dev
- Lint: npm run lint
- Typecheck: npm run typecheck
- Unit tests: npm run test
- E2E tests: npm run test:e2e
- Production build: npm run build
- CI reference: Jenkinsfile runs lint, typecheck, tests, build, then Playwright Chromium tests.

## Conventions
- Preserve the current auth and persistence model unless explicitly asked to redesign it:
  - NextAuth credentials flow,
  - Prisma MongoDB models,
  - credit ledger and balances.
- For generation changes, preserve the JSON contract returned by app/api/generate/route.ts: letter and emailVersion.
- For UI changes touching premium flow, preserve compatibility with the existing localStorage/sessionStorage keys and behavior.
- Keep SSR-safe browser storage access patterns (guard window usage) in client code.
- Reuse established examples when adding features:
  - components/GeneratorForm.tsx for client form + fetch + navigation flow.
  - components/__tests__/GeneratorForm.test.tsx for unit test style.
  - e2e/home.spec.ts for Playwright style.

## Documentation
- For setup, environment variables, deployment, and MVP limitations, refer to README.md.
- Avoid duplicating README.md content in code comments or new docs; link to it when possible.
