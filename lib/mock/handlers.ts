/**
 * Mock API route table. app/api/mock/[...path]/route.ts dispatches here.
 * Each route documents method, path, auth and request/response schema so the
 * backend contract (docs/api-contract.md) can be read straight off this file.
 */
import "server-only";
import { z } from "zod";
import {
  ActivityItemSchema,
  ApplicationDetailSchema,
  ApplicationSummarySchema,
  ApprovalInputSchema,
  ApprovalQueueItemSchema,
  ClientDetailSchema,
  ClientSummarySchema,
  ConnectIntegrationInputSchema,
  DiffFileSchema,
  EvidencePackSchema,
  GitRepoCandidateSchema,
  IntegrationViewSchema,
  InviteUserInputSchema,
  LiveLogSchema,
  NewTaskInputSchema,
  NotificationListSchema,
  OkSchema,
  OnboardingInputSchema,
  OnboardingResultSchema,
  OnboardingStatusSchema,
  OpsDashboardSchema,
  PortalOverviewSchema,
  RepositoryDetailSchema,
  RepositorySummarySchema,
  SavingsReportSchema,
  SearchResultSchema,
  SessionSchema,
  SlaReportSchema,
  SwitchSessionInputSchema,
  TaskActionInputSchema,
  TaskDetailSchema,
  TaskListItemSchema,
  UserSchema,
  type MockDb,
  type Task,
  type User,
} from "@/lib/schemas";
import { areaForRole, canApprove, canManageTeam, isManager } from "@/lib/domain/roles";
import { checkAction, MAX_ATTEMPTS } from "@/lib/domain/workflow";
import { INTEGRATION_PROVIDERS, providerById } from "@/lib/domain/integrations";
import { hoursBetween } from "@/lib/domain/sla";
import { repoName, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { getDb, newId, resetDb } from "./db";
import { appendEvidence, toIso } from "./evidence";
import { generateDiff, generateLog, flakyTestsFor, gitCandidates } from "./generators";
import { latestRun, RUN_MS, SCAN_MS } from "./simulation";
import {
  activityFor,
  appHealth,
  applicationSummary,
  clientSummary,
  evidenceFor,
  evidencePack,
  opsDashboard,
  portalOverview,
  repositorySummary,
  savingsReportFor,
  signOffFor,
  slaReportFor,
  taskListItem,
} from "./views";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface Ctx {
  db: MockDb;
  user: User | null;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  now: number;
  setCookies?: { name: string; value: string }[];
}

type Auth = "public" | "any" | "portal" | "console" | "manager";

export interface RouteDef {
  method: "GET" | "POST";
  path: string;
  auth: Auth;
  summary: string;
  request?: z.ZodType;
  response: z.ZodType;
  handler: (ctx: Ctx) => unknown;
}

// ---------------------------------------------------------------- helpers
function requireUser(ctx: Ctx): User {
  if (!ctx.user) throw new HttpError(401, "Not signed in");
  return ctx.user;
}

/** Org ids the current user may see. Portal users: their org. Console: all. */
function visibleOrgIds(ctx: Ctx): string[] {
  const u = requireUser(ctx);
  if (areaForRole(u.role) === "portal") return u.orgId ? [u.orgId] : [];
  return ctx.db.organizations.map((o) => o.id);
}

function portalOrgId(ctx: Ctx): string {
  const u = requireUser(ctx);
  if (u.orgId) return u.orgId;
  const q = ctx.query.get("orgId");
  if (q) return q;
  throw new HttpError(400, "orgId is required for ForgePilot users");
}

function findTask(ctx: Ctx, id: string): Task {
  const t = ctx.db.tasks.find((x) => x.id === id);
  if (!t || !visibleOrgIds(ctx).includes(t.orgId)) throw new HttpError(404, "Task not found");
  return t;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(422, "Validation failed", z.flattenError(r.error));
  return r.data;
}

function person(u: User) {
  return { type: "person" as const, id: u.id };
}

function taskDetail(ctx: Ctx, task: Task) {
  const { db, now } = ctx;
  const runs = db.agentRuns
    .filter((r) => r.taskId === task.id)
    .sort((a, b) => a.attempt - b.attempt);
  const runIds = new Set(runs.map((r) => r.id));
  const { items, chainValid } = evidenceFor(db, task.id);
  return {
    task: taskListItem(db, task, now),
    application: db.applications.find((a) => a.id === task.applicationId)!,
    repository: db.repositories.find((r) => r.id === task.repositoryId)!,
    organization: db.organizations.find((o) => o.id === task.orgId)!,
    contract: db.contracts.find((c) => c.orgId === task.orgId) ?? null,
    runs,
    verifications: db.verificationRuns.filter((v) => runIds.has(v.agentRunId)),
    approvals: db.approvals
      .filter((a) => a.taskId === task.id)
      .map((a) => ({ ...a, approver: db.users.find((u) => u.id === a.approverUserId) ?? null })),
    evidence: items,
    chainValid,
    signOff: signOffFor(db, task.id),
  };
}

function filterTasks(ctx: Ctx, tasks: Task[]) {
  const q = ctx.query;
  const u = requireUser(ctx);
  return tasks.filter((t) => {
    if (q.get("orgId") && t.orgId !== q.get("orgId")) return false;
    if (q.get("applicationId") && t.applicationId !== q.get("applicationId")) return false;
    if (q.get("repositoryId") && t.repositoryId !== q.get("repositoryId")) return false;
    if (q.get("type") && t.type !== q.get("type")) return false;
    if (q.get("state") && t.state !== q.get("state")) return false;
    if (q.get("assigneeUserId") && t.assigneeUserId !== q.get("assigneeUserId")) return false;
    if (q.get("agent") && t.agent !== q.get("agent")) return false;
    if (q.get("mine") === "true" && t.assigneeUserId !== u.id) return false;
    if (q.get("from") && t.createdAt < q.get("from")!) return false;
    if (q.get("to") && t.createdAt.slice(0, 10) > q.get("to")!) return false;
    return true;
  });
}

function startRun(ctx: Ctx, task: Task, opts: { notes?: string; simulateFailure?: boolean }) {
  const { db, now } = ctx;
  const attempts = db.agentRuns.filter((r) => r.taskId === task.id).length;
  const model =
    task.agent === "claude_code" ? "claude-sonnet" : task.agent === "codex" ? "gpt-codex" : "devin";
  const run = {
    id: `run_${task.id}_${attempts + 1}`,
    taskId: task.id,
    attempt: attempts + 1,
    agent: task.agent,
    model,
    tokens: 0,
    costUsd: 0,
    durationSec: null,
    outcome: "running" as const,
    startedAt: toIso(now),
    notes: opts.notes,
    simulatedEndsAt: now + RUN_MS,
    simulateFailure: opts.simulateFailure ?? false,
  };
  db.agentRuns.push(run);
  task.state = "running";
  appendEvidence(
    db,
    task.id,
    "agent_run_started",
    { type: "agent", id: `${task.agent}:${model}` },
    { runId: run.id, attempt: run.attempt, ...(opts.notes ? { notes: opts.notes } : {}) },
    now,
  );
  return run;
}

// ---------------------------------------------------------------- routes
export const routes: RouteDef[] = [
  // ---- session
  {
    method: "GET",
    path: "/session",
    auth: "any",
    summary:
      "Current mock session (user, organization) and the personas available in the role switcher.",
    response: SessionSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      return {
        user,
        organization: ctx.db.organizations.find((o) => o.id === user.orgId) ?? null,
        personas: ctx.db.users.filter((u) => u.status !== "invited"),
      };
    },
  },
  {
    method: "GET",
    path: "/session/personas",
    auth: "public",
    summary: "Personas for the mock sign-in screen.",
    response: z.array(UserSchema),
    handler: (ctx) => ctx.db.users.filter((u) => u.status !== "invited"),
  },
  {
    method: "POST",
    path: "/session",
    auth: "public",
    summary: "Switch mock session to another persona (sets the fp_session cookie).",
    request: SwitchSessionInputSchema,
    response: SessionSchema,
    handler: (ctx) => {
      const { userId } = parseBody(SwitchSessionInputSchema, ctx.body);
      const user = ctx.db.users.find((u) => u.id === userId);
      if (!user) throw new HttpError(404, "Unknown persona");
      ctx.setCookies = [
        { name: "fp_session", value: user.id },
        { name: "fp_role", value: user.role },
      ];
      return {
        user,
        organization: ctx.db.organizations.find((o) => o.id === user.orgId) ?? null,
        personas: ctx.db.users.filter((u) => u.status !== "invited"),
      };
    },
  },

  // ---- portal overview & activity
  {
    method: "GET",
    path: "/overview",
    auth: "portal",
    summary: "Portal overview: KPIs, 12-week health trend, needs-attention list, recent activity.",
    response: PortalOverviewSchema,
    handler: (ctx) => portalOverview(ctx.db, portalOrgId(ctx), ctx.now),
  },
  {
    method: "GET",
    path: "/activity",
    auth: "any",
    summary: "Recent evidence events across visible organizations. ?limit=",
    response: z.array(ActivityItemSchema),
    handler: (ctx) => activityFor(ctx.db, visibleOrgIds(ctx), Number(ctx.query.get("limit") ?? 20)),
  },

  // ---- applications
  {
    method: "GET",
    path: "/applications",
    auth: "any",
    summary: "Applications visible to the user. Console may filter ?orgId=",
    response: z.array(ApplicationSummarySchema),
    handler: (ctx) => {
      const orgs = visibleOrgIds(ctx);
      const orgId = ctx.query.get("orgId");
      return ctx.db.applications
        .filter((a) => orgs.includes(a.orgId) && (!orgId || a.orgId === orgId))
        .map((a) => applicationSummary(ctx.db, a.id, ctx.now));
    },
  },
  {
    method: "GET",
    path: "/applications/:id",
    auth: "any",
    summary: "Application detail with health breakdown, history, repositories, findings and tasks.",
    response: ApplicationDetailSchema,
    handler: (ctx) => {
      const app = ctx.db.applications.find((a) => a.id === ctx.params.id);
      if (!app || !visibleOrgIds(ctx).includes(app.orgId))
        throw new HttpError(404, "Application not found");
      const repos = ctx.db.repositories.filter((r) => r.applicationId === app.id);
      const sev = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      return {
        application: applicationSummary(ctx.db, app.id, ctx.now),
        organization: ctx.db.organizations.find((o) => o.id === app.orgId)!,
        owners: ctx.db.users.filter((u) => app.ownerUserIds.includes(u.id)),
        health: appHealth(ctx.db, app.id),
        history: ctx.db.healthHistory.filter((h) => h.applicationId === app.id),
        repositories: repos,
        findings: ctx.db.findings
          .filter((f) => repos.some((r) => r.id === f.repositoryId))
          .map((f) => ({
            ...f,
            repositoryName: repoName(repos.find((r) => r.id === f.repositoryId)!.url),
          }))
          .sort((a, b) => sev[a.severity] - sev[b.severity]),
        tasks: ctx.db.tasks
          .filter((t) => t.applicationId === app.id)
          .map((t) => taskListItem(ctx.db, t, ctx.now))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    },
  },

  // ---- repositories
  {
    method: "GET",
    path: "/repositories",
    auth: "any",
    summary: "Repositories visible to the user. ?orgId= ?applicationId=",
    response: z.array(RepositorySummarySchema),
    handler: (ctx) => {
      const orgs = visibleOrgIds(ctx);
      return ctx.db.repositories
        .map((r) => repositorySummary(ctx.db, r.id))
        .filter((r) => orgs.includes(r.organizationId))
        .filter((r) => !ctx.query.get("orgId") || r.organizationId === ctx.query.get("orgId"))
        .filter(
          (r) =>
            !ctx.query.get("applicationId") || r.applicationId === ctx.query.get("applicationId"),
        );
    },
  },
  {
    method: "GET",
    path: "/repositories/:id",
    auth: "any",
    summary: "Repository detail: health, findings, scans, flaky tests, tasks.",
    response: RepositoryDetailSchema,
    handler: (ctx) => {
      const repo = ctx.db.repositories.find((r) => r.id === ctx.params.id);
      if (!repo) throw new HttpError(404, "Repository not found");
      const summary = repositorySummary(ctx.db, repo.id);
      if (!visibleOrgIds(ctx).includes(summary.organizationId))
        throw new HttpError(404, "Repository not found");
      return {
        repository: summary,
        findings: ctx.db.findings.filter((f) => f.repositoryId === repo.id),
        scans: ctx.db.scans
          .filter((s) => s.repositoryId === repo.id)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
        tasks: ctx.db.tasks
          .filter((t) => t.repositoryId === repo.id)
          .map((t) => taskListItem(ctx.db, t, ctx.now)),
        flakyTests: flakyTestsFor(repo),
      };
    },
  },
  {
    method: "POST",
    path: "/repositories/:id/scans",
    auth: "console",
    summary: "Start a health scan (mock: completes after a few seconds with updated results).",
    response: z.object({ scanId: z.string() }),
    handler: (ctx) => {
      const repo = ctx.db.repositories.find((r) => r.id === ctx.params.id);
      if (!repo) throw new HttpError(404, "Repository not found");
      const running = ctx.db.scans.find(
        (s) => s.repositoryId === repo.id && s.status === "running",
      );
      if (running) return { scanId: running.id };
      const scan = {
        id: newId("scan"),
        repositoryId: repo.id,
        startedAt: toIso(ctx.now),
        finishedAt: null,
        status: "running" as const,
        healthScore: null,
        findingsCount: null,
        trigger: "manual" as const,
        simulatedEndsAt: ctx.now + SCAN_MS,
      };
      ctx.db.scans.push(scan);
      return { scanId: scan.id };
    },
  },

  // ---- tasks
  {
    method: "GET",
    path: "/tasks",
    auth: "any",
    summary:
      "Tasks visible to the user. Filters: orgId, applicationId, repositoryId, type, state, assigneeUserId, agent, from, to, mine.",
    response: z.array(TaskListItemSchema),
    handler: (ctx) => {
      const orgs = visibleOrgIds(ctx);
      return filterTasks(
        ctx,
        ctx.db.tasks.filter((t) => orgs.includes(t.orgId)),
      )
        .map((t) => taskListItem(ctx.db, t, ctx.now))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  },
  {
    method: "POST",
    path: "/tasks",
    auth: "console",
    summary: "Create a task (New task dialog).",
    request: NewTaskInputSchema,
    response: TaskListItemSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      const input = parseBody(NewTaskInputSchema, ctx.body);
      const repo = ctx.db.repositories.find((r) => r.id === input.repositoryId);
      const app = repo && ctx.db.applications.find((a) => a.id === repo.applicationId);
      if (!repo || !app || app.orgId !== input.orgId)
        throw new HttpError(422, "Repository does not belong to that client");
      const n = ctx.db.tasks.length + 1;
      const id = `task_${String(n).padStart(3, "0")}_${Date.now().toString(36).slice(-4)}`;
      const hoursToSla = input.priority === "p0" ? 72 : input.priority === "p1" ? 120 : 240;
      const task: Task = {
        id,
        repositoryId: repo.id,
        applicationId: app.id,
        orgId: app.orgId,
        type: input.type,
        title: input.title,
        summary: input.description,
        source: { kind: "manual", ref: `FP-${1000 + n}` },
        state: "planned",
        priority: input.priority,
        slaDueAt: toIso(ctx.now + hoursToSla * 3_600_000),
        assigneeUserId: input.assigneeUserId ?? (user.role === "fp_engineer" ? user.id : null),
        agent: input.agent,
        createdAt: toIso(ctx.now),
        aiAuthoredPct: 0,
        plan: {
          steps: [
            "Analyse affected modules",
            "Apply change",
            "Update or add tests",
            "Run verification",
          ],
          acceptanceCriteria: input.acceptanceCriteria,
          approvedBy: null,
        },
        estimatedHours: {
          cve_patch: 36,
          dependency_upgrade: 180,
          bug_fix: 56,
          enhancement: 110,
          test_coverage: 80,
        }[input.type],
      };
      ctx.db.tasks.push(task);
      appendEvidence(
        ctx.db,
        id,
        "task_created",
        person(user),
        { source: task.source.ref, type: TASK_TYPE_LABEL[task.type] },
        ctx.now,
      );
      return taskListItem(ctx.db, task, ctx.now);
    },
  },
  {
    method: "GET",
    path: "/tasks/:id",
    auth: "any",
    summary: "Task detail: runs, verifications, PR, approvals, evidence (hash-chain checked).",
    response: TaskDetailSchema,
    handler: (ctx) => taskDetail(ctx, findTask(ctx, ctx.params.id)),
  },
  {
    method: "GET",
    path: "/tasks/:id/log",
    auth: "console",
    summary: "Live agent log for the latest run (mock stream: poll every ~1.5s).",
    response: LiveLogSchema,
    handler: (ctx) => {
      const task = findTask(ctx, ctx.params.id);
      const run = latestRun(ctx.db, task.id);
      const repo = ctx.db.repositories.find((r) => r.id === task.repositoryId)!;
      if (!run) return { runId: null, status: "idle", lines: [], progressPct: 0 };
      const lines = generateLog(task, repo, run, ctx.now);
      const start = Date.parse(run.startedAt);
      const end = run.simulatedEndsAt ?? start + (run.durationSec ?? 0) * 1000;
      const progressPct =
        run.outcome === "running"
          ? Math.min(99, Math.round(((ctx.now - start) / Math.max(1, end - start)) * 100))
          : 100;
      const status =
        run.outcome === "running" ? "running" : task.state === "verifying" ? "verifying" : "done";
      return { runId: run.id, status, lines, progressPct };
    },
  },
  {
    method: "GET",
    path: "/tasks/:id/diff",
    auth: "any",
    summary: "Unified diff of the change (files with hunks).",
    response: z.array(DiffFileSchema),
    handler: (ctx) => {
      const task = findTask(ctx, ctx.params.id);
      if (!latestRun(ctx.db, task.id)) return [];
      return generateDiff(
        task,
        ctx.db.repositories.find((r) => r.id === task.repositoryId)!,
      );
    },
  },
  {
    method: "POST",
    path: "/tasks/:id/actions",
    auth: "console",
    summary:
      "Engineer actions: save_plan, approve_plan, launch, stop, retry, take_over, sign_off, open_pr, escalate, close. Each writes an EvidenceRecord.",
    request: TaskActionInputSchema,
    response: TaskDetailSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      const task = findTask(ctx, ctx.params.id);
      const input = parseBody(TaskActionInputSchema, ctx.body);
      const item = taskListItem(ctx.db, task, ctx.now);
      const check = checkAction(input.action, {
        state: task.state,
        latestVerification: item.latestVerification,
        reviewedDiff: input.reviewedDiff,
      });
      if (!check.allowed) throw new HttpError(409, check.reason ?? "Action not allowed");
      const { db, now } = ctx;
      const me = person(user);
      switch (input.action) {
        case "save_plan": {
          if (!input.plan) throw new HttpError(422, "plan is required");
          task.plan = { ...input.plan, approvedBy: null };
          if (task.state === "created" || task.state === "plan_approved") task.state = "planned";
          appendEvidence(
            db,
            task.id,
            "plan_updated",
            me,
            { steps: input.plan.steps.length, criteria: input.plan.acceptanceCriteria.length },
            now,
          );
          break;
        }
        case "approve_plan":
          task.plan.approvedBy = user.id;
          task.state = "plan_approved";
          appendEvidence(db, task.id, "plan_approved", me, {}, now);
          break;
        case "launch":
          startRun(ctx, task, { simulateFailure: input.simulateFailure });
          break;
        case "stop": {
          const run = latestRun(db, task.id);
          if (run && run.outcome === "running") {
            run.outcome = "stopped";
            run.durationSec = Math.round((now - Date.parse(run.startedAt)) / 1000);
            delete run.simulatedEndsAt;
          }
          task.state = "plan_approved";
          appendEvidence(
            db,
            task.id,
            "agent_run_stopped",
            me,
            { runId: run?.id, notes: input.notes ?? "" },
            now,
          );
          break;
        }
        case "retry": {
          const attempts = db.agentRuns.filter((r) => r.taskId === task.id).length;
          if (attempts >= MAX_ATTEMPTS + 2)
            throw new HttpError(409, "Too many attempts; take over manually.");
          appendEvidence(db, task.id, "retry_requested", me, { notes: input.notes ?? "" }, now);
          startRun(ctx, task, { notes: input.notes, simulateFailure: input.simulateFailure });
          break;
        }
        case "take_over": {
          task.manualTakeoverBy = user.id;
          const run = latestRun(db, task.id);
          if (run && run.outcome === "running") {
            run.outcome = "stopped";
            run.durationSec = Math.round((now - Date.parse(run.startedAt)) / 1000);
            delete run.simulatedEndsAt;
          }
          appendEvidence(db, task.id, "manual_takeover", me, { notes: input.notes ?? "" }, now);
          // Engineer works by hand; their change still goes through the verification gate.
          const humanRun = {
            id: `run_${task.id}_${db.agentRuns.filter((r) => r.taskId === task.id).length + 1}`,
            taskId: task.id,
            attempt: db.agentRuns.filter((r) => r.taskId === task.id).length + 1,
            agent: task.agent,
            model: `manual:${user.name}`,
            tokens: 0,
            costUsd: 0,
            durationSec: null,
            outcome: "running" as const,
            startedAt: toIso(now),
            notes: input.notes ?? "Manual change by engineer",
            simulatedEndsAt: now + RUN_MS,
          };
          db.agentRuns.push(humanRun);
          task.state = "running";
          task.aiAuthoredPct = Math.min(task.aiAuthoredPct, 35);
          break;
        }
        case "sign_off":
          appendEvidence(
            db,
            task.id,
            "engineer_signed_off",
            me,
            { reviewedDiff: true, verificationId: item.latestVerification?.id },
            now,
          );
          task.state = "signed_off";
          break;
        case "open_pr": {
          const repo = db.repositories.find((r) => r.id === task.repositoryId)!;
          const number = 400 + db.pullRequests.length + 20;
          const pr = {
            id: `pr_${task.id}`,
            taskId: task.id,
            number,
            url: `${repo.url}/pull/${number}`,
            status: "open" as const,
            aiAuthoredPct: task.aiAuthoredPct || 70,
            openedAt: toIso(now),
          };
          db.pullRequests = db.pullRequests.filter((p) => p.taskId !== task.id);
          db.pullRequests.push(pr);
          if (!task.aiAuthoredPct) task.aiAuthoredPct = pr.aiAuthoredPct;
          task.state = "pr_open";
          appendEvidence(
            db,
            task.id,
            "pr_opened",
            { type: "system", id: "forgepilot" },
            { prId: pr.id, number, openedBy: user.id },
            now,
          );
          db.notifications.unshift({
            id: newId("ntf"),
            audience: "portal",
            orgId: task.orgId,
            title: `PR #${number} is waiting for your approval`,
            body: task.title,
            href: `/portal/work/${task.id}`,
            at: toIso(now),
            read: false,
          });
          break;
        }
        case "escalate":
          task.state = "escalated";
          task.escalationReason = input.notes || "Escalated by engineer";
          appendEvidence(db, task.id, "escalated", me, { notes: input.notes ?? "" }, now);
          break;
        case "close":
          task.state = "closed";
          appendEvidence(db, task.id, "closed", me, {}, now);
          break;
      }
      return taskDetail(ctx, task);
    },
  },
  {
    method: "POST",
    path: "/tasks/:id/approval",
    auth: "portal",
    summary:
      "Client approves or requests changes on an open PR. Approvers/admins only. Appends an EvidenceRecord.",
    request: ApprovalInputSchema,
    response: TaskDetailSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      if (!canApprove(user.role))
        throw new HttpError(403, "Your role can view but not approve changes");
      const task = findTask(ctx, ctx.params.id);
      if (task.state !== "pr_open")
        throw new HttpError(409, "This change is not waiting for approval");
      const input = parseBody(ApprovalInputSchema, ctx.body);
      ctx.db.approvals.push({
        id: newId("apr"),
        taskId: task.id,
        approverUserId: user.id,
        decision: input.decision,
        at: toIso(ctx.now),
        comment: input.comment ?? "",
      });
      if (input.decision === "approved") {
        task.state = "client_approved";
        appendEvidence(
          ctx.db,
          task.id,
          "client_approved",
          person(user),
          { comment: input.comment ?? "" },
          ctx.now,
        );
      } else {
        task.state = "rejected";
        appendEvidence(
          ctx.db,
          task.id,
          "client_requested_changes",
          person(user),
          { comment: input.comment },
          ctx.now,
        );
        ctx.db.notifications.unshift({
          id: newId("ntf"),
          audience: "console",
          orgId: null,
          title: `Changes requested: ${task.title}`,
          body: input.comment ?? "",
          href: `/console/tasks/${task.id}`,
          at: toIso(ctx.now),
          read: false,
        });
      }
      return taskDetail(ctx, task);
    },
  },

  // ---- approvals
  {
    method: "GET",
    path: "/approvals",
    auth: "portal",
    summary: "PRs waiting for client approval, oldest first, with risk and sign-off.",
    response: z.array(ApprovalQueueItemSchema),
    handler: (ctx) => {
      const orgId = portalOrgId(ctx);
      return ctx.db.tasks
        .filter((t) => t.orgId === orgId && t.state === "pr_open")
        .map((t) => {
          const item = taskListItem(ctx.db, t, ctx.now);
          const opened = item.pullRequest?.openedAt ?? t.createdAt;
          return {
            ...item,
            waitingHours: Math.max(0, Math.round(hoursBetween(opened, ctx.now))),
            signOff: signOffFor(ctx.db, t.id),
            highRisk:
              (item.latestVerification?.riskScore ?? 0) >= 60 ||
              t.aiAuthoredPct >= 75 ||
              t.priority === "p0",
          };
        })
        .sort((a, b) =>
          (a.pullRequest?.openedAt ?? "").localeCompare(b.pullRequest?.openedAt ?? ""),
        );
    },
  },

  // ---- evidence
  {
    method: "GET",
    path: "/evidence",
    auth: "any",
    summary:
      "Evidence packs (one per task with activity). Filters: applicationId, type, from, to, q.",
    response: z.array(EvidencePackSchema),
    handler: (ctx) => {
      const orgs = visibleOrgIds(ctx);
      const q = (ctx.query.get("q") ?? "").toLowerCase();
      return filterTasks(
        ctx,
        ctx.db.tasks.filter((t) => orgs.includes(t.orgId)),
      )
        .filter((t) => !q || t.title.toLowerCase().includes(q) || t.id.includes(q))
        .map((t) => evidencePack(ctx.db, t, ctx.now))
        .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt));
    },
  },
  {
    method: "GET",
    path: "/evidence/export",
    auth: "any",
    summary: "Export evidence packs as JSON. ?ids=pack_task_001,pack_task_002",
    response: z.object({
      exportedAt: z.string(),
      exportedBy: z.string(),
      packs: z.array(EvidencePackSchema),
    }),
    handler: (ctx) => {
      const user = requireUser(ctx);
      const ids = (ctx.query.get("ids") ?? "").split(",").filter(Boolean);
      const orgs = visibleOrgIds(ctx);
      const packs = ctx.db.tasks
        .filter((t) => orgs.includes(t.orgId) && ids.includes(`pack_${t.id}`))
        .map((t) => evidencePack(ctx.db, t, ctx.now));
      return { exportedAt: toIso(ctx.now), exportedBy: user.name, packs };
    },
  },

  // ---- reports
  {
    method: "GET",
    path: "/reports/savings",
    auth: "any",
    summary:
      "Monthly savings report computed from delivered tasks. ?month=YYYY-MM (default: latest) ?orgId= (console)",
    response: SavingsReportSchema,
    handler: (ctx) => {
      const orgId = portalOrgId(ctx);
      // Default: the last complete calendar month (the current month is still partial).
      const d = new Date(ctx.now);
      const lastFull = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))
        .toISOString()
        .slice(0, 7);
      return savingsReportFor(ctx.db, orgId, ctx.query.get("month") ?? lastFull, ctx.now);
    },
  },
  {
    method: "GET",
    path: "/reports/sla",
    auth: "any",
    summary: "SLA report: target vs actual per metric, breaches with reasons. ?orgId= (console)",
    response: SlaReportSchema,
    handler: (ctx) => slaReportFor(ctx.db, portalOrgId(ctx), ctx.now),
  },

  // ---- console: clients & ops
  {
    method: "GET",
    path: "/clients",
    auth: "console",
    summary: "Client list. Margin is only included for delivery managers.",
    response: z.array(ClientSummarySchema),
    handler: (ctx) => {
      const mgr = isManager(requireUser(ctx).role);
      return ctx.db.organizations.map((o) => clientSummary(ctx.db, o.id, mgr, ctx.now));
    },
  },
  {
    method: "GET",
    path: "/clients/:id",
    auth: "console",
    summary: "Client detail: contract, SLA, applications, contacts, recent tasks, integrations.",
    response: ClientDetailSchema,
    handler: (ctx) => {
      const org = ctx.db.organizations.find((o) => o.id === ctx.params.id);
      if (!org) throw new HttpError(404, "Client not found");
      const mgr = isManager(requireUser(ctx).role);
      return {
        client: clientSummary(ctx.db, org.id, mgr, ctx.now),
        contract: ctx.db.contracts.find((c) => c.orgId === org.id) ?? null,
        applications: ctx.db.applications
          .filter((a) => a.orgId === org.id)
          .map((a) => applicationSummary(ctx.db, a.id, ctx.now)),
        contacts: ctx.db.users.filter((u) => u.orgId === org.id),
        tasks: ctx.db.tasks
          .filter((t) => t.orgId === org.id)
          .map((t) => taskListItem(ctx.db, t, ctx.now))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10),
        integrations: ctx.db.integrations.filter((i) => i.orgId === org.id),
      };
    },
  },
  {
    method: "GET",
    path: "/ops",
    auth: "manager",
    summary: "Ops dashboard KPIs and charts (delivery manager only).",
    response: OpsDashboardSchema,
    handler: (ctx) => opsDashboard(ctx.db, ctx.now),
  },
  {
    method: "GET",
    path: "/engineers",
    auth: "console",
    summary: "ForgePilot engineers (for assignee pickers).",
    response: z.array(UserSchema),
    handler: (ctx) =>
      ctx.db.users.filter((u) => u.role === "fp_engineer" || u.role === "fp_manager"),
  },

  // ---- team
  {
    method: "GET",
    path: "/team",
    auth: "portal",
    summary: "Users in the client organization.",
    response: z.array(UserSchema),
    handler: (ctx) => ctx.db.users.filter((u) => u.orgId === portalOrgId(ctx)),
  },
  {
    method: "POST",
    path: "/team/invite",
    auth: "portal",
    summary: "Invite a user to the client organization (client_admin only).",
    request: InviteUserInputSchema,
    response: UserSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      if (!canManageTeam(user.role))
        throw new HttpError(403, "Only client admins can invite users");
      const input = parseBody(InviteUserInputSchema, ctx.body);
      if (ctx.db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase()))
        throw new HttpError(409, "Someone with that email is already on the team");
      const invited: User = {
        id: newId("u"),
        ...input,
        orgId: user.orgId,
        status: "invited",
        title: "",
      };
      ctx.db.users.push(invited);
      return invited;
    },
  },

  // ---- integrations
  {
    method: "GET",
    path: "/integrations",
    auth: "any",
    summary: "Integration catalog merged with this organization's connections. ?orgId= (console)",
    response: z.array(IntegrationViewSchema),
    handler: (ctx) => {
      const orgId = portalOrgId(ctx);
      return INTEGRATION_PROVIDERS.map((p) => ({
        providerId: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        availability: p.availability,
        scopes: p.scopes,
        connection:
          ctx.db.integrations.find((i) => i.orgId === orgId && i.providerId === p.id) ?? null,
      }));
    },
  },
  {
    method: "POST",
    path: "/integrations/:providerId/connect",
    auth: "portal",
    summary: "Mock OAuth connect for an integration (client_admin only).",
    request: ConnectIntegrationInputSchema,
    response: IntegrationViewSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      if (!canManageTeam(user.role))
        throw new HttpError(403, "Only client admins can change integrations");
      const provider = providerById(ctx.params.providerId);
      if (!provider) throw new HttpError(404, "Unknown integration");
      if (provider.availability !== "available") throw new HttpError(409, "Not available yet");
      const { account } = parseBody(ConnectIntegrationInputSchema, ctx.body);
      const orgId = portalOrgId(ctx);
      let conn = ctx.db.integrations.find((i) => i.orgId === orgId && i.providerId === provider.id);
      if (!conn) {
        conn = {
          id: newId("int"),
          orgId,
          providerId: provider.id,
          status: "connected",
          account,
          connectedAt: toIso(ctx.now),
          scopes: provider.scopes,
        };
        ctx.db.integrations.push(conn);
      } else {
        Object.assign(conn, {
          status: "connected",
          account,
          connectedAt: toIso(ctx.now),
          scopes: provider.scopes,
          error: undefined,
        });
      }
      return {
        providerId: provider.id,
        name: provider.name,
        category: provider.category,
        description: provider.description,
        availability: provider.availability,
        scopes: provider.scopes,
        connection: conn,
      };
    },
  },
  {
    method: "POST",
    path: "/integrations/:providerId/disconnect",
    auth: "portal",
    summary: "Disconnect an integration (client_admin only).",
    response: OkSchema,
    handler: (ctx) => {
      const user = requireUser(ctx);
      if (!canManageTeam(user.role))
        throw new HttpError(403, "Only client admins can change integrations");
      const conn = ctx.db.integrations.find(
        (i) => i.orgId === portalOrgId(ctx) && i.providerId === ctx.params.providerId,
      );
      if (conn)
        Object.assign(conn, { status: "disconnected", connectedAt: null, error: undefined });
      return { ok: true };
    },
  },

  // ---- notifications
  {
    method: "GET",
    path: "/notifications",
    auth: "any",
    summary: "Notifications for the current user's area (portal: their org).",
    response: NotificationListSchema,
    handler: (ctx) => {
      const u = requireUser(ctx);
      const area = areaForRole(u.role);
      return ctx.db.notifications
        .filter((n) => n.audience === area && (area === "console" || n.orgId === u.orgId))
        .sort((a, b) => b.at.localeCompare(a.at));
    },
  },
  {
    method: "POST",
    path: "/notifications/read",
    auth: "any",
    summary: "Mark notifications read. Body: { ids?: string[] } (omit for all).",
    request: z.object({ ids: z.array(z.string()).optional() }),
    response: OkSchema,
    handler: (ctx) => {
      const u = requireUser(ctx);
      const { ids } = parseBody(z.object({ ids: z.array(z.string()).optional() }), ctx.body ?? {});
      const area = areaForRole(u.role);
      ctx.db.notifications.forEach((n) => {
        if (n.audience !== area || (area === "portal" && n.orgId !== u.orgId)) return;
        if (!ids || ids.includes(n.id)) n.read = true;
      });
      return { ok: true };
    },
  },

  // ---- search
  {
    method: "GET",
    path: "/search",
    auth: "any",
    summary: "Global search across clients, applications, repositories and tasks. ?q=",
    response: z.array(SearchResultSchema),
    handler: (ctx) => {
      const u = requireUser(ctx);
      const q = (ctx.query.get("q") ?? "").trim().toLowerCase();
      const area = areaForRole(u.role);
      const orgs = visibleOrgIds(ctx);
      const base = area === "portal" ? "/portal" : "/console";
      const hit = (s: string) => !q || s.toLowerCase().includes(q);
      const out: z.infer<typeof SearchResultSchema>[] = [];
      if (area === "console")
        ctx.db.organizations
          .filter((o) => hit(o.name))
          .forEach((o) =>
            out.push({
              kind: "client",
              id: o.id,
              title: o.name,
              subtitle: o.industry,
              href: `/console/clients/${o.id}`,
            }),
          );
      ctx.db.applications
        .filter((a) => orgs.includes(a.orgId) && hit(a.name))
        .forEach((a) =>
          out.push({
            kind: "application",
            id: a.id,
            title: a.name,
            subtitle: ctx.db.organizations.find((o) => o.id === a.orgId)?.name ?? "",
            href:
              area === "portal" ? `/portal/applications/${a.id}` : `/console/clients/${a.orgId}`,
          }),
        );
      ctx.db.repositories
        .filter((r) => hit(repoName(r.url)))
        .forEach((r) => {
          const s = repositorySummary(ctx.db, r.id);
          if (orgs.includes(s.organizationId))
            out.push({
              kind: "repository",
              id: r.id,
              title: s.name,
              subtitle: s.applicationName,
              href:
                area === "portal"
                  ? `/portal/applications/${r.applicationId}?tab=repositories`
                  : `/console/repositories/${r.id}`,
            });
        });
      ctx.db.tasks
        .filter((t) => orgs.includes(t.orgId) && (hit(t.title) || hit(t.id) || hit(t.source.ref)))
        .forEach((t) =>
          out.push({
            kind: "task",
            id: t.id,
            title: t.title,
            subtitle: `${t.id} · ${t.source.ref}`,
            href: `${base}/${area === "portal" ? "work" : "tasks"}/${t.id}`,
          }),
        );
      return out.slice(0, 40);
    },
  },

  // ---- onboarding
  {
    method: "GET",
    path: "/onboarding/git-repos",
    auth: "portal",
    summary: "Repositories visible after the mock Git OAuth connect. ?provider=&account=",
    response: z.array(GitRepoCandidateSchema),
    handler: (ctx) =>
      gitCandidates(
        ctx.query.get("provider") ?? "github",
        ctx.query.get("account") ?? "acme",
        ctx.now,
      ),
  },
  {
    method: "POST",
    path: "/onboarding",
    auth: "portal",
    summary:
      "Complete onboarding: create organization, contract, applications, repositories and start health scans.",
    request: OnboardingInputSchema,
    response: OnboardingResultSchema,
    handler: (ctx) => {
      const input = parseBody(OnboardingInputSchema, ctx.body);
      const { db, now } = ctx;
      const orgId = newId("org");
      db.organizations.push({
        id: orgId,
        name: input.company.name,
        industry: input.company.industry,
        region: input.company.region,
        tier: input.tier,
        status: "onboarding",
        onboardedAt: toIso(now),
        domain: input.company.contactEmail.split("@")[1],
      });
      const priceByTier = { maintain: 9000, maintain_assure: 12000, full_run: 18000 } as const;
      db.contracts.push({
        id: newId("ctr"),
        orgId,
        tier: input.tier,
        pricePerAppMonthlyUsd: priceByTier[input.tier],
        priorVendorHourlyRateUsd: 50,
        priorVendorBaselineHoursPerAppMonthly: 220,
        slaTargets: {
          criticalCvePatchHours: 72,
          verificationMinutesP90: 15,
          approvalTurnaroundHours: 48,
          slaMetTargetPct: 95,
        },
        startDate: toIso(now).slice(0, 10),
        endDate: toIso(now + 365 * 86_400_000).slice(0, 10),
      });
      const contactId = newId("u");
      db.users.push({
        id: contactId,
        name: input.company.contactName,
        email: input.company.contactEmail,
        role: "client_admin",
        orgId,
        status: "invited",
        title: "Primary contact",
      });
      db.integrations.push({
        id: newId("int"),
        orgId,
        providerId: input.provider,
        status: "connected",
        account: input.account,
        connectedAt: toIso(now),
        scopes: providerById(input.provider)?.scopes ?? [],
      });
      const appIds: string[] = [];
      const repoIds: string[] = [];
      const scanIds: string[] = [];
      const appByName = new Map<string, string>();
      input.mapping.forEach((m, i) => {
        const repo = input.repositories.find((r) => r.fullName === m.repoFullName);
        if (!repo) return;
        let appId = appByName.get(m.applicationName);
        if (!appId) {
          appId = newId("app");
          appByName.set(m.applicationName, appId);
          db.applications.push({
            id: appId,
            orgId,
            name: m.applicationName,
            criticality: m.criticality,
            environments: ["dev", "staging", "prod"],
            ownerUserIds: [contactId],
            tier: input.tier,
          });
          appIds.push(appId);
        }
        const seed = (repo.fullName.length * 13 + i * 7) % 30;
        const dims = {
          dependencies: 50 + seed,
          security: 45 + ((seed * 3) % 40),
          buildStability: 60 + ((seed * 5) % 30),
          tests: 35 + ((seed * 2) % 40),
          docs: 40 + ((seed * 7) % 40),
        };
        const score = Math.round(
          (dims.dependencies + dims.security + dims.buildStability + dims.tests + dims.docs) / 5,
        );
        const repoId = newId("repo");
        const providerHost = {
          github: "github.com",
          gitlab: "gitlab.com",
          bitbucket: "bitbucket.org",
          azure_devops: "dev.azure.com",
        }[input.provider];
        db.repositories.push({
          id: repoId,
          applicationId: appId,
          provider: input.provider,
          url: `https://${providerHost}/${repo.fullName}`,
          language: repo.language,
          defaultBranch: repo.defaultBranch,
          health: { score, ...dims },
          coveragePct: dims.tests - 5,
          flakyTests: seed % 3,
          lastScanAt: toIso(now),
        });
        repoIds.push(repoId);
        const findingsSeed = [
          [
            "security",
            "critical",
            "Critical CVE in base image OpenSSL",
            "Patch base image (72h SLA).",
          ],
          [
            "dependencies",
            "high",
            "Runtime approaching end of support",
            "Schedule LTS upgrade in the first 30 days.",
          ],
          [
            "tests",
            "medium",
            "Low coverage on core module",
            "Generate regression tests for top journeys.",
          ],
          ["docs", "low", "Missing runbook", "Add runbook with rollback steps."],
        ] as const;
        findingsSeed
          .slice(0, 2 + (seed % 3))
          .forEach(([dimension, severity, title, recommendation]) =>
            db.findings.push({
              id: newId("fnd"),
              repositoryId: repoId,
              dimension,
              severity,
              title,
              recommendation,
              status: "open",
              detectedAt: toIso(now),
            }),
          );
        db.healthHistory.push({ applicationId: appId, weekStart: toIso(now).slice(0, 10), score });
        const scanId = newId("scan");
        db.scans.push({
          id: scanId,
          repositoryId: repoId,
          startedAt: toIso(now),
          finishedAt: null,
          status: "running",
          healthScore: null,
          findingsCount: null,
          trigger: "onboarding",
          simulatedEndsAt: now + SCAN_MS + i * 1200,
        });
        scanIds.push(scanId);
      });
      return { organizationId: orgId, applicationIds: appIds, repositoryIds: repoIds, scanIds };
    },
  },
  {
    method: "GET",
    path: "/onboarding/:orgId/status",
    auth: "portal",
    summary: "Onboarding scan progress and, when done, the health report + 90-day plan.",
    response: OnboardingStatusSchema,
    handler: (ctx) => {
      const org = ctx.db.organizations.find((o) => o.id === ctx.params.orgId);
      if (!org) throw new HttpError(404, "Onboarding not found");
      const apps = ctx.db.applications.filter((a) => a.orgId === org.id);
      const repos = ctx.db.repositories.filter((r) => apps.some((a) => a.id === r.applicationId));
      const scans = ctx.db.scans
        .filter((s) => repos.some((r) => r.id === s.repositoryId) && s.trigger === "onboarding")
        .map((s) => ({
          ...s,
          repositoryName: repoName(repos.find((r) => r.id === s.repositoryId)!.url),
        }));
      const done = scans.length > 0 && scans.every((s) => s.status === "completed");
      const progress = scans.length
        ? Math.round(
            scans.reduce((sum, s) => {
              if (s.status === "completed") return sum + 100;
              const start = Date.parse(s.startedAt);
              const end = (s as { simulatedEndsAt?: number }).simulatedEndsAt ?? start + SCAN_MS;
              return sum + Math.min(95, ((ctx.now - start) / (end - start)) * 100);
            }, 0) / scans.length,
          )
        : 0;
      if (done && org.status === "onboarding") org.status = "active";
      const sev = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      return {
        organization: org,
        scans,
        done,
        progressPct: progress,
        applications: apps.map((a) => applicationSummary(ctx.db, a.id, ctx.now)),
        topFindings: ctx.db.findings
          .filter((f) => repos.some((r) => r.id === f.repositoryId))
          .map((f) => ({
            ...f,
            repositoryName: repoName(repos.find((r) => r.id === f.repositoryId)!.url),
          }))
          .sort((a, b) => sev[a.severity] - sev[b.severity])
          .slice(0, 8),
        plan90: [
          {
            window: "Days 0–30",
            items: [
              "Patch all critical CVEs within 72h SLA",
              "Turn on the verification gate for every PR",
              "Baseline regression suite for top 5 journeys",
            ],
          },
          {
            window: "Days 31–60",
            items: [
              "Upgrade runtimes approaching end of support",
              "Raise coverage on low-scoring modules",
              "Fix flaky tests",
            ],
          },
          {
            window: "Days 61–90",
            items: [
              "Batch dependency upgrades monthly",
              "Runbooks for each application",
              "First quarterly savings review",
            ],
          },
        ],
      };
    },
  },

  // ---- demo
  {
    method: "POST",
    path: "/demo/reset",
    auth: "any",
    summary: "Reset all mock data to the seed (demo mode).",
    response: OkSchema,
    handler: () => {
      resetDb();
      return { ok: true };
    },
  },
];

// ---------------------------------------------------------------- dispatcher
function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export interface DispatchResult {
  status: number;
  body: unknown;
  setCookies?: { name: string; value: string }[];
}

export function dispatch(
  method: string,
  path: string,
  query: URLSearchParams,
  body: unknown,
  sessionUserId: string | undefined,
): DispatchResult {
  let db: MockDb;
  try {
    db = getDb();
  } catch (e) {
    // Invalid mock data: fail loudly (FE-03).
    return { status: 500, body: { error: (e as Error).message, kind: "mock_data_invalid" } };
  }
  const candidates = routes.filter((r) => match(r.path, path));
  const route = candidates.find((r) => r.method === method);
  if (!route)
    return {
      status: candidates.length ? 405 : 404,
      body: { error: `No mock route for ${method} ${path}` },
    };
  const user = db.users.find((u) => u.id === sessionUserId) ?? null;
  const ctx: Ctx = { db, user, params: match(route.path, path)!, query, body, now: Date.now() };
  try {
    if (route.auth !== "public") requireUser(ctx);
    if (route.auth === "portal" && user && areaForRole(user.role) !== "portal")
      throw new HttpError(403, "Client portal only");
    if (route.auth === "console" && user && areaForRole(user.role) !== "console")
      throw new HttpError(403, "ForgePilot console only");
    if (route.auth === "manager" && user && !isManager(user.role))
      throw new HttpError(403, "Delivery managers only");
    const result = route.handler(ctx);
    if (process.env.NODE_ENV !== "production") {
      const check = route.response.safeParse(result);
      if (!check.success) {
        return {
          status: 500,
          body: {
            error: `Response for ${method} ${route.path} does not match its schema`,
            details: z.flattenError(check.error),
          },
        };
      }
    }
    return { status: 200, body: result, setCookies: ctx.setCookies };
  } catch (e) {
    if (e instanceof HttpError)
      return { status: e.status, body: { error: e.message, details: e.details } };
    return { status: 500, body: { error: (e as Error).message } };
  }
}
