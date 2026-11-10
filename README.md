# ForgePilot

**Build smarter. Ship safer. Stay maintained.** ForgePilot is a SaaS workspace for teams building software with AI coding agents. It has three modules:

- **DevPilot** coordinates coding agents (Claude Code, OpenAI Codex). Each task runs in an isolated workspace, with live logs, budgets and approvals.
- **ShipSafe** verifies every pull request with commit-pinned tests and evidence: screenshots, traces and logs. It labels each failure honestly: product bug, flaky test or infrastructure.
- **CodeKeeper** keeps repositories healthy. It tracks dependencies, matches security advisories, scores health in an explainable way, and turns findings into verified maintenance PRs.

They share one closed loop: **task → agent → pull request → verification → fix if needed → human review → merge in GitHub → ongoing maintenance.**

This repository is the complete web product: marketing site, sign-up, onboarding, and the full app. It runs on a realistic mock API with fictional data, so you can click through every flow without a backend. The product spec is in [`docs/PRD.md`](docs/PRD.md).

## See it running (no coding needed)

You need [Node.js 22+](https://nodejs.org) and pnpm (`npm install -g pnpm`). Then, in this folder:

```bash
pnpm install
```

```bash
pnpm dev
```

Open <http://localhost:3000>. Click **Explore the live demo**, then pick a person:

| Person        | Workspace (plan)            | Role   | Try this                                                                     |
| ------------- | --------------------------- | ------ | ---------------------------------------------------------------------------- |
| Maya Chen     | Lumen Labs (Team)           | Owner  | Overview → DevPilot → **New task** → watch the agent → PR → ShipSafe → merge |
| Dev Patel     | Lumen Labs                  | Admin  | **Approvals**: let an agent write a database migration                       |
| Alex Kim      | Lumen Labs                  | Member | ShipSafe → a failed PR → **Create fix task**                                 |
| Jordan Lee    | Lumen Labs                  | Viewer | Everything is read-only                                                      |
| Sofia Alvarez | Northwind Studio (Business) | Owner  | An agency workspace with client projects                                     |

You can also **Start free** to see the whole sign-up and onboarding flow as a brand-new customer. Switch person from the user menu (bottom-left). Use **Reset demo data** in the same menu to go back to the starting story.

## Checks

| Command          | What it checks                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | Code style and React rules                                                                                                                    |
| `pnpm typecheck` | TypeScript types (strict)                                                                                                                     |
| `pnpm test`      | Unit tests: the closed loop, permissions, tenant isolation, budgets, plans, health score, colour contrast (WCAG AA), components, API contract |
| `pnpm e2e`       | Browser journeys: sign-up → first result, closed loop, approvals, roles, billing, every screen in light and dark                              |
| `pnpm build`     | Production build                                                                                                                              |

## How it's organised

```
app/(marketing)          /, /pricing, /security, /docs
app/login, app/signup    sign in / sign up (mocked)
app/onboarding           workspace → GitHub App → repos → discovery → first run
app/(app)/app/…          the product (Overview, Projects, DevPilot, ShipSafe, CodeKeeper,
                         Pull requests, Approvals, Analytics, Integrations, Billing, Settings)
app/api/mock/[...path]   mock API (every endpoint lives in lib/mock/handlers.ts)
components/              ui primitives, shared building blocks, shell, and one folder per module
lib/schemas              Zod schemas: the single source of truth for every type
lib/api                  data hooks (the only code that knows URLs)
lib/domain               plans & pricing, permissions, health score, task state machine
lib/mock                 in-memory database, closed-loop engine, time-based simulation
scripts/generate-mock-data.py   regenerates mocks/mock-data.json (deterministic, fictional)
docs/PRD.md              the product requirements (source of truth)
docs/api-contract.md     every endpoint with request/response schemas (generated)
```

## Swapping in the real backend

Screens never call URLs directly. They use hooks in `lib/api/hooks.ts`, and every response is checked against its schema. The backend team implements the endpoints in [`docs/api-contract.md`](docs/api-contract.md), then sets `NEXT_PUBLIC_API_BASE` to the backend's address. That contract file is generated from the code, and a test fails if it drifts.
