---
description: "Use when editing frontend UI, pages, or components in Next.js App Router with Tailwind. Covers responsive layout, accessibility, French user copy, and safe client storage patterns for this MVP."
name: "Frontend UI Guidelines"
applyTo: "app/**/*.tsx,components/**/*.tsx"
---
# Frontend UI Guidelines

- Keep UI changes aligned with current Next.js App Router and Tailwind utility patterns used in the project.
- Preserve main product flows:
  - marketing + checkout feedback on `app/page.tsx`,
  - generator input on `app/generate/page.tsx`,
  - generated output rendering on `app/result/page.tsx`,
  - auth flows in `app/auth/*`,
  - account/profile flows in `app/account/page.tsx` and `app/settings/page.tsx`.
- Keep user-facing text in French unless a task explicitly asks for another language.
- Keep visual style consistent with existing design direction (rounded cards, slate and blue palette, clear hierarchy) unless a redesign is explicitly requested.
- Build mobile-first layouts and verify readability on small screens before adding desktop refinements.
- Preserve accessibility basics: semantic HTML, explicit labels for form inputs, sufficient contrast, and keyboard-reachable controls.
- For client-only behavior, keep `'use client'` where hooks, browser APIs, or navigation are used.
- Keep browser storage usage SSR-safe by reusing patterns from `lib/storage.ts` and guarding `window` access.
- For premium/generation/account UX changes, maintain compatibility with existing localStorage/sessionStorage keys and behavior.
- Reuse existing examples when possible:
  - `components/GeneratorForm.tsx` for form + fetch + navigation flow.
  - `components/ResultCard.tsx` for result rendering and client interactions.
  - `components/PaymentFlag.tsx` for post-checkout status UX.
- Keep frontend behavior aligned with current backend capabilities (NextAuth session + Prisma-backed credits/account data).
- When changing behavior, add or update tests in `components/__tests__/` and keep E2E expectations in `e2e/home.spec.ts` coherent with UI updates.
