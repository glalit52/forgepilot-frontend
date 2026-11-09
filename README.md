# ForgePilot — web frontend (Phase 1 "Assure")

The ForgePilot web app has two halves in one codebase:

- **Client portal** (`/portal`) for client buyers, approvers and compliance. It covers the overview, applications, work, approvals, evidence, reports, settings and integrations, plus a 6-step onboarding wizard.
- **Engineer console** (`/console`) for ForgePilot engineers and delivery managers. It covers My queue, tasks, the agent workspace, clients, repositories, the ops dashboard, agents and integrations, and a ⌘K command palette.

There is **no backend yet**. Every screen runs on realistic mock data (`mocks/mock-data.json`) served by a small mock API. Every company and person is fictional, and the app shows a "Demo data" badge.

## See it running (no coding needed)

You need [Node.js 22+](https://nodejs.org) and pnpm (`npm install -g pnpm`). Then, in this folder:

```bash
pnpm install
```

```bash
pnpm dev
```

Open <http://localhost:3000>. Pick a persona to "sign in" as:

| Persona | Role | What to try |
| --- | --- | --- |
| Priya Shah (Acme Bank) | Client approver | **Approvals** → Approve PR #409 (2 clicks) |
| Ravi Menon (Acme Bank) | Client admin | **Overview**, **Reports** (savings & SLA), **Settings → Integrations** |
| Neha Kapoor (Acme Bank) | Client viewer | Read-only: there are no approve buttons |
| Arjun Rao | ForgePilot engineer | **Tasks → "Patch OpenSSL… web image"** → Launch agent → watch the live log → tick "I reviewed the diff" → Sign off → Open PR |
| Kabir Singh | Delivery manager | **Ops dashboard** (only managers can open it) |

You can switch persona at any time from the user menu (bottom-left). The same menu has **Reset demo data**, which puts everything back to the starting story. The sign-in page also links to the onboarding wizard and the component gallery (`/dev/components`).

## Checks (what "all green" means)

| Command | What it checks |
| --- | --- |
| `pnpm lint` | Code style and React rules (ESLint) |
| `pnpm typecheck` | TypeScript types (strict) |
| `pnpm test` | Unit tests: workflow rules, mock API, colour contrast (WCAG AA), components, API contract |
| `pnpm e2e` | Browser journeys (Playwright): approver approves, engineer ships, client onboards, role guards |
| `pnpm build` | Production build |

## How it's organised

```
app/(portal)/portal/…      client portal pages
app/(console)/console/…    engineer console pages
app/api/mock/[...path]     mock API (dispatches to lib/mock/handlers.ts)
app/dev/components         component gallery, light + dark side by side
components/ui              shadcn-style primitives
components/shared          StatusBadge, ActorChip, HealthScore, SlaMeter, EvidenceTimeline,
                           VerificationSummary, DiffViewer, AiCodeFlag, DataTable, KpiCard…
components/shell           sidebar, top bar, role switcher, notifications, search
lib/schemas                Zod schemas: the single source of truth for every type
lib/api                    fetch client + TanStack Query hooks (the only code that knows URLs)
lib/domain                 product rules: task state machine, SLA, roles, hash chain, labels
lib/mock                   in-memory mock database, simulation, generators, route table
mocks/mock-data.json       seed data (validated against lib/schemas on startup)
docs/                      PRD, frontend spec, backlog, API contract (generated)
tests/unit, tests/e2e      Vitest and Playwright tests
```

## Swapping in the real backend

The UI never calls URLs directly. It goes through `lib/api/hooks.ts`, which uses `lib/api/client.ts`, and every response is checked against its Zod schema. To use a real backend, the backend team implements the endpoints in [`docs/api-contract.md`](docs/api-contract.md). That file is generated from the code, and a test fails if it drifts. Then set `NEXT_PUBLIC_API_BASE` to the backend's address.
