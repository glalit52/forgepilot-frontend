<!-- Converted from ForgePilot_Final_PRD.docx (v1.0, 4 Nov 2026). Source of truth for the product. -->

FORGEPILOT

AI ENGINEERING OPERATIONS PLATFORM

Build smarter. Ship safer. Stay maintained.

FINAL PRODUCT REQUIREMENTS DOCUMENT (PRD)

Product strategy • User journeys • Functional specification • Technical architecture • Delivery phases

Version 1.0 | 04 November 2026

Working product name — subject to trademark and domain clearance

THREE INTEGRATED PRODUCTS

FEATURE 1 • SHIPSAFE — Test, verify and release

FEATURE 2 • CODEKEEPER — Maintain, secure and repair

FEATURE 3 • DEVPILOT — Coordinate AI coding agents

Prepared as an engineering handoff blueprint. Product assumptions, targets and integrations require validation with design partners and the founding engineering team.

# Document control

| Item                    | Details                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Product                 | ForgePilot                                                                                         |
| Category                | Developer tools / AI engineering operations / B2B SaaS                                             |
| Core modules            | ShipSafe, CodeKeeper, DevPilot                                                                     |
| Primary customer        | Software developers and engineering teams                                                          |
| Initial ICP             | AI-native startups and small engineering teams (2–20 developers) using GitHub and AI coding agents |
| Business model          | Subscription tiers plus metered execution usage                                                    |
| Initial source control  | GitHub                                                                                             |
| Initial coding runtimes | Claude Code and OpenAI Codex, subject to supported interfaces and provider terms                   |
| Initial testing runtime | Playwright                                                                                         |
| Document owner          | Product / Founding team                                                                            |
| Status                  | Final consolidated product and technical specification; subject to implementation discovery        |

## How to use this document

This PRD defines the product vision, target users, user journeys, functional requirements, system architecture, data model, integration contracts, security controls, release phases and acceptance criteria. It is intended for the founding CTO, product designer, engineers, QA lead and early design partners.

The document distinguishes launch requirements from later capabilities. Teams should not interpret every future-state capability as a requirement for the first commercial release. Phase gates and acceptance criteria determine what is built and when.

## Important assumptions and constraints

- ForgePilot is an orchestration and engineering operations layer. It does not build its own foundation model, IDE, Git hosting service or cloud provider.
- Integrations must use documented APIs, SDKs, CLI interfaces or other explicitly supported mechanisms. Do not rely on reverse engineering or unsupported IDE internals.
- AI-generated analysis is advisory unless backed by deterministic evidence. Test results, security findings and maintenance recommendations must show their evidence and confidence limitations.
- Code execution must happen in isolated, short-lived environments with least-privilege access. Customer production credentials must not be exposed to general-purpose agents.
- Human approval is required for sensitive operations such as production deployment, destructive database changes, protected-branch merges and privilege escalation.
- The working name ForgePilot requires trademark, domain and company-name clearance before public launch.

# Contents

1. Executive summary and product thesis

2. Market problem, positioning and product strategy

3. Goals, non-goals and success metrics

4. Customers, personas and jobs to be done

5. Product structure and shared platform

6. End-to-end user journeys

7. Feature 1 — ShipSafe

8. Feature 2 — CodeKeeper

9. Feature 3 — DevPilot

10. Cross-product workflows and lifecycle

11. UX and information architecture

12. Technical architecture

13. Data architecture and database model

14. API, webhook and event contracts

15. AI, agent and execution architecture

16. Security, privacy and governance

17. Reliability, observability and operations

18. Pricing and commercial model

19. Go-to-market and validation plan

20. Phased delivery roadmap

21. Engineering epics and acceptance criteria

22. Risks, dependencies and open decisions

Appendices: glossary, sample workflows and launch checklist

# 1. Executive summary and product thesis

## 1.1 Product vision

ForgePilot is an AI Engineering Operations Platform that helps developers coordinate AI coding agents, verify software changes and continuously maintain codebases from one connected workspace.

The platform brings three related capabilities together: DevPilot coordinates development work performed by coding agents; ShipSafe tests and verifies the resulting code; CodeKeeper monitors and maintains the repository after changes are merged. A shared repository intelligence layer and event system connect the three modules.

## 1.2 Product promise

Build smarter. Ship safer. Stay maintained.

A developer connects a repository and supported coding runtime, delegates a task, observes agent execution, receives automated verification, reviews the resulting pull request and keeps the repository healthy through ongoing maintenance workflows.

## 1.3 Product thesis

AI coding tools reduce the cost and time of code generation, but they create additional operational needs: task coordination, code review, test coverage, regression detection, secure execution, dependency maintenance and accountability. ForgePilot focuses on these workflows rather than competing to become another general-purpose code editor.

## 1.4 Product architecture at a glance

```
DEVELOPER / ENGINEERING TEAM             \|             v       FORGEPILOT WORKSPACE             \|   +---------+-----------+   \|         \|           \|   v         v           v DEVPILOT  SHIPSAFE   CODEKEEPER Coordinate Verify    Maintain agents    changes   repositories   \|         \|           \|   +---------+-----------+             \|             v  SHARED ENGINEERING INTELLIGENCE  Repository context • Events • Policies             \|             v GitHub • Coding runtimes • CI • Browser workers LLM providers • Vulnerability feeds • Notifications
```

## 1.5 Product principles

- Integrate, do not replace: work with existing IDEs, source control, coding agents and CI systems.
- Evidence before assertion: show logs, traces, test results, diffs and advisory references behind conclusions.
- Human control by default: automate routine work but gate high-impact actions.
- One project context: share repository understanding across all three modules.
- Modular adoption: customers can start with one feature and activate the others later.
- Transparent economics: expose usage and estimated or provider-reported cost.
- Safe execution: isolate every untrusted code execution and apply least privilege.

# 2. Market problem, positioning and product strategy

## 2.1 Customer problems

| Problem area            | Current friction                                                               | ForgePilot response                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| AI-assisted development | Developers use multiple agents and sessions with limited shared oversight.     | DevPilot task routing, sessions, workspace isolation, logs and cost visibility.     |
| Software quality        | Generated changes may compile but break real user workflows.                   | ShipSafe change-aware tests, browser/API execution, evidence and release checks.    |
| Maintenance             | Dependencies, vulnerabilities, CI failures and documentation drift accumulate. | CodeKeeper continuous scans, prioritisation and verified maintenance pull requests. |
| Fragmented tools        | Work is split across IDE, GitHub, CI, test tools and monitoring.               | Shared project context, linked events and a unified workflow.                       |
| Trust and governance    | Teams cannot easily see what an agent changed or what it was allowed to do.    | Audit trail, permissions, approvals, execution logs and reproducible evidence.      |

## 2.2 Positioning

ForgePilot is the engineering operations layer for teams building software with AI coding agents. It coordinates agent work, verifies code changes and automates ongoing repository maintenance across existing developer tools.

## 2.3 What ForgePilot is not

- Not a new IDE or code editor.
- Not a foundation model or a proprietary coding model.
- Not a replacement for GitHub, GitLab, CI/CD or cloud hosting.
- Not an autonomous production deployment system in the initial releases.
- Not a promise that AI can eliminate software engineers or guarantee defect-free software.

## 2.4 Competitive differentiation hypothesis

| Dimension     | Common tool category             | ForgePilot differentiation hypothesis                                          |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Coding        | AI IDEs and coding agents        | Remain provider-agnostic and manage work across supported agents.              |
| Code review   | AI PR review tools               | Connect review findings to executable tests, fixes and ongoing maintenance.    |
| Testing       | E2E and QA platforms             | Use repository change context and agent feedback loops to target verification. |
| Maintenance   | Dependency and security scanners | Turn findings into controlled, tested maintenance workflows.                   |
| Orchestration | Agent session managers           | Link task execution to test verification and repository lifecycle.             |

This is a positioning hypothesis, not a claim that competitors lack these capabilities. Competitive research and hands-on product teardowns should be refreshed before launch.

## 2.5 Initial wedge

Launch with ShipSafe as the initial acquisition wedge: a GitHub-connected PR verification product for teams using AI coding agents. Add DevPilot as the workflow and orchestration layer, then CodeKeeper as the recurring repository maintenance layer. The architecture should anticipate all three from the beginning, while product scope remains staged.

# 3. Goals and success metrics

## 3.1 Product goals

- Reduce time spent manually validating code changes.
- Increase visibility and control over AI coding-agent work.
- Make routine repository maintenance easier to prioritise and execute.
- Create a repeatable, auditable workflow from task to verified change.
- Deliver value to individual developers before requiring enterprise-scale setup.

## 3.2 Non-goals for initial release

- Supporting every language, framework, source-control provider and coding agent.
- Building a full IDE, terminal replacement or general project-management suite.
- Automatically merging all passing changes.
- Providing a certified security audit or guaranteeing that no vulnerabilities exist.
- Running arbitrary customer code in the main application environment.
- Offering unlimited AI, browser or compute usage.

## 3.3 North Star metric

Verified engineering tasks completed per active paid workspace per month. A verified task is one linked to a defined acceptance outcome and supporting evidence, such as successful tests or an approved maintenance change. The metric must not reward meaningless agent activity.

## 3.4 Initial KPIs

| Metric                    | Definition                                                                        | Initial target / approach                                                     |
| ------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Activation                | Workspace connects a GitHub repository and completes a first successful workflow. | Measure cohort activation; target 60%+ after onboarding improvements.         |
| Time to first value       | Time from signup to first useful test report or completed agent task.             | Aim for under 15 minutes for a guided GitHub demo repository.                 |
| Verification coverage     | Eligible pull requests with a ForgePilot verification run.                        | Establish baseline with design partners; improve by cohort.                   |
| Test usefulness           | Confirmed actionable defects / reported defects.                                  | Track precision and false-positive rate; do not optimise only for test count. |
| Agent task success        | Tasks meeting defined acceptance criteria without unacceptable rework.            | Segment by task type and runtime.                                             |
| Maintenance PR acceptance | Maintenance PRs merged after human review / maintenance PRs created.              | Track by change type and risk.                                                |
| Retention                 | Paid workspaces active in consecutive periods.                                    | Track logo and revenue retention by plan.                                     |
| Gross margin              | Revenue less direct model, browser and compute costs.                             | Target 70%+ over time; validate with actual usage.                            |
| Safety incidents          | Unauthorised or unsafe actions, credential exposure, sandbox escape.              | Target zero; every incident receives postmortem.                              |

All targets are hypotheses. Establish baselines during the design-partner phase and revise them based on observed usage.

# 4. Customers, personas and jobs to be done

| Persona                | Profile                                                                               | Primary job                                                                 | Primary module        |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------- |
| AI-native developer    | Individual or small-team developer using Claude Code, Codex, Cursor or similar tools. | Ship reliable changes without manually coordinating every test and session. | ShipSafe + DevPilot   |
| Engineering lead / CTO | Leads a small engineering team and owns delivery quality.                             | See what agents and developers are doing; control risk and release quality. | All three             |
| Software agency        | Maintains multiple client repositories and delivery pipelines.                        | Standardise verification and recurring maintenance across projects.         | ShipSafe + CodeKeeper |
| Open-source maintainer | Maintains public repositories with contributions from multiple people.                | Verify pull requests and manage dependency/security maintenance.            | ShipSafe + CodeKeeper |
| AI coding power user   | Runs multiple coding agents and parallel tasks.                                       | Coordinate agent work, isolate changes and control spend.                   | DevPilot              |

## 4.1 Jobs to be done

- When a pull request changes application behaviour, I want ForgePilot to run relevant tests and show reproducible evidence so I can decide whether to merge.
- When I delegate work to an AI coding agent, I want to know what it is doing, what it changed and whether it completed the task.
- When a repository has maintenance issues, I want them prioritised and converted into safe, reviewable pull requests.
- When a test fails, I want to create a linked fix task without copying logs and context between tools.
- When I manage several repositories, I want one view of agent activity, verification status and repository health.

## 4.2 Buying roles

Individual developers may buy directly. For team plans, the engineering manager or CTO is usually the buyer, while developers are daily users. Agencies may buy at the organisation level and allocate projects to client workspaces. Enterprise security and procurement requirements are later-stage considerations.

# 5. Product structure and shared platform

## 5.1 Product modules

| Feature                | Primary purpose                                    | Key outputs                                                                                    |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Feature 1 — ShipSafe   | Test, validate and verify software changes.        | Test runs, bug reports, evidence bundles, PR checks and release-readiness status.              |
| Feature 2 — CodeKeeper | Monitor and maintain repository health.            | Dependency inventory, security findings, maintenance tasks, health trends and maintenance PRs. |
| Feature 3 — DevPilot   | Coordinate AI coding agents and engineering tasks. | Agent sessions, task status, workspace records, execution logs, pull requests and usage data.  |

## 5.2 Shared platform capabilities

- Identity, organisations, memberships and role-based permissions.
- Projects and repository connections.
- Repository intelligence and project instructions.
- Integration management and credential vault.
- Background jobs, event bus and workflow orchestration.
- Agent runtime adapters and isolated execution.
- Approvals, policies and audit history.
- Usage metering, subscriptions and billing.
- Notifications, analytics and customer support tooling.

## 5.3 Shared repository intelligence

Repository intelligence is a reusable service that builds a structured, incremental understanding of a connected codebase. It should not attempt to send the entire repository to an LLM for every task.

- Repository metadata: default branch, languages, frameworks, package manifests and CI configuration.
- File and symbol metadata: paths, file types, symbols, imports and references where supported.
- Test discovery: existing suites, test commands, coverage reports and ownership hints.
- Architecture context: README, project instructions, API specifications and selected documentation.
- Change history: commit SHA, PR metadata, previous verification results and maintenance actions.
- Retrieval: exact path/symbol search, dependency traversal, full-text search and optional embeddings.
  Indexing must be incremental and tied to immutable commit SHAs. Respect repository permissions, customer exclusions and data retention settings.

# 6. End-to-end user journeys

## 6.1 Journey A — First-time developer onboarding

- User visits ForgePilot and creates an account using GitHub OAuth or email authentication.
- User creates a personal or team workspace and chooses an initial use case.
- ForgePilot explains the requested GitHub App permissions before redirecting to installation.
- User installs the GitHub App on selected repositories only.
- ForgePilot receives the installation event, validates the connection and lists authorised repositories.
- User selects a repository and creates a project or attaches it to an existing project.
- Repository intelligence performs an initial scan: languages, package manifests, test commands, CI workflows and documentation.
- ForgePilot displays what it discovered and asks the user to confirm test commands and environment configuration.
- User runs a first test or repository health scan.
- Dashboard shows the first result, evidence and recommended next action.

## 6.2 Journey B — ShipSafe: verify a pull request

- Developer opens or updates a pull request in GitHub.
- GitHub sends a signed webhook to ForgePilot.
- Webhook receiver validates the signature, stores the event and acknowledges it quickly.
- Change analysis compares the PR head commit with its base commit and identifies changed files and likely impacted components.
- Test planner selects existing relevant tests and proposes additional tests where useful.
- Execution manager creates an isolated test environment pinned to the exact commit SHA.
- Playwright and API test workers execute the configured test plan.
- Evidence collector stores traces, screenshots, console logs, network errors and structured results.
- Result processor classifies each failure as product failure, test failure, environment failure, flaky test or infrastructure failure.
- ForgePilot publishes a GitHub Check Run and an optional concise PR comment.
- If configured, a developer can send an actionable failure to DevPilot as a fix task.
- After the fix is pushed, ShipSafe reruns the relevant tests and records the new verification result.
- A human reviewer makes the merge decision according to repository policy.

## 6.3 Journey C — CodeKeeper: detect and resolve maintenance work

- User connects a repository and enables scheduled or event-triggered scans.
- CodeKeeper inventories package manifests, lockfiles, CI configuration and selected source metadata.
- Dependency and vulnerability services compare discovered packages against trusted advisory sources.
- Build monitoring checks supported CI results and identifies recurring failures.
- Documentation and technical-debt checks identify configured classes of maintenance issues.
- Findings are normalised, deduplicated and assigned severity, confidence and evidence.
- User reviews the maintenance queue and chooses an issue.
- CodeKeeper creates a maintenance task and asks DevPilot to execute it in an isolated workspace.
- The agent updates code or dependencies and runs relevant checks.
- A maintenance pull request is created with the rationale, evidence and rollback considerations.
- ShipSafe verifies the pull request using the configured test plan.
- A human reviews and merges the change.
- CodeKeeper updates the repository health history and closes or refreshes the finding.

## 6.4 Journey D — DevPilot: delegate work to an AI coding agent

- Developer creates a task manually or imports an issue from GitHub or a supported project-management integration.
- Task includes title, description, repository, branch, acceptance criteria, priority and constraints.
- DevPilot validates permissions, repository access, available runtime and usage budget.
- Agent router recommends a supported runtime based on task type and configured policy; user can override.
- Workspace manager creates an isolated worktree or container, checks out the correct commit and prepares dependencies.
- Agent adapter starts the selected coding runtime using documented interfaces.
- DevPilot records status changes and streams structured logs to the session view.
- If the agent requests a sensitive permission or encounters an unresolved ambiguity, it pauses and requests human input.
- Agent completes the task and returns changed files, summary, test results and execution metadata.
- DevPilot validates the output, creates a branch and pull request where authorised.
- ShipSafe is triggered to verify the change.
- The task becomes review-ready only when the defined completion conditions are met; human review remains authoritative.

## 6.5 Journey E — Closed-loop fix workflow

```
PR updated    \|    v ShipSafe runs targeted tests    \|    +---- PASS ----> publish evidence ----> human review    \|    +---- FAIL ----> create linked defect                          \|                          v                    DevPilot task                          \|                          v                  isolated agent fix                          \|                          v                     new commit                          \|                          v                   ShipSafe retest                          \|                  +-------+-------+                  \|               \|                 PASS            FAIL                  \|               \|            human review     retry / human                             investigation
```

## 6.6 Journey F — Team administrator and governance

- Workspace administrator invites members and assigns roles.
- Administrator installs or restricts repository integrations.
- Administrator configures allowed agent providers, execution budgets and network policies.
- Administrator defines approval rules for protected branches, secrets, migrations and deployments.
- Audit log records user actions, agent actions, approvals and integration changes.
- Usage dashboard shows cost by workspace, project, provider and execution type.
- Administrator can revoke a provider connection, rotate credentials or suspend an agent.

# 7. Feature 1 — ShipSafe: AI testing, quality assurance and verification

## 7.1 Product objective

ShipSafe helps developers determine whether a code change behaves as expected by running targeted, reproducible tests and presenting evidence in the pull request workflow.

## 7.2 Scope

| Release | Included capabilities                                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP     | GitHub PR trigger, change detection, configured Playwright tests, basic API checks, evidence capture, test report, GitHub Check Run.                |
| V1      | Change-aware test selection, test generation proposals, flaky-test classification, bug report creation, DevPilot fix-task handoff.                  |
| Later   | Visual regression, expanded browser matrix, advanced API contract tests, mobile testing, richer root-cause analysis and policy-based release gates. |

## 7.3 Functional requirements

| ID     | Requirement             | Description                                                                                                            | Priority |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| SS-001 | Repository connection   | Use an authorised GitHub App installation and repository selection.                                                    | P0       |
| SS-002 | PR event ingestion      | Receive opened, synchronize, reopened and relevant check events; verify webhook signatures and deduplicate deliveries. | P0       |
| SS-003 | Commit-pinned execution | Every test run must identify the exact repository, base SHA, head SHA and environment.                                 | P0       |
| SS-004 | Change analysis         | Identify changed files and basic language/path categories; map to configured test suites.                              | P0       |
| SS-005 | Test configuration      | Allow users to define test commands, environment variables by reference, timeouts and test environments.               | P0       |
| SS-006 | Browser execution       | Run configured Playwright tests in isolated workers and capture structured outcomes.                                   | P0       |
| SS-007 | API checks              | Support configured HTTP requests and assertions; add OpenAPI-driven checks in V1.                                      | P1       |
| SS-008 | Evidence capture        | Store test output, screenshots, browser traces, console errors and relevant network failures.                          | P0       |
| SS-009 | Failure classification  | Distinguish application assertion failures from infrastructure, environment and flaky-test failures.                   | P1       |
| SS-010 | GitHub reporting        | Publish a Check Run and concise PR summary with links to detailed results.                                             | P0       |
| SS-011 | Bug reports             | Create structured bug records with reproduction steps and evidence references.                                         | P1       |
| SS-012 | Fix handoff             | Allow a user to create a DevPilot task from a failure, preserving commit, logs and context.                            | P1       |
| SS-013 | Test history            | Show prior runs and compare results by commit and branch.                                                              | P1       |
| SS-014 | Release policies        | Allow teams to configure required checks and severity thresholds; human merge policy remains in GitHub.                | P1       |
| SS-015 | Test generation         | Suggest tests from changed code and acceptance criteria; require review before adding to a permanent suite.            | P1       |

## 7.4 ShipSafe workflow detail

### Step 1 — Trigger and validation

A GitHub webhook arrives. The receiver verifies HMAC signature, checks delivery ID for idempotency, stores the event and enqueues a job. The worker fetches PR metadata using installation-scoped credentials.

### Step 2 — Change impact analysis

Compare base and head commit. Identify changed files, language, test ownership hints and dependency/configuration changes. For MVP, use path rules and repository configuration; progressively add symbol-level dependency analysis.

### Step 3 — Test planning

Select configured suites based on change rules. AI may recommend additional cases, but the initial plan must be deterministic and reviewable. Test selection records why each suite was selected.

### Step 4 — Isolated execution

Create a short-lived worker with resource limits. Fetch the exact commit, install dependencies using lockfiles, inject only test-scoped secrets and execute approved commands. Do not expose production secrets or allow unrestricted network access.

### Step 5 — Evidence and result processing

Collect JUnit or equivalent structured results, logs, screenshots, traces and environment metadata. Classify infrastructure failures separately from product failures. Link every result to a test run and commit SHA.

### Step 6 — Feedback and remediation

Publish a GitHub Check Run and detailed ForgePilot report. The user can create a DevPilot task from a failure. Any proposed code fix must occur in a separate isolated workspace and produce a reviewable PR.

## 7.5 ShipSafe key screens

- Testing overview: pass/fail trends, active repositories, recent runs and open defects.
- Test suite manager: suites, commands, environments, ownership and execution policies.
- Pull request verification: changed files, selected tests, results, evidence and release policy.
- Bug detail: severity, reproduction steps, commit, stack trace, screenshots and suspected cause.
- Visual comparison: baseline and candidate screenshots with explicit baseline approval.
- Test run detail: environment, duration, worker logs, retries and classification.

## 7.6 ShipSafe acceptance criteria

- A connected repository can trigger a test run from a PR event.
- The test run is pinned to the exact head commit SHA.
- A deliberately failing test is reported as failed with logs and a link to evidence.
- An infrastructure failure is not incorrectly reported as a confirmed product defect.
- GitHub receives a Check Run with a stable conclusion and details URL.
- A user can create a DevPilot fix task linked to the failing test and original PR.
- A retest after a new commit is recorded as a separate run and is comparable to the previous run.

# 8. Feature 2 — CodeKeeper: autonomous maintenance and repository health

## 8.1 Product objective

CodeKeeper continuously identifies maintainability and dependency risks, prioritises findings and helps developers resolve them through controlled, tested pull requests.

## 8.2 Scope

| Release | Included capabilities                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP     | Dependency inventory for selected ecosystems, vulnerability feed matching, scheduled scans, findings list and manual maintenance task creation. |
| V1      | AI-assisted maintenance plan, isolated fix execution through DevPilot, maintenance PR creation and ShipSafe verification.                       |
| Later   | Build trend analysis, documentation drift, technical debt heuristics, broader package ecosystems and configurable maintenance policies.         |

## 8.3 Functional requirements

| ID     | Requirement           | Description                                                                                            | Priority |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| CK-001 | Repository inventory  | Discover package manifests, lockfiles, CI configuration and supported metadata.                        | P0       |
| CK-002 | Dependency inventory  | Record package name, ecosystem, installed version and direct/transitive status where available.        | P0       |
| CK-003 | Advisory matching     | Match packages against trusted vulnerability sources and preserve advisory references and timestamps.  | P0       |
| CK-004 | Scheduled scanning    | Allow workspace administrators to configure scan frequency and quiet hours.                            | P0       |
| CK-005 | Finding normalisation | Deduplicate findings and record evidence, affected version, fixed version if known and confidence.     | P0       |
| CK-006 | Prioritisation        | Rank findings using severity, exploitability information where available, exposure and project policy. | P1       |
| CK-007 | Maintenance tasks     | Create tasks from findings and link them to repository, package and source advisory.                   | P0       |
| CK-008 | Fix proposal          | Use DevPilot to create an isolated maintenance branch and propose a change.                            | P1       |
| CK-009 | Verification          | Trigger ShipSafe or configured CI checks before a maintenance PR is marked ready for review.           | P1       |
| CK-010 | Health history        | Track scan results and score changes over time with explainable components.                            | P1       |
| CK-011 | Ignore and suppress   | Allow authorised users to suppress findings with reason and expiry where appropriate.                  | P1       |
| CK-012 | Audit trail           | Record scans, actions, agent runs, PRs, approvals and status changes.                                  | P0       |
| CK-013 | Documentation checks  | Identify selected stale or missing documentation patterns; suggestions only in V1.                     | P2       |
| CK-014 | Technical debt checks | Integrate deterministic linters/static analysis before introducing AI-based heuristics.                | P2       |

## 8.4 CodeKeeper workflow detail

- A scheduled job or repository event triggers a scan.
- Scanner reads manifests and lockfiles from an authorised commit.
- Dependency inventory normalises ecosystem-specific package identifiers.
- Advisory connector queries or syncs trusted vulnerability data.
- Findings are deduplicated and linked to the commit and package version.
- Prioritisation engine calculates a transparent risk band using advisory severity and configured context.
- User reviews the finding and chooses to dismiss, defer or create a maintenance task.
- DevPilot executes an approved task in an isolated workspace.
- The agent updates the package or source code and runs appropriate checks.
- A pull request is created with source advisory, rationale, changed files and test evidence.
- ShipSafe runs relevant verification; human reviewer decides whether to merge.
- CodeKeeper refreshes the inventory and closes or updates the finding after the repository changes.

## 8.5 Repository health score

A health score is a product summary, not a security certification. It must be explainable, versioned and configurable. Show the component values and underlying findings.

| Dimension             | Illustrative weight | Example evidence                                                             |
| --------------------- | ------------------- | ---------------------------------------------------------------------------- |
| Dependency health     | 20%                 | Outdated packages, unsupported versions and update backlog.                  |
| Security posture      | 25%                 | Known advisories and exposed dependency versions; not a full security audit. |
| Build stability       | 20%                 | Recent CI outcomes and recurring failures.                                   |
| Test reliability      | 20%                 | Test pass history, flaky rate and configured coverage signals.               |
| Documentation quality | 15%                 | Presence and freshness checks for selected documentation.                    |

Do not compare scores across repositories without explaining differences in language, project type, scan coverage and configuration. Missing data must be displayed as unknown rather than silently treated as healthy.

## 8.6 CodeKeeper acceptance criteria

- A scan records the repository commit SHA and scan configuration.
- Dependency inventory is generated for supported ecosystems.
- A known test advisory can be matched and linked to its authoritative source.
- Findings are deduplicated across repeated scans.
- A user can create a maintenance task from a finding.
- A maintenance task can launch a DevPilot execution only after policy validation.
- A proposed maintenance PR is verified before being marked ready for human review.
- The health history explains which findings changed the score.

# 9. Feature 3 — DevPilot: AI coding-agent orchestration

## 9.1 Product objective

DevPilot is the command centre for creating engineering tasks, assigning them to supported coding-agent runtimes, monitoring isolated execution and producing reviewable changes.

## 9.2 Scope

| Release | Included capabilities                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| MVP     | Task creation, one supported coding runtime, isolated workspace, status/logs, cancellation and result summary.              |
| V1      | Second runtime adapter, GitHub issue import, PR creation, budgets, approvals and ShipSafe handoff.                          |
| Later   | Parallel task graphs, advanced agent routing, conflict analysis, more providers, team analytics and richer policy controls. |

## 9.3 Functional requirements

| ID     | Requirement           | Description                                                                                                     | Priority |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| DP-001 | Task creation         | Create tasks with repository, base commit, branch, instructions, acceptance criteria, priority and constraints. | P0       |
| DP-002 | Runtime adapters      | Integrate only through documented provider APIs, SDKs or supported CLI execution models.                        | P0       |
| DP-003 | Workspace isolation   | Create a unique isolated worktree/container for each execution with resource and time limits.                   | P0       |
| DP-004 | Session lifecycle     | Persist valid state transitions from queued to running, waiting, completed, failed or cancelled.                | P0       |
| DP-005 | Log streaming         | Stream structured logs and redact secrets before persistence or display.                                        | P0       |
| DP-006 | Human input           | Pause execution for clarification or permission approval when supported by the runtime.                         | P1       |
| DP-007 | Result collection     | Collect summary, changed files, commit, tests, usage metadata and runtime status.                               | P0       |
| DP-008 | Pull request creation | Create a branch and PR using installation-scoped credentials when authorised.                                   | P1       |
| DP-009 | Budget controls       | Set execution timeout and budget ceiling; stop or pause when limits are reached.                                | P1       |
| DP-010 | Task imports          | Import issues from GitHub initially; additional integrations later.                                             | P1       |
| DP-011 | Agent routing         | Recommend a runtime based on supported capabilities and policy; do not claim unsupported performance rankings.  | P2       |
| DP-012 | Parallel execution    | Support independent tasks in separate workspaces; enforce dependency and conflict policies.                     | P2       |
| DP-013 | Agent analytics       | Track completion, failure, runtime, cost and rework by task category.                                           | P1       |
| DP-014 | Audit and permissions | Record agent actions and enforce least-privilege access for each execution.                                     | P0       |

## 9.4 DevPilot workflow detail

### Step 1 — Task specification

Task form captures a clear goal, repository, base SHA, target branch, acceptance criteria, constraints and expected outputs. Vague tasks should be flagged for clarification.

### Step 2 — Policy and runtime validation

Validate organisation policy, provider connection, available quota, repository permission and requested tool access. Show the user what the agent will be allowed to do.

### Step 3 — Workspace creation

Create a unique isolated workspace, clone or fetch the repository, checkout the base commit and prepare a branch. Use ephemeral credentials and do not mount unrelated repositories.

### Step 4 — Agent execution

The provider adapter starts the supported runtime. DevPilot records state transitions, structured tool events, output and usage metadata. Long-running work is handled asynchronously.

### Step 5 — Review and result

Collect changed files, diff, summary, tests and execution metadata. Validate that the output is within the assigned repository and branch. Create a PR only when authorised.

### Step 6 — ShipSafe handoff

If configured, a PR event triggers ShipSafe. Failed verification creates a linked task with evidence. The original task remains traceable through the full loop.

## 9.5 Agent workspace model

- One workspace per execution by default.
- Immutable base commit reference.
- Dedicated branch or worktree.
- CPU, memory, disk and wall-clock limits.
- Restricted network access with allowlists where practical.
- Short-lived, scoped credentials.
- No production secrets by default.
- Workspace cleanup and retention policy after completion.
- Explicit user action to preserve diagnostic artifacts where supported.

## 9.6 Agent analytics

Track task success, execution duration, provider-reported or estimated cost, retries, human interventions, PR acceptance and rework. Segment results by task type and complexity; do not rank providers from raw success rates without controlling for task mix.

## 9.7 DevPilot acceptance criteria

- A user can create a task with explicit acceptance criteria.
- A supported runtime can execute in an isolated workspace.
- The session page shows valid status transitions and logs.
- A user can cancel an active session and the worker is terminated within the defined timeout.
- Secrets are redacted from logs and not exposed to other tenants.
- The result includes changed files and a reproducible commit reference.
- A PR is created only with the configured permission and policy.
- A task can trigger ShipSafe and retain links to the test run.

# 10. Cross-product workflows and lifecycle

## 10.1 Unified software lifecycle

```
1. PLAN    Developer creates a task in DevPilot.        \| 2. EXECUTE    DevPilot allocates a workspace and starts an agent.        \| 3. PROPOSE    Agent returns changes and creates a pull request.        \| 4. VERIFY    ShipSafe analyses the diff and runs relevant checks.        \| 5. REMEDIATE    If a check fails, create a linked DevPilot fix task.        \| 6. REVIEW    Human reviews diff, evidence and policy checks.        \| 7. MERGE    GitHub remains the source of truth for merge state.        \| 8. MAINTAIN    CodeKeeper scans the updated repository over time.        \| 9. IMPROVE    Maintenance findings become controlled DevPilot tasks    and are verified again by ShipSafe.
```

## 10.2 Cross-feature event rules

| Event                     | Action                                               | Guardrail                                                          |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| agent.completed           | Create or update PR and optionally trigger ShipSafe. | Only for authorised task and repository.                           |
| test.failed               | Create linked defect and offer DevPilot fix task.    | Do not auto-loop indefinitely; cap retries and require escalation. |
| test.passed               | Update verification status and notify reviewers.     | Passing checks do not automatically merge.                         |
| maintenance.detected      | Create CodeKeeper finding and optional task.         | Deduplicate and preserve advisory evidence.                        |
| maintenance.fix_requested | Start DevPilot execution.                            | Require policy and budget validation.                              |
| maintenance.pr_created    | Trigger ShipSafe verification.                       | Pin to exact PR head SHA.                                          |
| approval.requested        | Notify authorised approvers.                         | Approval must be bound to exact action and context.                |
| budget.exceeded           | Pause or stop execution.                             | Do not continue incurring unbounded provider or compute cost.      |

## 10.3 Workflow retry and loop protection

- Every automated workflow has a maximum retry count and overall deadline.
- A failed fix must not recursively create unlimited fix tasks.
- Use idempotency keys for webhook and job processing.
- Detect repeated failure signatures and escalate to human investigation.
- Preserve parent-child relationships among original task, fix task, agent session, PR and test run.

# 11. UX and information architecture

## 11.1 Primary navigation

```
Workspace selector Overview Projects DevPilot   - Agent command centre   - Tasks   - Sessions   - Workspaces ShipSafe   - Testing dashboard   - Test suites   - Pull request verification   - Bugs CodeKeeper   - Repository health   - Dependencies   - Security findings   - Maintenance tasks Tasks Pull requests Approvals Analytics Integrations Settings
```

## 11.2 Key screens

| Screen                  | Purpose                                   | Primary actions                                      |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Onboarding              | Create workspace and connect GitHub.      | Install app, select repository, run first scan.      |
| Overview dashboard      | Unified engineering status.               | Open active agent, failed test, maintenance finding. |
| Project overview        | Context for one product/repository group. | View repo, agent, tests and maintenance.             |
| DevPilot command centre | Monitor agent work.                       | Create task, pause/cancel, inspect session.          |
| Agent session detail    | Understand execution.                     | Review logs, changed files, approvals and cost.      |
| ShipSafe PR detail      | Verify a code change.                     | Inspect test plan, evidence and failures.            |
| Bug detail              | Investigate a failure.                    | Reproduce, create fix task, mark status.             |
| CodeKeeper health       | Understand repository maintenance.        | Scan, prioritise, create maintenance task.           |
| Approval centre         | Control sensitive operations.             | Approve, reject or request changes.                  |
| Usage and billing       | Understand consumption and plan.          | Set budgets, upgrade, export usage.                  |

## 11.3 Interaction requirements

- Use a global command palette (Cmd/Ctrl+K) for navigation and common actions.
- Show loading, empty, error, permission-denied and partial-result states for every major screen.
- Every status badge must have a clear definition and a path to supporting evidence.
- Long-running operations must be asynchronous and show progress without blocking the application.
- Support keyboard navigation and accessible contrast; target WCAG 2.2 AA for core workflows.
- Desktop-first responsive design; mobile may support monitoring and approvals before full configuration.

## 11.4 Design system

| Element      | Recommendation                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Visual style | Minimal, technical, high-clarity developer workspace.                                           |
| Typography   | Geist or Inter; consistent hierarchy and readable code/log typography.                          |
| Colour       | Neutral graphite/light surfaces with restrained accent; semantic green, amber and red.          |
| Components   | Tables, filters, command palette, diff viewer, log viewer, status badges, timeline, side panel. |
| Themes       | Dark and light modes.                                                                           |
| Motion       | Subtle transitions only; no animation that obscures status or slows navigation.                 |

# 12. Technical architecture

## 12.1 Architecture strategy

Use a modular monolith for the control plane and separate isolated worker services for execution-heavy or untrusted workloads. This balances speed for a small team with clear domain boundaries. Extract services only when scaling, security isolation or independent deployment makes it necessary.

## 12.2 Logical architecture

```
WEB CLIENT                        Next.js / React                               \|                               v                     API / CONTROL PLANE                   Auth • Projects • Policies                   Tasks • Billing • Integrations                               \|                 +-------------+-------------+                 \|             \|             \|                 v             v             v              SHIPSAFE      CODEKEEPER     DEVPILOT              Domain         Domain         Domain                 \|             \|             \|                 +-------------+-------------+                               \|                     EVENT / WORKFLOW LAYER                   Durable jobs • retries • outbox                               \|                 +-------------+-------------+                 \|             \|             \|                 v             v             v            TEST WORKERS   SCAN WORKERS   AGENT WORKERS            Playwright     Dependency     Isolated coding            API tests      advisory       runtime/container                 \|             \|             \|                 +-------------+-------------+                               \|                      SHARED DATA SERVICES               PostgreSQL • Redis • Object storage               Secrets vault • Logs • Metrics                               \|                      EXTERNAL INTEGRATIONS                GitHub • Agent providers • CI/CD               Advisory feeds • Email/Slack later
```

## 12.3 Recommended technology stack

| Layer                          | Initial recommendation                                                      | Notes                                                                               |
| ------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Web application                | Next.js + React + TypeScript                                                | Dashboard, configuration and session views.                                         |
| UI system                      | Tailwind CSS + accessible component library                                 | Use a consistent design system.                                                     |
| Control-plane API              | Node.js + TypeScript                                                        | REST API initially; WebSocket/SSE for live updates.                                 |
| Database                       | Managed PostgreSQL                                                          | Tenant-aware relational source of truth.                                            |
| ORM / migrations               | Drizzle or Prisma                                                           | Choose one; enforce reviewed migrations.                                            |
| Cache / ephemeral coordination | Redis                                                                       | Caching, rate limits and short-lived coordination.                                  |
| Job/workflow engine            | Trigger.dev initially or Temporal when workflow durability needs justify it | Do not operate two overlapping workflow engines without clear boundaries.           |
| Browser tests                  | Playwright                                                                  | Run in isolated workers.                                                            |
| Code analysis                  | Tree-sitter and language-specific parsers                                   | Incremental parsing and symbol extraction.                                          |
| Agent runtime                  | Provider-specific supported SDK/CLI adapters                                | Keep provider adapters isolated.                                                    |
| Object storage                 | S3-compatible storage                                                       | Screenshots, traces, reports and artifacts.                                         |
| Observability                  | OpenTelemetry + Sentry                                                      | Traces, metrics and errors.                                                         |
| Product analytics              | PostHog or equivalent                                                       | Product usage and funnel analytics.                                                 |
| Billing                        | Stripe                                                                      | Subscriptions, metering and invoices; validate regional availability and tax needs. |
| Infrastructure                 | Managed cloud services and container workers                                | Avoid building a custom cloud platform in MVP.                                      |

## 12.4 Control plane vs execution plane

Control plane stores configuration, identity, policies, tasks, metadata and execution state. Execution plane runs customer code, tests and coding agents in isolated workers. The control plane should never execute arbitrary repository code.

## 12.5 Module boundaries

| Domain                  | Owns                                                                      | Does not own                             |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| Identity & organisation | Users, memberships, roles, tenant policy.                                 | Repository code or agent execution.      |
| Project & repository    | Project metadata, GitHub connection references, repository snapshots.     | Provider-specific model logic.           |
| ShipSafe                | Test plans, suites, runs, results, bugs and evidence references.          | General coding-agent lifecycle.          |
| CodeKeeper              | Scans, dependencies, advisories, maintenance findings and health history. | GitHub's canonical merge state.          |
| DevPilot                | Tasks, agent configs, sessions, workspaces and execution records.         | LLM model internals.                     |
| Integration service     | Provider credentials, webhook verification and adapters.                  | Business decisions about test pass/fail. |
| Usage & billing         | Usage events, entitlements, invoices and quotas.                          | Provider execution itself.               |

# 13. Data architecture and database model

## 13.1 Core entities

| Entity               | Key fields / relationship                         | Purpose                                                            |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| users                | id, email, profile                                | Human identity.                                                    |
| organisations        | id, name, plan                                    | Tenant boundary.                                                   |
| memberships          | organisation_id, user_id, role                    | Organisation access.                                               |
| projects             | organisation_id, name, settings                   | Logical product/project grouping.                                  |
| repositories         | project_id, provider, external_id, default_branch | Connected source repositories.                                     |
| integrations         | organisation_id, provider, credential_ref, status | External connections; secrets stored in vault.                     |
| repository_snapshots | repository_id, commit_sha, indexed_at             | Versioned repository intelligence snapshot.                        |
| repository_files     | snapshot_id, path, language, metadata             | Indexed file metadata; avoid storing full source unless necessary. |
| tasks                | project_id, repository_id, status, criteria       | Engineering work item.                                             |
| agents               | organisation_id, provider, configuration          | Configured coding runtime.                                         |
| agent_sessions       | task_id, agent_id, status, workspace_id           | One execution instance.                                            |
| agent_events         | session_id, event_type, payload_ref               | Execution activity and logs.                                       |
| workspaces           | session_id, runtime, state, cleanup_at            | Isolated execution environment.                                    |
| pull_requests        | repository_id, external_pr_id, head_sha, base_sha | PR metadata and links.                                             |
| test_suites          | repository_id, type, configuration                | Reusable test configuration.                                       |
| test_runs            | repository_id, commit_sha, status, environment_id | Test execution record.                                             |
| test_results         | test_run_id, test_case, outcome, evidence_ref     | Individual test outcomes.                                          |
| bugs                 | test_run_id, severity, evidence_ref, status       | Actionable defect record.                                          |
| dependencies         | repository_id, ecosystem, package, version        | Inventory.                                                         |
| vulnerabilities      | dependency_id, advisory_id, severity, source_url  | Advisory findings.                                                 |
| maintenance_runs     | repository_id, commit_sha, status                 | CodeKeeper scan/execution.                                         |
| maintenance_issues   | maintenance_run_id, category, evidence            | Maintenance finding.                                               |
| approvals            | requested_action, requester, approver, status     | Human approval record.                                             |
| usage_records        | organisation_id, provider, units, cost            | Metered usage.                                                     |
| audit_logs           | actor, action, resource, timestamp                | Security and compliance trail.                                     |

## 13.2 Tenant isolation

- Every tenant-owned record must include organisation_id directly or through an enforceable parent relationship.
- Use database row-level security where appropriate and test it with cross-tenant access cases.
- All service queries must enforce tenant context; do not rely only on frontend filtering.
- Use separate storage prefixes/buckets or scoped access policies for tenant artifacts.
- Secrets must be stored in a dedicated secrets manager or encrypted vault; database stores only references and metadata.
- Audit sensitive reads and writes where practical.

## 13.3 Data retention

Define retention separately for repository metadata, agent prompts and outputs, execution logs, browser screenshots, test traces, usage records and audit logs. Offer configurable retention for customer artifacts. Retain billing and security audit records as required by law and contract. Deletion workflows must remove or cryptographically render inaccessible customer artifacts, subject to legal retention requirements.

## 13.4 Data consistency

Use immutable identifiers for execution records and commit SHAs. Use foreign keys and unique constraints for provider event IDs. Use an outbox pattern to atomically persist domain state and events. Make background jobs idempotent and safe to retry.

# 14. API, webhook and event contracts

## 14.1 API principles

- Versioned REST API under /api/v1 for initial release.
- Consistent error envelope with machine-readable code, message and request_id.
- Cursor pagination for event and history endpoints.
- Idempotency keys for create/execute operations that may be retried.
- Authentication via secure session or scoped API token.
- Rate limits by user, organisation and resource class.
- OpenAPI specification generated and reviewed with each release.

## 14.2 Representative endpoint catalogue

| Method | Endpoint                                    | Purpose                         |
| ------ | ------------------------------------------- | ------------------------------- |
| POST   | /api/v1/projects                            | Create project.                 |
| GET    | /api/v1/projects                            | List projects.                  |
| POST   | /api/v1/repositories/connect                | Connect repository.             |
| POST   | /api/v1/repositories/{id}/scan              | Start repository indexing/scan. |
| POST   | /api/v1/tasks                               | Create engineering task.        |
| POST   | /api/v1/tasks/{id}/assign                   | Assign task to agent.           |
| GET    | /api/v1/agents/sessions/{id}                | Get session status.             |
| POST   | /api/v1/agents/sessions/{id}/cancel         | Cancel execution.               |
| POST   | /api/v1/shipsafe/test-runs                  | Start test run.                 |
| GET    | /api/v1/shipsafe/test-runs/{id}             | Get test run and results.       |
| POST   | /api/v1/codekeeper/scans                    | Start maintenance scan.         |
| GET    | /api/v1/codekeeper/repositories/{id}/health | Get health summary.             |
| GET    | /api/v1/approvals                           | List pending approvals.         |
| POST   | /api/v1/approvals/{id}/decision             | Approve or reject action.       |

## 14.3 Example task contract

```
POST /api/v1/tasks {   "project_id": "uuid",   "repository_id": "uuid",   "title": "Add password reset flow",   "description": "Implement password reset API and UI.",   "base_commit_sha": "full_commit_sha",   "task_type": "feature",   "priority": "normal",   "acceptance_criteria": [     "Reset request can be submitted",     "Token expires after configured period",     "Tests cover success and invalid token"   ],   "constraints": {     "allowed_paths": ["src/auth/**", "tests/auth/**"],     "protected_paths": ["infra/production/**"],     "network_profile": "restricted"   } }
```

## 14.4 GitHub webhook handling

- Verify X-Hub-Signature-256 using the app webhook secret.
- Validate delivery ID and event type.
- Persist raw event metadata and delivery ID before acknowledging.
- Return quickly; process asynchronously.
- Deduplicate retries using provider delivery ID.
- Handle out-of-order events by fetching current canonical PR state when needed.
- Never treat webhook payload as sufficient authority for a merge or deployment decision.

## 14.5 Internal event catalogue

| Event                        | Producer                | Consumers                             |
| ---------------------------- | ----------------------- | ------------------------------------- |
| repository.connected         | Integration service     | Repository intelligence, onboarding   |
| repository.snapshot.ready    | Repository intelligence | ShipSafe, CodeKeeper, DevPilot        |
| task.created                 | DevPilot                | Workflow engine, notifications        |
| agent.session.started        | DevPilot                | Activity feed, analytics              |
| agent.session.completed      | Execution plane         | DevPilot, PR service, ShipSafe        |
| pull_request.updated         | GitHub integration      | ShipSafe, repository intelligence     |
| test.run.completed           | ShipSafe                | PR reporting, DevPilot, notifications |
| bug.detected                 | ShipSafe                | Task service, DevPilot                |
| maintenance.finding.detected | CodeKeeper              | Task service, notifications           |
| approval.requested           | Any domain              | Approval centre, notifications        |
| usage.recorded               | Execution plane         | Usage service, billing                |

Events should include event_id, event_type, schema_version, occurred_at, organisation_id, project_id, resource_id and correlation_id. Sensitive payloads should be referenced through access-controlled artifact storage rather than copied into broad event streams.

# 15. AI, agent and execution architecture

## 15.1 Provider abstraction

Create a provider adapter interface for coding runtimes and model APIs. Each adapter declares capabilities such as task start, session status, log streaming, cancellation, tool permissions, usage reporting and artifact retrieval. Capability discovery must be explicit; do not assume all providers support the same features.

## 15.2 Agent execution lifecycle

```
QUEUED   \|   v VALIDATING   \|   v WORKSPACE_INITIALISING   \|   v RUNNING <------+   \|            \|   +--> WAITING_FOR_INPUT   \|   +--> WAITING_FOR_APPROVAL   \|   v COLLECTING_RESULT   \|   +--> COMPLETED   +--> FAILED   +--> CANCELLED   +--> TIMED_OUT
```

## 15.3 Context assembly

Before execution, assemble only the context required for the task: task description, acceptance criteria, repository instructions, relevant files/symbols, related tests, branch/commit context and approved tool permissions. Apply token and context budgets. Record the context manifest for reproducibility, while respecting customer retention and privacy settings.

## 15.4 Tool and permission policy

- Tools are allowlisted per task and organisation.
- Read, write, network and secret access are separate permissions.
- Sensitive operations require explicit approval and an auditable approval token.
- Agent output is untrusted input; validate file paths, commands and generated metadata.
- Prevent path traversal and writes outside the workspace.
- Limit subprocesses, CPU, memory, disk, runtime and network.
- Use ephemeral credentials with minimum scope and short lifetime.
- Redact secrets from logs, traces, model inputs and UI.

## 15.5 Model routing

Initially allow users to configure a provider/runtime rather than promising autonomous best-model selection. Later, a routing layer can recommend a runtime using task type, capability support, cost limits and historical outcomes. Recommendations must be explainable and users must be able to override them.

## 15.6 Cost controls

- Set per-session time and spend ceilings where provider data permits.
- Record token usage and provider cost only when returned by the provider; otherwise label calculated figures as estimates.
- Track browser minutes, container runtime and storage separately from model cost.
- Warn before a task exceeds configured thresholds.
- Pause or terminate work when hard budgets are reached.
- Provide cost attribution by organisation, project, repository, task and provider.

# 16. Security, privacy and governance

## 16.1 Security objectives

- Protect customer source code, credentials, logs and artifacts.
- Prevent cross-tenant access.
- Contain untrusted code and agent execution.
- Ensure every sensitive action is authorised and auditable.
- Minimise data collection and retention.
- Provide transparent permissions and revocation.

## 16.2 Threat model

| Threat                           | Example                                                    | Required mitigation                                                                   |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Malicious repository code        | Install script attempts to exfiltrate environment secrets. | Sandbox, no production secrets, network egress restrictions, short-lived credentials. |
| Prompt injection in repo content | README or code comments instruct agent to reveal secrets.  | Treat repository content as untrusted; tool permissions enforced outside the model.   |
| Cross-tenant data leak           | User accesses another organisation's test artifacts.       | Tenant-scoped queries, RLS, storage ACLs and automated isolation tests.               |
| Credential compromise            | GitHub token appears in logs.                              | Vault storage, scoped tokens, log redaction and rotation.                             |
| Webhook spoofing                 | Attacker sends fake PR event.                              | Signature validation, replay protection and delivery deduplication.                   |
| Agent runaway                    | Agent loops or consumes unbounded credits.                 | Timeouts, budgets, retry caps and cancellation.                                       |
| Unsafe auto-remediation          | Agent changes production configuration.                    | Protected paths, approvals, isolated PRs and no automatic production deployment.      |
| Supply-chain compromise          | Malicious package in test environment.                     | Lockfile integrity, dependency controls, isolated workers and scanning.               |

## 16.3 Permissions model

| Action                             | Default policy                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Read selected repository           | Allowed after explicit GitHub installation and repository selection.            |
| Run tests in isolated environment  | Allowed within configured policy.                                               |
| Create branch                      | Allowed if GitHub permissions permit.                                           |
| Create pull request                | Allowed if enabled by workspace policy.                                         |
| Modify protected paths             | Approval required or prohibited.                                                |
| Access customer secrets            | Explicit, scoped approval; avoid by default.                                    |
| Run destructive database migration | Approval required; use non-production environment.                              |
| Merge protected branch             | Human approval / GitHub branch protection.                                      |
| Deploy production                  | Out of scope for initial releases; explicit human-controlled integration later. |

## 16.4 Compliance roadmap

Design controls that can support future SOC 2 and GDPR requirements, but do not claim certification or compliance without independent assessment. Future capabilities may include SSO/SAML, SCIM, audit exports, configurable data residency, DPA, subprocessors register and enterprise retention controls.

# 17. Reliability, observability and operations

## 17.1 Observability requirements

- Structured logs with request_id, correlation_id, organisation_id and resource identifiers.
- Distributed tracing across API, queue, worker and provider calls.
- Metrics for queue depth, job age, execution duration, worker failures, test duration and provider errors.
- Error tracking for web application and control plane.
- Alerts for stuck jobs, repeated failures, budget anomalies and integration outages.
- Operational dashboards separated from customer-facing product analytics.

## 17.2 Reliability targets

| Area                       | Initial objective                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Control-plane availability | 99.5% monthly target for early commercial release.                                               |
| API latency                | p95 below 500 ms for ordinary metadata requests, excluding long-running jobs.                    |
| Job durability             | Acknowledged jobs are persisted and either retried or moved to a visible terminal failure state. |
| Webhook processing         | Persist then acknowledge; asynchronous processing with deduplication.                            |
| Worker recovery            | Detect worker loss and mark execution state accurately; avoid duplicate side effects.            |
| Backups                    | Automated database backups and tested restore procedure.                                         |
| Incident response          | Defined on-call owner, severity levels and customer communication process.                       |

## 17.3 Failure handling

- Use bounded retries with exponential backoff for transient provider and network failures.
- Do not retry non-idempotent operations without an idempotency key.
- Distinguish provider outage from user-code failure.
- Provide a clear terminal status and actionable error to the user.
- Preserve logs and evidence needed for diagnosis according to retention policy.

# 18. Pricing and commercial model

Use a hybrid SaaS subscription plus metered execution model. Subscription provides workspace features, collaboration and included quotas. Usage charges cover expensive resources such as agent runtime, browser execution and storage beyond plan limits.

| Plan       | Indicative monthly price | Target customer          | Packaging hypothesis                                                          |
| ---------- | ------------------------ | ------------------------ | ----------------------------------------------------------------------------- |
| Free       | $0                       | Individual evaluator     | One project, small monthly test/scan quota, limited history.                  |
| Developer  | $29                      | Individual developer     | Core ShipSafe, basic CodeKeeper and limited DevPilot sessions.                |
| Pro        | $79                      | Power user / indie team  | More repositories, higher execution quota, advanced reports and integrations. |
| Team       | $199                     | Small engineering team   | Collaboration, roles, policies, shared projects and team usage.               |
| Business   | $499                     | Growing software company | Higher quotas, audit features, advanced controls and priority support.        |
| Enterprise | Custom                   | Larger organisations     | SSO, governance, procurement, custom retention and support commitments.       |

Prices are hypotheses, not validated market pricing. Before publishing, calculate contribution margin using real model, browser, container, storage, support and payment costs. Clearly disclose usage limits and overage behaviour.

## 18.1 Packaging principles

- All three modules can be visible in the product, but plan entitlements and usage quotas may differ.
- Allow a customer to start with ShipSafe without requiring DevPilot.
- Meter expensive operations separately and transparently.
- Offer a hard spend cap and notifications.
- Avoid unlimited plans until usage distribution and gross margin are understood.

# 19. Go-to-market and validation plan

## 19.1 Initial ideal customer profile

AI-native software teams with approximately 2–20 developers, using GitHub and at least one AI coding assistant or agent in active development. Secondary segments include indie developers, agencies and open-source maintainers.

## 19.2 Design-partner validation

- Interview 30 developers and engineering leads about testing, agent coordination and maintenance pain.
- Recruit 8–10 design partners with real repositories and permission to run a limited pilot.
- Observe current workflows rather than relying only on stated preferences.
- Run a concierge pilot: manually assist setup where needed, but measure whether the product itself delivers value.
- Ask design partners to pay or sign a clear pilot agreement; compliments alone are not validation.
- Track test usefulness, time-to-value, recurring usage, security objections and willingness to pay.
- Do not expand to additional languages or providers until the initial segment shows repeated usage.

## 19.3 Distribution

- GitHub Marketplace listing after integration and support maturity.
- Open-source CLI or lightweight test runner to create developer adoption.
- Technical demos showing a real regression detected and reproduced.
- Developer documentation, tutorials and integration guides.
- Product Hunt and relevant developer communities.
- Direct outreach to AI-native agencies and small engineering teams.
- Content focused on AI-generated code quality, agent workflows and repository maintenance.

## 19.4 Validation gates

| Gate                 | Evidence required                                                                 | Decision                                |
| -------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| Problem validation   | At least 20 of 30 interviews describe recurring, costly pain in the chosen wedge. | Continue or reposition.                 |
| Prototype validation | At least 8 design partners connect a real repository and complete a workflow.     | Proceed to MVP.                         |
| Value validation     | Partners confirm actionable findings and repeat use across multiple PRs.          | Invest in reliability and integrations. |
| Willingness to pay   | At least 5 customers pay or commit to a paid pilot at a meaningful price.         | Begin commercial launch.                |
| Retention validation | Users return for new PRs, scans or agent tasks over multiple weeks.               | Expand modules and acquisition.         |

# 20. Phased delivery roadmap

The roadmap deliberately sequences customer value. The shared architecture supports all three modules, but the team should release one coherent workflow at a time.

## Phase 0 — Discovery and technical proof (Weeks 1–2)

- Interview target developers and collect real repository workflows.
- Select one supported web stack and a small set of design-partner repositories.
- Validate GitHub App permissions and webhook flow.
- Prototype a PR-triggered Playwright run against a sample application.
- Test one coding-agent runtime through a documented supported interface.
- Threat-model untrusted code execution and credential handling.
- Finalise the MVP boundary and design-partner agreement.
  Exit criteria: a technical proof demonstrates GitHub event ingestion, isolated test execution and evidence publication. The team has a validated wedge and a documented security design.

## Phase 1 — Shared platform foundation (Weeks 3–6)

- Monorepo, CI, development/staging environments and code quality checks.
- Authentication, organisations, memberships and basic roles.
- Projects, repository connections and GitHub App installation.
- Webhook receiver with signature validation and idempotency.
- PostgreSQL schema, migrations, tenant isolation tests and object storage.
- Background job framework, event outbox and notifications.
- Initial dashboard, onboarding and integration settings.
- Usage event schema and basic quota enforcement.
  Exit criteria: user can sign up, create a workspace, connect a selected GitHub repository and see a completed repository indexing status.

## Phase 2 — ShipSafe MVP (Weeks 7–10)

- PR event detection and exact commit pinning.
- Configured Playwright test execution in isolated workers.
- Basic API test support or configured HTTP assertions.
- Test result parsing and failure classification.
- Screenshot, trace and log storage.
- GitHub Check Run and detailed ForgePilot report.
- Test history and basic test suite configuration.
- Operational dashboards for worker reliability and cost.
  Exit criteria: a design partner can connect a repository, open a PR, receive an automated test result and inspect reproducible evidence.

## Phase 3 — DevPilot MVP (Weeks 11–14)

- Task creation with acceptance criteria and repository context.
- First supported coding runtime adapter.
- Isolated workspaces, session lifecycle and cancellation.
- Structured logs and result collection.
- Changed-file and diff summary.
- Branch and PR creation with scoped GitHub credentials.
- Basic budget and timeout controls.
- ShipSafe handoff from completed PR.
  Exit criteria: a developer can assign a task to a supported agent, monitor the execution, receive a reviewable PR and trigger ShipSafe verification.

## Phase 4 — CodeKeeper MVP (Weeks 15–18)

- Dependency inventory for initial ecosystems (recommend npm and Python).
- Advisory matching with source references.
- Scheduled scans and deduplicated findings.
- Maintenance queue and repository health baseline.
- Create maintenance task from a finding.
- Use DevPilot to propose a maintenance PR.
- Use ShipSafe to verify the maintenance PR.
  Exit criteria: a design partner can detect an outdated or vulnerable dependency, create a controlled maintenance PR and verify it.

## Phase 5 — Integrated workflows and paid beta (Weeks 19–22)

- Cross-feature event rules and linked resource history.
- Fix-task loop with retry limits and escalation.
- Approval centre and policy controls.
- Second supported coding runtime where integration feasibility is confirmed.
- Usage metering, plan entitlements and billing.
- Improved onboarding, documentation and support processes.
- Customer feedback and reliability improvements.
  Exit criteria: all three modules work as one traceable workflow, and early customers can be billed with predictable usage limits.

## Phase 6 — Public launch and optimisation (Weeks 23–26)

- Self-serve signup and onboarding improvements.
- Public documentation and status page.
- GitHub Marketplace readiness review.
- Security review and penetration testing appropriate to launch scope.
- Pricing and quota finalisation.
- Customer support and incident response process.
- Launch content and technical demonstrations.
- Review retention, usage, false positives and gross margin.
  Exit criteria: the product has stable onboarding, measurable recurring use, clear unit economics and a supportable release process.

## 20.1 Roadmap dependencies

| Workstream               | Depends on                                                           | Can proceed in parallel with                            |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| ShipSafe                 | GitHub integration, workers, object storage and test configuration.  | Design system, repository metadata, billing foundation. |
| DevPilot                 | Task model, provider access, sandbox, secrets and workspace manager. | ShipSafe UI and CodeKeeper scanner design.              |
| CodeKeeper               | Repository inventory, advisory sources, maintenance task model.      | DevPilot runtime and dashboard.                         |
| Cross-feature automation | Stable event schema and linked resource identifiers.                 | Analytics and documentation.                            |
| Commercial launch        | Usage metering, billing, security and support readiness.             | Content and design-partner case studies.                |

# 21. Engineering epics and acceptance criteria

| Epic                              | Scope                                                                                    | Definition of done                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| EPIC 01 — Platform foundation     | Authentication, tenant model, projects, navigation, design system and environment setup. | User can create a workspace and access only authorised tenant data.                            |
| EPIC 02 — GitHub integration      | GitHub App, OAuth, repository selection, webhooks and scoped API operations.             | Webhook signature validation, event deduplication and repository permission tests pass.        |
| EPIC 03 — Repository intelligence | Metadata ingestion, file discovery, language/dependency parsing and snapshots.           | A repository snapshot is linked to an immutable commit SHA and can be refreshed incrementally. |
| EPIC 04 — ShipSafe                | Test configuration, Playwright workers, result processing, evidence and PR checks.       | A PR produces a traceable test report and correct GitHub Check Run.                            |
| EPIC 05 — DevPilot                | Task management, runtime adapter, sandbox, logs, lifecycle and PR creation.              | A task runs in isolation, can be cancelled and produces a reviewable result.                   |
| EPIC 06 — CodeKeeper              | Dependency inventory, advisory matching, findings, maintenance task and PR.              | A known dependency issue can be detected, prioritised and converted into a verified PR.        |
| EPIC 07 — Cross-feature workflow  | Event routing, linked tasks, fix loops, approvals and correlation IDs.                   | A failed test can create a fix task, and the retest remains linked to the original PR.         |
| EPIC 08 — Commercialisation       | Billing, quotas, usage, documentation, support and analytics.                            | A paid workspace has accurate usage records, plan enforcement and an auditable invoice trail.  |

## 21.1 First engineering backlog

| ID     | Task                                                                | Priority |
| ------ | ------------------------------------------------------------------- | -------- |
| FP-001 | Create monorepo, linting, formatting and CI pipeline.               | P0       |
| FP-002 | Create Next.js application and shared design system.                | P0       |
| FP-003 | Create API service and OpenAPI generation.                          | P0       |
| FP-004 | Create PostgreSQL schema and migration workflow.                    | P0       |
| FP-005 | Implement authentication and session management.                    | P0       |
| FP-006 | Implement organisation, membership and role checks.                 | P0       |
| FP-007 | Implement project and repository models.                            | P0       |
| FP-008 | Register GitHub App and implement installation flow.                | P0       |
| FP-009 | Implement signed webhook receiver and event deduplication.          | P0       |
| FP-010 | Implement repository metadata ingestion and commit snapshots.       | P0       |
| FP-011 | Set up durable background jobs and outbox event publishing.         | P0       |
| FP-012 | Build isolated Playwright worker image and execution manager.       | P0       |
| FP-013 | Implement test suite configuration and test run API.                | P0       |
| FP-014 | Implement evidence collection and report UI.                        | P0       |
| FP-015 | Publish GitHub Check Runs.                                          | P0       |
| FP-016 | Implement DevPilot task model and task UI.                          | P0       |
| FP-017 | Implement first coding runtime adapter through supported interface. | P0       |
| FP-018 | Implement isolated agent workspace and cancellation.                | P0       |
| FP-019 | Implement structured logs and secret redaction.                     | P0       |
| FP-020 | Implement PR creation and ShipSafe handoff.                         | P1       |
| FP-021 | Implement dependency inventory for npm and Python.                  | P1       |
| FP-022 | Integrate advisory matching and finding normalisation.              | P1       |
| FP-023 | Implement maintenance task and PR workflow.                         | P1       |
| FP-024 | Implement approval centre and policy checks.                        | P1       |
| FP-025 | Implement usage metering, quotas and billing.                       | P1       |
| FP-026 | Implement second runtime adapter after feasibility review.          | P1       |
| FP-027 | Implement analytics and cost attribution.                           | P1       |
| FP-028 | Complete security review and tenant-isolation test suite.           | P0       |
| FP-029 | Create customer onboarding, docs and support workflows.             | P1       |
| FP-030 | Prepare launch checklist and production readiness review.           | P1       |

## 21.2 Definition of done

- Code reviewed and merged through the agreed workflow.
- Unit and integration tests cover critical paths.
- API and event contracts are documented.
- Permissions and tenant boundaries are tested.
- Logs and metrics exist for operationally important actions.
- Failure and retry behaviour is defined.
- User-facing status and error messages are clear.
- Documentation and migration notes are updated.
- No secrets are committed or exposed in logs.
- Feature flag and rollback strategy exist where appropriate.

# 22. Risks, dependencies and open decisions

| Risk / decision                  | Why it matters                                                         | Mitigation / next action                                                                          |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Crowded developer-tools market   | Testing, maintenance and agent orchestration already have competitors. | Choose a narrow wedge and validate with real repositories and paid pilots.                        |
| Provider integration constraints | Coding-agent products expose different APIs and execution models.      | Build adapters only for supported interfaces; prove first runtime before promising compatibility. |
| Execution cost volatility        | Browser and agent workloads can create unpredictable costs.            | Meter usage, cap budgets, use quotas and analyse cost per verified task.                          |
| False-positive test reports      | Low-quality findings reduce trust and retention.                       | Separate product failures from environment failures; collect evidence and track precision.        |
| Sandbox security                 | Untrusted code can attempt to access secrets or infrastructure.        | Use isolated workers, least privilege, network restrictions and security testing.                 |
| Scope expansion                  | Three products can overwhelm a small founding team.                    | ShipSafe first; stage DevPilot and CodeKeeper behind phase gates.                                 |
| Health score credibility         | A single score can mislead users.                                      | Show component evidence, unknown states and score methodology.                                    |
| Data privacy concerns            | Source code and agent context are sensitive.                           | Minimise indexing, provide exclusions, retention controls and transparent data handling.          |
| Integration maintenance          | External APIs and runtimes change.                                     | Version adapters, monitor deprecations and maintain contract tests.                               |
| Unclear initial buyer            | Developers use tools but may not own budget.                           | Interview both daily users and engineering buyers; test paid conversion.                          |

## 22.1 Decisions to resolve before implementation

- Confirm product name, domain and trademark clearance.
- Select the first target stack (recommend one common web stack such as TypeScript/Next.js for design partners).
- Confirm the first coding-agent runtime based on current supported APIs, licensing and operational feasibility.
- Choose the initial cloud provider and container execution model.
- Decide whether test execution is fully managed or customer-run for sensitive repositories.
- Set the first supported dependency ecosystems.
- Define exact GitHub App permissions and publish a permission rationale.
- Set initial data retention, region and privacy policy.
- Validate pricing and included quotas using real cost measurements.
- Choose whether the first launch is ShipSafe-only or a private beta showing all three modules with staged entitlements.

# Appendix A — Glossary

| Term                    | Definition                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Agent                   | A coding runtime or autonomous software process that performs a task using tools and repository context.   |
| Agent adapter           | ForgePilot integration layer that translates a common internal interface into a provider-specific runtime. |
| Base SHA / Head SHA     | Immutable Git commit identifiers for the source and proposed pull-request state.                           |
| Check Run               | GitHub status/report associated with a commit.                                                             |
| Control plane           | ForgePilot services that manage users, projects, policies, tasks and execution metadata.                   |
| Execution plane         | Isolated workers that run tests, scans and coding agents.                                                  |
| Evidence bundle         | Logs, screenshots, traces, test results and metadata supporting a finding.                                 |
| Idempotency             | A property that makes repeated processing of the same request safe without duplicating side effects.       |
| Maintenance PR          | A pull request proposing a repository maintenance change.                                                  |
| Repository intelligence | Structured, versioned understanding of repository metadata and relationships.                              |
| Tenant                  | An organisation/workspace whose data must be isolated from other customers.                                |
| Worktree                | A separate working directory/branch for isolated Git work.                                                 |

# Appendix B — Sample end-to-end product scenarios

## Scenario 1: New feature built by an AI agent

```
Developer creates task: "Add invite teammates flow"   -> DevPilot validates task and policy   -> isolated workspace created at commit ABC   -> coding agent implements change   -> agent creates branch and PR #42   -> ShipSafe detects changed invitation and email flows   -> browser/API tests run against commit DEF   -> one test fails with screenshot and network evidence   -> developer creates linked fix task   -> DevPilot starts fix in a new isolated workspace   -> new commit pushed   -> ShipSafe retests   -> checks pass   -> human reviews and merges PR   -> CodeKeeper includes new dependencies in next scan
```

## Scenario 2: Vulnerable dependency

```
CodeKeeper scheduled scan   -> finds package with known advisory   -> records package, installed version, advisory URL and severity   -> user reviews finding   -> maintenance task created   -> DevPilot updates dependency in isolated workspace   -> lockfile and tests checked   -> maintenance PR created   -> ShipSafe verifies PR   -> human reviews and merges   -> CodeKeeper refreshes inventory and closes finding
```

## Scenario 3: Flaky browser test

```
ShipSafe run fails intermittently   -> result classifier marks possible flaky test   -> report includes retry history and trace   -> test is not automatically treated as a confirmed product defect   -> user reviews failure   -> test maintenance task can be created   -> fix is proposed and verified in isolated environment
```

# Appendix C — Launch readiness checklist

- Product name and legal clearance completed.
- Design-partner problem validation completed.
- GitHub App permissions reviewed and documented.
- Tenant isolation and authorisation tests pass.
- Execution workers are isolated and resource-limited.
- Webhook signature validation and replay/deduplication are tested.
- Secrets are stored securely and redacted from logs.
- Test runs are pinned to exact commit SHAs.
- Agent sessions can be cancelled and timed out.
- Usage limits and hard spend caps work.
- Customer data retention and deletion processes are documented.
- Incident response and backup restoration are tested.
- Support and status communication processes are ready.
- Pricing and overage terms are transparent.
- Documentation and onboarding are usable by a new developer.
- No feature is marketed as guaranteed bug-free or fully secure.

# Appendix D — Final product definition

ForgePilot is a unified AI Engineering Operations Platform with three integrated products:

| Feature                | Product promise                                                | Primary outcome                     |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------- |
| Feature 1 — ShipSafe   | Test, verify and provide evidence for software changes.        | Reliable releases.                  |
| Feature 2 — CodeKeeper | Continuously identify and resolve repository maintenance work. | Healthy repositories.               |
| Feature 3 — DevPilot   | Coordinate coding agents, tasks and isolated execution.        | Controlled AI-assisted development. |

The strategic product loop is: DevPilot coordinates implementation; ShipSafe verifies the change; CodeKeeper maintains the repository; shared intelligence connects the lifecycle. ForgePilot should earn customer trust through transparent evidence, safe execution, predictable costs and reliable integrations.

FORGEPILOT — BUILD SMARTER. SHIP SAFER. STAY MAINTAINED.
