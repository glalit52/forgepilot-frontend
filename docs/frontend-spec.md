# ForgePilot Frontend Spec — Phase 1

Screen-by-screen spec for the Phase 1 web app. Pair with `CLAUDE.md` (rules, stack) and `docs/backlog-phase1-frontend.md` (build order).

## Global shell

- **Left sidebar** (~240px, collapsible): logo, org switcher (console only), navigation, user menu with **role switcher** (mock session).
- **Top bar:** page title + breadcrumbs, global search, notifications bell, theme toggle. Console adds Cmd/Ctrl+K command palette.
- **Right context panel** (optional, collapsible): details for the selected row (task, PR, evidence).
- States on every page: loading skeleton, empty state with next action, error with retry.

### Navigation

| Client portal (`/portal`) | Internal console (`/console`) |
| --- | --- |
| Overview | My queue |
| Applications | Tasks |
| Work (tasks & PRs) | Clients |
| Approvals (badge count) | Repositories |
| Evidence | Ops dashboard |
| Reports (savings, SLA) | *Agents (Phase 2, disabled "coming soon")* |
| Settings (team, SLAs, integrations) | *Incidents (Phase 3, disabled "coming soon")* |

Roles: `client_admin`, `client_approver`, `client_viewer` → portal; `fp_engineer`, `fp_manager` → console. Unauthorized routes redirect to the role's home.

## Shared components

| Component | Purpose |
| --- | --- |
| `StatusBadge` | Task/PR/verification state → colour + label |
| `ActorChip` | Shows who acted: agent (icon + model, e.g. "Claude Code · claude-sonnet") or person (avatar + name) |
| `HealthScore` | 0–100 ring with colour band (≥80 green, 60–79 amber, <60 red) and trend arrow |
| `SlaMeter` | % met vs target, breach count |
| `EvidenceTimeline` | Ordered EvidenceRecords with actor, time, artifacts, hash-verified icon |
| `VerificationSummary` | Tests passed/failed, scans, risk score, links to screenshots/logs |
| `DiffViewer` | Unified/split diff with file tree (use a light library or simple renderer) |
| `AiCodeFlag` | Badge when a PR is mostly AI-written ("AI-authored 78%") |
| `DataTable` | Sortable, filterable, paginated table (shadcn + TanStack Table) |
| `KpiCard` | Label, value, delta, sparkline |

## Client portal screens

### P-01 Overview — `/portal`
Purpose: the buyer's 10-second answer to "is everything OK and are we saving money?"
- KPI row: Applications covered, SLA met (this month), Changes delivered (this month), Estimated saving vs prior vendor, Open approvals.
- Health trend chart (avg health score per week, last 12 weeks).
- "Needs your attention": approvals waiting, SLA at risk, critical CVEs open.
- Recent activity feed (last 10 events with ActorChip).

### P-02 Applications — `/portal/applications`
- Table: app name, criticality, repos count, health score, open tasks, SLA status, tier.
- Row click → P-03.

### P-03 Application detail — `/portal/applications/[appId]`
- Header: name, owners, tier, environments.
- Tabs: **Health** (score breakdown: dependencies, security, build stability, tests, docs; findings list) · **Work** (tasks for this app) · **Repositories** · **Evidence**.
- "Download health report" (PDF stub).

### P-04 Work — `/portal/work`
- Table of tasks and PRs: title, app, type (upgrade, CVE patch, bug fix, enhancement, test), state, SLA due, actor, AI-authored %.
- Filters: app, type, state, date. Row → P-05.

### P-05 Task detail (client view) — `/portal/work/[taskId]`
- Summary: what changed and why in plain English, linked ticket, SLA due.
- VerificationSummary, AiCodeFlag, PR link (opens client Git).
- EvidenceTimeline.
- If state = `pr_open` and user is approver: **Approve** / **Request changes** (with comment). Approve needs ≤3 clicks from Approvals list.

### P-06 Approvals — `/portal/approvals`
- Queue of PRs awaiting client approval, oldest first, with risk score and verification status.
- Inline approve (confirm dialog shows tests passed + sign-off by name). Bulk approve disabled for high-risk items.

### P-07 Evidence — `/portal/evidence`
- Search/filter evidence packs by app, date range, change type.
- Export selected as PDF or JSON (stub download from mock).
- Each pack: diff summary, agent + model, tests, scans, engineer sign-off, client approval, hash chain status.

### P-08 Reports — `/portal/reports`
- Monthly savings report: tasks completed by type, estimated hours, prior vendor rate × hours vs ForgePilot fee, saving %.
- SLA report: per SLA metric, target vs actual, breaches with reasons.
- Download PDF (stub).

### P-09 Settings — `/portal/settings`
- Team (invite users, roles), SLA targets (read-only for now), Integrations (GitHub/GitLab connect status — mock), Notifications.

### P-10 Onboarding wizard — `/portal/onboarding`
Steps: 1) Company & contacts → 2) Connect Git provider (mock OAuth button) → 3) Select repositories → 4) Map repos to applications + criticality → 5) Confirm SLA tier → 6) "Scan running" progress → health report ready.

## Internal console screens

### C-01 My queue — `/console`
- Engineer's home: tasks assigned to me grouped by state (Awaiting review, Running, Escalated, Ready to launch).
- Each card: client, app, task, SLA countdown, last agent event.

### C-02 Tasks — `/console/tasks`
- All tasks across clients; filters: client, state, type, assignee, agent, SLA risk.
- "New task" dialog: client, repo, type, title, description, acceptance criteria, agent (Claude Code / Codex), priority.

### C-03 Agent workspace (task detail) — `/console/tasks/[taskId]`
The core engineer screen (P1-07).
- Left: task info, plan (editable list of steps + acceptance criteria), **Approve plan** button.
- Centre tabs: **Live log** (streaming agent output, mocked with timed events) · **Diff** (DiffViewer) · **Verification** (VerificationSummary with per-test results, screenshots) · **Evidence**.
- Right: AgentRun history (attempt #, agent, model, tokens, cost, duration, outcome).
- Actions by state: Launch agent · Stop · Retry with notes · Take over manually (marks human actor) · **Sign off** (only if verification passed; requires checkbox "I reviewed the diff") · Open PR.

### C-04 Clients — `/console/clients` and `/console/clients/[orgId]`
- Client list: tier, apps, ARR, SLA status, open tasks, margin (manager only).
- Client detail: apps, contract, SLA, contacts, recent tasks.

### C-05 Repositories — `/console/repositories/[repoId]`
- Health score breakdown, findings, coverage, flaky tests, recent scans, "Run scan" (mock).

### C-06 Ops dashboard — `/console/ops` (fp_manager)
- KPIs: SLA met %, tasks completed (week), agent share %, avg cost per task, gross margin %, escalations.
- Charts: tasks by state per client; agent share trend; SLA risk list.

### Command palette (console)
Actions: go to client/app/task, new task, launch agent on task, open approvals, switch role (dev only).

## Mock data

`mocks/mock-data.json` holds 3 organizations (bank, insurer, fintech), apps, repos, ~25 tasks across all states, agent runs, verification runs, evidence records, users per role. Extend as needed; keep it realistic. Use a mock "live log" generator that emits events every 1–2s for running tasks.

## Non-functional

- Lighthouse performance ≥ 90 on Overview; pages interactive < 2s on mock data.
- All tables virtualise or paginate beyond 100 rows.
- i18n-ready strings (English only for now). Dates in user locale; times show timezone.
