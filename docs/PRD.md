# ForgePilot PRD (developer copy)

Source of truth: the "ForgePilot PRD: Product Requirements, Phases 1–3" Claude Doc. This is a condensed copy for the codebase. As of 2026-11-09.

## 1. Summary

ForgePilot keeps enterprise software maintained, tested and running — including the fast-growing volume of AI-written code — under one SLA, at 30–50% below an IT services contract. AI agents do most of the work, ForgePilot engineers review and sign off every change, and the client sees everything in one portal.

| Phase | Name                          | Timing       | What ships                                                                                                                                  | Gate to move on                                     |
| ----- | ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1     | Assure (Maintain + Verify)    | Months 0–6   | Repo onboarding, health scan, regression testing, maintenance PRs, evidence packs, client portal, internal agent workspace v1               | 3 paid pilots, ≥30% verified saving, ≥95% SLA met   |
| 2     | Orchestrate (Conductor-style) | Months 6–15  | Parallel multi-agent execution, Jira/ServiceNow intake, agent routing, conflict detection, agent analytics, policy engine, compliance packs | $5M ARR, ≥50% tasks agent-completed, SOC 2 Type II  |
| 3     | Run (Traversal-style)         | Months 15–30 | Alert intake, change-linked root cause, remediation proposals, replay benchmark, production risk checks, production Q&A + MCP               | Measured root-cause accuracy before any SLA is sold |

Buyer: CIO / head of application delivery / VP Engineering. Pricing: fixed fee per application per month (Maintain, Maintain + Assure, Full Run).

## 2. Personas

| Persona                                 | Needs                                                         | Surface                               |
| --------------------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| Buyer (CIO, VP Eng)                     | Lower cost, predictable SLAs, proof AI code is safe           | Portal: savings report, SLA dashboard |
| Client approver (tech lead / app owner) | Approve fast, see what changed and why                        | Portal: approvals, PRs in their Git   |
| Client compliance                       | Evidence every change was tested, scanned, signed off         | Portal: evidence packs, audit export  |
| ForgePilot engineer                     | Run many agent tasks, review fast, never ship unverified work | Console: agent workspace              |
| ForgePilot delivery manager             | SLA, workload, margin per client                              | Console: ops dashboard                |
| ForgePilot on-call (Phase 3)            | Likely cause of outage in minutes                             | Console: incident console             |

## 3. Principles

1. Verified before shipped (tests + security scan + named engineer sign-off).
2. Evidence on everything.
3. Agent-agnostic (Claude Code, Codex, Devin behind one interface).
4. Client stays in control (code in client repos/cloud; client rules decide merges).
5. Context compounds (per-client context graph).
6. Measure agent share of work.

## 4. Phase 1 features (frontend-relevant marked ★)

| ID      | Feature                       | Notes                                                                          |
| ------- | ----------------------------- | ------------------------------------------------------------------------------ |
| P1-01 ★ | Client onboarding             | Connect Git provider, register apps, environments, owners, SLAs                |
| P1-02 ★ | Repository health scan        | Health score 0–100 + ranked backlog                                            |
| P1-03   | Context graph v1              | Backend                                                                        |
| P1-04   | Test generation and upkeep    | Backend; coverage shown in UI                                                  |
| P1-05 ★ | PR verification gate          | Results shown as PR checks and in UI                                           |
| P1-06 ★ | Maintenance tasks             | Upgrades, CVE patches, fixes as agent tasks → PRs                              |
| P1-07 ★ | Agent workspace v1 (internal) | Launch task, live log, diff review, rerun, sign off                            |
| P1-08 ★ | Evidence pack                 | Diff summary, agent/model, tests, scans, sign-off, timestamps; PDF/JSON export |
| P1-09 ★ | Client portal v1              | SLA status, work, approvals, health trend, evidence                            |
| P1-10 ★ | AI-code risk flags            | Stricter checks on mostly-AI PRs                                               |
| P1-11   | Flaky-test detection          | Backend; surfaced as badge                                                     |
| P1-12 ★ | Savings report                | Monthly tasks, hours vs prior vendor, SLA                                      |
| P1-13 ★ | Ops dashboard (internal)      | Workload, SLA risk, agent share, cost per task, margin                         |

## 5. Phase 1 journeys

- **J1 Onboarding:** manager creates workspace → client approver connects repos → health scan + context graph → client sees health report + 90-day plan, agrees SLAs.
- **J2 Maintenance change:** backlog item → task → engineer launches agent in sandbox → verification (retry max 3, then escalate) → engineer signs off → PR with evidence → client approves → merge under client rules.
- **J3 Verify client's AI PR:** client PR → verification gate → pass/fail/needs review with screenshots/logs → optional fix proposal.

## 6. Phase 1 acceptance criteria

- Repo onboarded and scanned in < 1 working day.
- 100% of ForgePilot PRs carry an evidence pack; 0 merges without recorded sign-off.
- Verification results < 15 min for 90% of PRs.
- Critical CVEs patched with PR within 72 hours.
- ≥40% of maintenance tasks agent-completed with only review edits.
- Client can approve a change in ≤3 clicks from the portal.

## 7. Phases 2–3 (for awareness; do not build yet)

Phase 2: parallel agent workspaces and board, ticket intake (Jira/ServiceNow/Linear), task planner, agent router, conflict detection, best-of-N runs, agent analytics, client policy engine, compliance packs, context graph v2, client self-service requests, cost guardrails.

Phase 3: alert intake, telemetry connectors, service map, change-linked triage, root-cause agent, remediation proposals (approval required), incident console, Slack/Teams bot, replay benchmark, post-incident loop, partner mode, alert noise cleanup, pre-approved self-healing, production risk check on PRs, production Q&A + MCP server.

Design the console navigation so Phase 2 (Agents board, Analytics) and Phase 3 (Incidents) can slot in later.

## 8. Architecture (for context)

- **Control plane (our cloud):** web apps, API + SSO/RBAC, task service, orchestrator, policy engine, evidence service, analytics.
- **Execution plane (client cloud/VPC):** outbound-only runner, sandboxes + agent adapters, verification engine, context graph; Phase 3 investigator + telemetry.
- Frontend talks only to the control-plane API. Until it exists, use the mock API.

## 9. Core entities (frontend types)

Organization, Contract, Application, Repository, Task, Plan, AgentRun, VerificationRun, PullRequest, Approval, EvidenceRecord, Scan, User (with role). See `mocks/mock-data.json` for shapes.
