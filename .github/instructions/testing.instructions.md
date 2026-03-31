---
description: "Use when writing or updating unit tests with Vitest/Testing Library or end-to-end tests with Playwright in this Next.js MVP. Covers mocks, French assertions, and stable test flow."
name: "Testing Guidelines"
applyTo: "components/__tests__/**/*.tsx,e2e/**/*.ts,vitest.config.mts,vitest.setup.ts,playwright.config.ts"
---
# Testing Guidelines

- Keep test stack consistent with the project setup:
  - unit/component tests: Vitest + Testing Library,
  - e2e tests: Playwright.
- Keep test descriptions and user-visible expectations in French, matching product copy.
- Follow existing unit test style in `components/__tests__/GeneratorForm.test.tsx`:
  - mock `next/navigation` when verifying redirects,
  - mock browser storage where needed,
  - mock `fetch` for API-dependent flows,
  - use async queries and `waitFor` for state transitions.
- Prefer accessible selectors (`getByRole`, label text, visible button names) before placeholders or brittle DOM selectors.
- Keep tests behavior-focused:
  - validate user-visible outcomes,
  - assert route navigation side effects,
  - avoid asserting implementation details that make tests fragile.
- For API error states and validation rules, ensure at least one test covers each critical branch introduced by a change.
- For E2E, follow patterns in `e2e/home.spec.ts` and keep assertions deterministic.
- When adding E2E scenarios, avoid network flakiness by using stable flows and explicit expectations.
- Keep compatibility with Playwright configuration in `playwright.config.ts` (base URL and `webServer` behavior).
- When UI/API behavior changes, update both unit and E2E tests as needed so contracts stay coherent.
- Run the smallest relevant test scope first, then run the broader suite before finalizing:
  - `npm run test` for unit coverage,
  - `npm run test:e2e` for end-to-end coverage.
