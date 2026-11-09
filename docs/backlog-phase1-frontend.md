# Phase 1 Frontend Backlog

Build in this order. One ticket = one branch = one PR. Each ticket lists acceptance criteria (AC); a ticket is done only when every AC passes plus `pnpm lint && pnpm typecheck && pnpm test`.

Screen IDs (P-xx, C-xx) refer to `docs/frontend-spec.md`.

## Sprint 1 — Foundation (week 1–2)

### FE-01 Project setup

- Next.js (App Router) + TypeScript strict, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Playwright, pnpm scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `e2e`).
- AC: `pnpm dev` shows a placeholder page; CI-ready scripts all pass; README explains how to run in plain English.

### FE-02 Design system and theme

- Tokens for colours (accent violet, status green/amber/red/grey), radius 8px, Inter/Geist font; light + dark themes with toggle.
- Shared components: StatusBadge, ActorChip, KpiCard, HealthScore, SlaMeter (with stories or a `/dev/components` gallery page).
- AC: gallery page shows every component in both themes; contrast passes WCAG AA.

### FE-03 Schemas, mock data and API layer

- Zod schemas for all entities in `lib/schemas`; types inferred from them.
- `mocks/mock-data.json` validated against schemas at startup (dev).
- Mock route handlers `app/api/mock/*` + TanStack Query hooks in `lib/api`.
- AC: invalid mock data fails loudly in dev; hooks return typed data; no component imports JSON directly.

### FE-04 App shell, navigation and mock session

- Sidebar, top bar, breadcrumbs, context panel slot; role switcher in user menu; route guards per role.
- Disabled "coming soon" nav items for Agents (Phase 2) and Incidents (Phase 3) in console.
- AC: switching role moves you to that role's home; portal roles cannot open `/console` and vice versa.

## Sprint 2 — Client portal core (week 3–4)

### FE-05 Portal Overview (P-01)

- AC: KPIs, health trend chart, "needs your attention" list and activity feed render from mock data; empty and error states exist.

### FE-06 Applications list and detail (P-02, P-03)

- AC: table sorts/filters; detail tabs Health/Work/Repositories/Evidence work; health breakdown shows 5 dimensions with findings.

### FE-07 Work list and task detail (P-04, P-05)

- AC: filters by app/type/state/date; task detail shows plain-English summary, VerificationSummary, AiCodeFlag, EvidenceTimeline.

### FE-08 Approvals (P-06) + approve/request-changes flow

- AC: approver can approve in ≤3 clicks from the Approvals list; confirm dialog shows tests passed and engineer sign-off name; viewer role sees no approve buttons; approval appends an EvidenceRecord in mock state.
- Playwright: journey "client approver approves a PR".

## Sprint 3 — Engineer console (week 5–6)

### FE-09 My queue and Tasks list (C-01, C-02)

- AC: tasks grouped by state; SLA countdown; "New task" dialog validates with Zod and adds a task to mock state.

### FE-10 Agent workspace (C-03)

- Live log (mock streaming), Diff tab, Verification tab, Evidence tab, AgentRun history.
- Actions: Launch, Stop, Retry with notes, Take over manually, Sign off, Open PR — each enabled only in valid states.
- AC: Sign off is impossible unless verification passed and the "I reviewed the diff" box is ticked; every action writes an EvidenceRecord with the correct actor (agent vs person).
- Playwright: journey "engineer launches agent → verification passes → signs off → PR opens".

### FE-11 Command palette

- AC: Cmd/Ctrl+K opens palette; can navigate to client, app, task and trigger "New task".

## Sprint 4 — Evidence, reports, onboarding, ops (week 7–8)

### FE-12 Evidence (P-07)

- AC: filter by app/date/type; export selected as JSON (real) and PDF (stub); hash-chain status icon per pack.

### FE-13 Reports (P-08)

- AC: savings and SLA reports computed from mock tasks (no hardcoded totals); PDF download stub.

### FE-14 Onboarding wizard (P-10)

- AC: 6 steps with back/next, validation, mock OAuth connect, repo selection, mapping to apps; ends on a health report view.
- Playwright: journey "new client onboards and sees health report".

### FE-15 Ops dashboard and clients (C-04, C-06)

- AC: manager-only; KPIs and charts computed from mock data; engineers cannot access.

### FE-16 Repository detail (C-05)

- AC: health breakdown, findings, coverage, flaky-test badges, "Run scan" shows progress then updated mock results.

## Sprint 5 — Polish (week 9–10)

### FE-17 Accessibility and responsiveness pass

- AC: keyboard-only walkthrough of all journeys; approvals usable on a 390px-wide phone; axe checks pass on key pages.

### FE-18 Demo mode

- Seeded "Acme Bank" demo story for sales pilots: one critical CVE patched end-to-end, savings report filled.
- AC: one-click reset of demo data; no console errors.

### FE-19 API contract handoff

- Document every mock endpoint (method, path, request/response schema) in `docs/api-contract.md` so the backend can implement it.
- AC: contract matches `lib/schemas` exactly.
