# ForgePilot — Frontend (CLAUDE.md)

This file tells Claude Code what ForgePilot is and how to work in this repo. Read it fully before any task.

## What ForgePilot is

ForgePilot is an AI-native engineering operations company. It **maintains, tests and runs enterprise applications under one SLA**, priced per application per month. AI coding agents (Claude Code, OpenAI Codex, Devin) do most of the work; ForgePilot engineers review and sign off every change; the client approves and sees everything in one portal.

Full product context: `docs/PRD.md`. Screen-by-screen spec: `docs/frontend-spec.md`. Work queue: `docs/backlog-phase1-frontend.md`.

## What this repo is

The **web frontend** for Phase 1 ("Assure": Maintain + Verify). One Next.js app with two areas:

| Area | Route prefix | Who uses it |
| --- | --- | --- |
| Client portal | `/portal` | Client buyer, client approver, client compliance |
| Internal console | `/console` | ForgePilot engineers and delivery managers |

There is **no backend yet**. Build against typed mock data (`mocks/mock-data.json`) behind a small API layer so the real API can replace it later without touching UI components.

## Stack (use unless the repo already says otherwise)

- Next.js (App Router) + TypeScript, `strict: true`
- Tailwind CSS + shadcn/ui components; lucide-react icons
- TanStack Query for data fetching; Zod for schemas and runtime validation
- Mock API: Next.js route handlers under `app/api/mock/*` reading `mocks/mock-data.json`
- Charts: Recharts
- Tests: Vitest + React Testing Library (units), Playwright (end-to-end)
- Package manager: pnpm
- Lint/format: ESLint + Prettier

If the repo already has a different setup, follow what exists and note it here.

## Folder layout

```
app/
  (portal)/portal/...        client portal pages
  (console)/console/...      internal console pages
  api/mock/...               mock route handlers
components/
  ui/                        shadcn primitives (generated)
  shared/                    StatusBadge, HealthScore, SlaMeter, EvidenceTimeline, DiffViewer...
lib/
  api/                       typed fetchers — the ONLY place that knows URLs
  schemas/                   Zod schemas = source of truth for types
  utils/
mocks/mock-data.json
docs/
tests/e2e/
```

## Domain vocabulary (use these exact names in code and UI)

Organization (client), Contract, Application, Repository, Task, Plan, AgentRun, VerificationRun, PullRequest, Approval, EvidenceRecord, Scan, HealthScore, SLA.

Task states (in order): `created → planned → plan_approved → running → verifying → retrying → escalated → awaiting_review → signed_off → pr_open → client_approved → merged → closed`. Also `failed`, `rejected`.

## Product rules the UI must respect

1. **Verified before shipped.** Never show a "merge" or "ship" action unless verification passed AND an engineer signed off.
2. **Evidence on everything.** Every task detail view links to its evidence timeline.
3. **Client stays in control.** Client approval is explicit; never imply auto-merge.
4. **Human vs agent is always visible.** Every action shows its actor: an agent (with model name) or a named person.
5. **No fake numbers in production UI.** Mock data is clearly mock; never hardcode metrics in components.

## Design

- Feel: a calm, professional command centre (Linear clarity, GitHub familiarity). Dense but uncluttered.
- Light and dark themes from day one; CSS variables via Tailwind/shadcn theming.
- Font: Inter or Geist. Radius 8px. One accent colour (violet) for primary actions only.
- Status colours: green = passed/healthy, amber = at risk/needs review, red = failed/breached, grey = neutral.
- Desktop-first, usable down to 1024px; portal approvals must also work on mobile.
- Accessibility: keyboard navigable, visible focus, WCAG AA contrast, aria labels on icon buttons.
- Global command palette (Cmd/Ctrl+K) in the console.

## How to work

- Start each ticket by reading its entry in `docs/backlog-phase1-frontend.md`; meet every acceptance criterion.
- Small PRs: one ticket per branch (`fe/FE-03-portal-dashboard`).
- Types come from Zod schemas in `lib/schemas`; never duplicate types by hand.
- Components never fetch directly; they call hooks in `lib/api`.
- Every page handles loading, empty and error states.
- Add/extend mock data when a screen needs it; keep it realistic (banking/insurance apps, Java/.NET/TS repos).
- Before finishing: `pnpm lint && pnpm typecheck && pnpm test` must pass; add a Playwright test for each new user journey.
- Explain changes in plain English in the PR description — the founder is non-technical.

## Do not

- Do not add a backend, database or auth provider yet (use a mock session with role switcher: client_admin, client_approver, client_viewer, fp_engineer, fp_manager).
- Do not add new dependencies without saying why in the PR.
- Do not commit secrets or real client data.
