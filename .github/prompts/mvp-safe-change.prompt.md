---
description: "Apply a product change while preserving MVP constraints, French UX copy, storage compatibility, and API contracts."
name: "MVP Safe Change"
argument-hint: "Describe the change to implement"
agent: "agent"
---
Implement this change request in the current workspace while keeping the MVP behavior stable:

{{input}}

Requirements:
- Follow workspace standards in [Project Guidelines](../copilot-instructions.md).
- Apply frontend rules from [Frontend UI Guidelines](../instructions/frontend-ui.instructions.md) when touching UI.
- Apply API rules from [API Routes Guidelines](../instructions/api-routes.instructions.md) when touching server routes.
- Apply testing rules from [Testing Guidelines](../instructions/testing.instructions.md) when touching tests.
- Keep all user-facing copy and API error messages in French unless the request explicitly asks otherwise.
- Preserve MVP assumptions unless explicitly requested:
  - no database,
  - no authentication,
  - current localStorage/sessionStorage behavior.
- Preserve API contract for generation responses: JSON with `letter` and `emailVersion`.
- Prefer minimal, targeted edits; avoid unrelated refactors.

Execution checklist:
1. Identify impacted files and summarize the plan briefly.
2. Implement the smallest complete change set.
3. Update or add tests only where behavior changed.
4. Run relevant checks (`npm run test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`) based on scope.
5. Report:
   - files changed,
   - key behavior preserved,
   - commands run and outcomes,
   - any risks or follow-ups.

Output format:
- Summary of implemented change
- Changed files
- Validation run
- Residual risks
