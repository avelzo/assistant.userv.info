---
description: "Use when editing frontend UI, pages, or components in Next.js App Router with Tailwind. Covers responsive layout, accessibility, French user copy, and safe client storage patterns for this MVP."
name: "Frontend UI Guidelines"
applyTo: "app/**/*.tsx,components/**/*.tsx"
---
# Frontend UI Guidelines

- Keep UI changes aligned with current Next.js App Router and Tailwind utility patterns used in the project.
- Preserve the MVP flow on the home page and result page: generator input on `app/page.tsx`, generated output rendering on `app/result/page.tsx`.
- Keep user-facing text in French unless a task explicitly asks for another language.
- Keep visual style consistent with existing design direction (rounded cards, slate and blue palette, clear hierarchy) unless a redesign is explicitly requested.
- Build mobile-first layouts and verify readability on small screens before adding desktop refinements.
- Preserve accessibility basics: semantic HTML, explicit labels for form inputs, sufficient contrast, and keyboard-reachable controls.
- For client-only behavior, keep `'use client'` where hooks, browser APIs, or navigation are used.
- Keep browser storage usage SSR-safe by reusing patterns from `lib/storage.ts` and guarding `window` access.
- For premium and generation flow changes, maintain compatibility with existing localStorage and sessionStorage keys and behavior.
- Reuse existing examples when possible:
  - `components/GeneratorForm.tsx` for form + fetch + navigation flow.
  - `components/ResultCard.tsx` for result rendering and client interactions.
  - `components/PaymentFlag.tsx` for post-checkout status UX.
- Do not introduce backend persistence or auth assumptions unless explicitly requested; this repository is intentionally MVP-level.
- When changing behavior, add or update tests in `components/__tests__/` and keep E2E expectations in `e2e/home.spec.ts` coherent with UI updates.
