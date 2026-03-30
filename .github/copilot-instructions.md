# Project Guidelines

## Code Style
- Use TypeScript with strict typing and avoid any.
- Keep imports using the @/* alias when importing from project root.
- Match existing Next.js App Router patterns and Tailwind utility style used in the app.
- Keep user-facing copy and API error messages in French unless a task explicitly asks for another language.

## Architecture
- App routes live in app/ using App Router:
  - app/page.tsx is the landing flow.
  - app/result/page.tsx renders generated content from session storage.
- API routes are in app/api:
  - app/api/generate/route.ts handles OpenAI generation and in-memory rate limiting.
  - app/api/create-checkout-session/route.ts handles Stripe checkout session creation.
- Reusable UI lives in components/, and shared client helpers live in lib/.
- Client-side persistence is intentional for this MVP:
  - lib/storage.ts manages free-usage and premium unlock state in localStorage.
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
- Do not introduce persistence or auth assumptions unless asked; this repository is an MVP and intentionally does not include a database or user accounts.
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
