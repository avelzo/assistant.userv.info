---
description: "Use when editing Next.js API routes, route handlers, request validation, OpenAI or Stripe server logic, and HTTP error responses in this MVP."
name: "API Routes Guidelines"
applyTo: "app/api/**/*.ts"
---
# API Routes Guidelines

- Keep route handlers aligned with Next.js App Router server route patterns used in this project (`export async function POST(...)`, `NextResponse.json(...)`).
- Keep implementation in TypeScript with explicit request and response shapes; avoid `any`.
- Keep user-facing API messages in French unless a task explicitly asks for another language.
- Validate request payloads defensively and return clear HTTP status codes for invalid input (`400`), rate limits (`429`), upstream/provider issues (`5xx`), and success (`200`).
- Preserve the generation response contract in `app/api/generate/route.ts`: JSON must include `letter` and `emailVersion`.
- Preserve current backend assumptions unless explicitly requested otherwise:
  - auth is handled with NextAuth credentials,
  - persistence is handled with Prisma + MongoDB,
  - generation route keeps in-memory rate limiting.
- Keep environment-variable checks explicit and fail fast for missing required secrets.
- Do not leak sensitive values (API keys, tokens, secrets) in logs, errors, or response payloads.
- Keep external provider calls resilient:
  - handle non-OK provider responses,
  - validate provider payload shape before use,
  - return stable error objects to clients.
- Keep Stripe checkout and credit-claim behavior compatible with existing frontend and DB credit ledger flow.
- Reuse existing patterns when possible:
  - `app/api/generate/route.ts` for validation, rate limiting, and structured responses.
  - `app/api/create-checkout-session/route.ts` for Stripe session creation flow.
  - `app/api/credits/claim/route.ts` for idempotent post-payment crediting.
  - `app/api/account/route.ts` for account upsert + email migration updates.
  - `app/api/auth/register/route.ts` and `app/api/auth/[...nextauth]/route.ts` for auth conventions.
- When changing API behavior, update affected tests and E2E expectations to keep contract and UX flow coherent.
