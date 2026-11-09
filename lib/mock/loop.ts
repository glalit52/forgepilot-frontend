/**
 * The closed loop (PRD §10): DevPilot → PR → ShipSafe → bug → fix task → retest
 * → human review → merge (GitHub) → CodeKeeper. Shared by handlers (user actions)
 * and the simulation (time-driven transitions). Every step writes an audit entry.
 */
import type {
  ActorRef,
  Bug,
  MockDb,
  PullRequest,
  Repository,
  Session,
  Task,
  TestResult,
  TestRun,
} from "@/lib/schemas";
import { computeHealthScore, HEALTH_SCORE_VERSION } from "@/lib/domain/health";
import { fakeSha, newId, toIso } from "./db";

export const RUN_MS = Number(process.env.FP_MOCK_RUN_MS ?? 12_000);
export const VERIFY_MS = Number(process.env.FP_MOCK_VERIFY_MS ?? 8_000);
export const SCAN_MS = Number(process.env.FP_MOCK_SCAN_MS ?? 6_000);
export const INDEX_MS = Number(process.env.FP_MOCK_INDEX_MS ?? 4_000);

const PROTECTED_HINT = /migration|workflow|\bci\b|infra/i;

export function audit(db: MockDb, orgId: string, actor: ActorRef, action: string, resource: string, detail = "", at = Date.now()) {
  db.auditLogs.unshift({ id: newId("aud"), orgId, actor, action, resource, at: toIso(at), detail, ip: actor.type === "person" ? "203.0.113.24" : null });
}

export function notify(db: MockDb, orgId: string, kind: string, title: string, body: string, href: string, at = Date.now()) {
  db.notifications.unshift({ id: newId("ntf"), orgId, userId: null, kind, title, body, href, at: toIso(at), read: false });
}

function policyFor(db: MockDb, orgId: string) {
  return db.policies.find((p) => p.orgId === orgId);
}

export function repoName(repo: Repository) {
  return repo.fullName;
}

// ---------------------------------------------------------------- DevPilot
export function startSession(db: MockDb, task: Task, by: ActorRef, opts: { notes?: string; simulateFailure?: boolean; now: number }): Session {
  const agent = db.agents.find((a) => a.id === task.agentId)!;
  const attempt = db.sessions.filter((s) => s.taskId === task.id).length + 1;
  const id = `sess_${task.id.replace(/^task_/, "")}_${attempt}`;
  const needsApproval = PROTECTED_HINT.test(`${task.title} ${task.description}`) && !db.approvals.some((a) => a.context.taskId === task.id && a.status === "approved");
  const session: Session = {
    id,
    taskId: task.id,
    orgId: task.orgId,
    agentId: agent.id,
    attempt,
    status: "running",
    startedAt: toIso(opts.now),
    endedAt: null,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    summary: null,
    changedFiles: [],
    headSha: null,
    waitingFor: null,
    notes: opts.notes ?? null,
    logSeed: Math.floor(opts.now % 10_000),
    simulated: true,
    simulatedEndsAt: opts.now + RUN_MS,
    simulateFailure: opts.simulateFailure ?? false,
    approvalCheckpointAt: needsApproval ? opts.now + Math.round(RUN_MS * 0.45) : undefined,
  };
  db.sessions.push(session);
  const repo = db.repositories.find((r) => r.id === task.repositoryId)!;
  db.workspaces.push({
    id: `wk_${id.replace(/^sess_/, "")}`,
    sessionId: id,
    orgId: task.orgId,
    runtime: "container",
    image: repo.ecosystems[0] === "pypi" ? "forgepilot/runner-py312" : "forgepilot/runner-node22",
    state: "active",
    cpu: 2,
    memoryGb: 4,
    diskGb: 10,
    networkPolicy: "allowlist",
    createdAt: toIso(opts.now),
    cleanupAt: toIso(opts.now + 24 * 3_600_000),
    credentials: "ephemeral, repo-scoped (expires 60 min)",
    baseSha: task.baseSha,
    branch: task.branch,
  });
  task.status = "running";
  audit(db, task.orgId, by, attempt > 1 ? "task.retried" : "task.launched", `task:${task.id}`, `${agent.name} · attempt ${attempt}`, opts.now);
  audit(db, task.orgId, { type: "agent", id: agent.id }, "agent.session_started", `session:${id}`, `workspace ${id.replace(/^sess_/, "wk_")}`, opts.now);
  return session;
}

export function pauseForApproval(db: MockDb, session: Session, now: number) {
  const task = db.tasks.find((t) => t.id === session.taskId)!;
  const policy = policyFor(db, task.orgId);
  const path = /workflow|ci/i.test(task.title) ? ".github/workflows/ci.yml" : "migrations/0043_auto.py";
  const approval = {
    id: newId("apr"),
    orgId: task.orgId,
    action: "modify_protected_path" as const,
    status: "pending" as const,
    title: `Agent wants to write ${path}`,
    context: { taskId: task.id, sessionId: session.id, repositoryId: task.repositoryId, path, diffPreview: `+ # change proposed by ${session.id}` },
    requestedBy: { type: "agent" as const, id: session.agentId, sessionId: session.id },
    requestedAt: toIso(now),
    expiresAt: toIso(now + 24 * 3_600_000),
    approverRole: policy?.approvalRules.find((r) => r.action === "modify_protected_path")?.approverRole ?? "admin",
    decidedBy: null,
    decidedAt: null,
    comment: null,
  };
  db.approvals.unshift(approval);
  session.status = "waiting";
  session.waitingFor = { kind: "approval", approvalId: approval.id };
  session.pausedRemainingMs = Math.max(1000, (session.simulatedEndsAt ?? now) - now);
  session.approvalCheckpointAt = undefined;
  task.status = "waiting_input";
  audit(db, task.orgId, { type: "agent", id: session.agentId }, "approval.requested", `approval:${approval.id}`, approval.title, now);
  notify(db, task.orgId, "approval", "Approval needed: protected path", `${task.title} · ${path}`, "/app/approvals", now);
}

export function resumeSession(db: MockDb, session: Session, now: number) {
  const task = db.tasks.find((t) => t.id === session.taskId)!;
  session.status = "running";
  session.waitingFor = null;
  session.simulated = true;
  session.simulatedEndsAt = now + (session.pausedRemainingMs ?? Math.round(RUN_MS * 0.55));
  session.pausedRemainingMs = undefined;
  task.status = "running";
}

export function endSession(db: MockDb, session: Session, status: "failed" | "cancelled", summary: string, now: number) {
  const task = db.tasks.find((t) => t.id === session.taskId)!;
  session.status = status;
  session.endedAt = toIso(now);
  session.summary = summary;
  session.waitingFor = null;
  session.simulatedEndsAt = undefined;
  const ws = db.workspaces.find((w) => w.sessionId === session.id);
  if (ws) ws.state = "cleaned";
  task.status = status;
  audit(db, task.orgId, { type: "agent", id: session.agentId }, `agent.session_${status}`, `session:${session.id}`, summary, now);
}

export function completeSession(db: MockDb, session: Session, now: number) {
  const task = db.tasks.find((t) => t.id === session.taskId)!;
  const repo = db.repositories.find((r) => r.id === task.repositoryId)!;
  const agent = db.agents.find((a) => a.id === session.agentId)!;
  const minutes = Math.max(1, (now - Date.parse(session.startedAt)) / 60_000);
  const tokens = 60_000 + Math.round(minutes * 23_000);
  session.status = "completed";
  session.endedAt = toIso(now);
  session.tokensIn = Math.round(tokens * 0.8);
  session.tokensOut = Math.round(tokens * 0.2);
  session.costUsd = Math.round(tokens * (agent.provider === "claude_code" ? 0.000011 : 0.000009) * 100) / 100;
  session.headSha = fakeSha(session.id + now);
  const isPy = repo.ecosystems[0] === "pypi";
  session.changedFiles = isPy
    ? [{ path: "app/api/handlers.py", additions: 31, deletions: 8 }, { path: "tests/api/test_handlers.py", additions: 54, deletions: 0 }]
    : [{ path: "src/components/Feature.tsx", additions: 38, deletions: 11 }, { path: "src/components/Feature.test.tsx", additions: 47, deletions: 0 }, { path: "e2e/feature.spec.ts", additions: 22, deletions: 2 }];
  session.summary = `Implemented "${task.title}", added tests for each acceptance criterion and ran them in the workspace.`;
  session.simulatedEndsAt = undefined;
  const ws = db.workspaces.find((w) => w.sessionId === session.id);
  if (ws) ws.state = "cleaned";
  db.usageRecords.push({ orgId: task.orgId, date: toIso(now).slice(0, 10), projectId: task.projectId, meter: "agent_minutes", provider: agent.provider, units: Math.round(minutes * 10) / 10, costUsd: session.costUsd });
  audit(db, task.orgId, { type: "agent", id: agent.id }, "agent.session_completed", `session:${session.id}`, session.summary, now);

  // agent.completed → create or update PR, then trigger ShipSafe (PRD §10.2).
  let pr = task.pullRequestId ? db.pullRequests.find((p) => p.id === task.pullRequestId) : undefined;
  if (!pr && task.bugId) {
    const bug = db.bugs.find((b) => b.id === task.bugId);
    pr = bug?.pullRequestId ? db.pullRequests.find((p) => p.id === bug.pullRequestId) : undefined;
    if (pr) task.pullRequestId = pr.id;
  }
  const additions = session.changedFiles.reduce((s, f) => s + f.additions, 0);
  const deletions = session.changedFiles.reduce((s, f) => s + f.deletions, 0);
  if (pr) {
    pr.headSha = session.headSha;
    pr.additions += additions;
    pr.deletions += deletions;
    pr.checkStatus = "queued";
    audit(db, task.orgId, { type: "agent", id: agent.id }, "pull_request.synchronize", `pr:${pr.id}`, `pushed ${session.headSha.slice(0, 7)} to #${pr.number}`, now);
  } else {
    const number = 400 + db.pullRequests.length;
    pr = {
      id: `pr_${task.id.replace(/^task_/, "")}`,
      orgId: task.orgId,
      repositoryId: repo.id,
      number,
      title: task.title,
      url: `${repo.url}/pull/${number}`,
      author: { type: "agent", id: agent.id, sessionId: session.id },
      openedBy: task.createdBy,
      branch: task.branch,
      baseSha: task.baseSha,
      headSha: session.headSha,
      status: "open",
      openedAt: toIso(now),
      mergedAt: null,
      mergedBy: null,
      aiAuthoredPct: 88,
      additions,
      deletions,
      changedFiles: session.changedFiles.length,
      taskId: task.id,
      checkStatus: "queued",
      reviewers: [],
      reviewState: "review_requested",
      latestRunId: null,
    };
    db.pullRequests.push(pr);
    task.pullRequestId = pr.id;
    audit(db, task.orgId, { type: "agent", id: agent.id }, "pull_request.opened", `pr:${pr.id}`, `#${number} ${task.title}`, now);
  }
  task.status = "verifying";
  const previous = pr.latestRunId ? db.testRuns.find((r) => r.id === pr!.latestRunId) : undefined;
  startTestRun(db, repo, pr, previous ? "pull_request.synchronize" : "pull_request.opened", { now, simulateFailure: session.simulateFailure, retestOf: previous?.id ?? null });
}

// ---------------------------------------------------------------- ShipSafe
export function startTestRun(
  db: MockDb,
  repo: Repository,
  pr: PullRequest | null,
  trigger: string,
  opts: { now: number; simulateFailure?: boolean; retestOf?: string | null; branch?: string },
): TestRun {
  const suites = db.testSuites.filter((s) => s.repositoryId === repo.id && s.enabled);
  const run: TestRun = {
    id: newId("run"),
    orgId: repo.orgId,
    repositoryId: repo.id,
    pullRequestId: pr?.id ?? null,
    trigger,
    headSha: pr?.headSha ?? fakeSha(repo.id + opts.now),
    baseSha: pr?.baseSha ?? repo.indexedSha,
    branch: pr?.branch ?? opts.branch ?? repo.defaultBranch,
    environment: {
      name: pr ? "preview" : "ci-sandbox",
      url: pr ? `https://pr-${pr.number}.preview.example` : null,
      node: repo.ecosystems[0] === "npm" ? "22.11" : null,
      python: repo.ecosystems[0] === "pypi" ? "3.12" : null,
      worker: `ss-worker-${10 + (opts.now % 89)}`,
      region: "us-east",
    },
    status: "running",
    startedAt: toIso(opts.now),
    finishedAt: null,
    durationSec: null,
    selectedSuites: suites.map((s) => ({ suiteId: s.id, reason: s.type === "unit" ? "Always run for any change" : `Changed files match ${s.pathRules[0]}` })),
    retestOf: opts.retestOf ?? null,
    checkRun: { name: "ForgePilot ShipSafe", conclusion: null, detailsUrl: "" },
    totals: { passed: 0, failed: 0, flaky: 0, skipped: 0 },
    billedBrowserMinutes: 0,
    simulatedEndsAt: opts.now + VERIFY_MS,
    simulateFailure: opts.simulateFailure ?? false,
  };
  run.checkRun!.detailsUrl = `/app/shipsafe/runs/${run.id}`;
  db.testRuns.push(run);
  if (pr) {
    pr.latestRunId = run.id;
    pr.checkStatus = "running";
  }
  audit(db, repo.orgId, { type: "system", id: "shipsafe" }, "test_run.started", `run:${run.id}`, `${trigger} · ${run.headSha.slice(0, 7)}`, opts.now);
  return run;
}

export function completeTestRun(db: MockDb, run: TestRun, now: number) {
  const repo = db.repositories.find((r) => r.id === run.repositoryId)!;
  const pr = run.pullRequestId ? db.pullRequests.find((p) => p.id === run.pullRequestId) : undefined;
  const suites = db.testSuites.filter((s) => run.selectedSuites.some((x) => x.suiteId === s.id));
  const fail = !!run.simulateFailure;
  const durationSec = Math.round((now - Date.parse(run.startedAt)) / 1000) + 140;
  const results: TestResult[] = [];
  suites.forEach((s, si) => {
    for (let i = 0; i < 6; i++)
      results.push({ id: newId("res"), runId: run.id, suiteId: s.id, name: `${s.type} › case ${i + 1}`, outcome: "passed", classification: null, durationMs: 80 + ((i + 1) * 337 * (si + 1)) % 3800, retries: 0, error: null, evidence: [], firstFailedAt: null });
  });
  let defect: TestResult | null = null;
  const e2e = suites.find((s) => s.type === "playwright") ?? suites[0];
  if (fail && e2e) {
    defect = {
      id: newId("res"),
      runId: run.id,
      suiteId: e2e.id,
      name: `${e2e.type === "playwright" ? "feature.spec.ts" : "test_feature.py"} › meets acceptance criterion 1`,
      outcome: "failed",
      classification: "product_defect",
      durationMs: 8400,
      retries: 0,
      error: "Expected the saved value to persist after reload, received the default value.",
      evidence: [
        { kind: "screenshot", label: "Failure screenshot", ref: `artifacts/${run.id}/failure.png` },
        { kind: "trace", label: "Playwright trace", ref: `artifacts/${run.id}/trace.zip` },
        { kind: "console", label: "Browser console", ref: `artifacts/${run.id}/console.log` },
      ],
      firstFailedAt: run.startedAt,
    };
    results.push(defect);
  }
  db.testResults.push(...results);
  run.totals = {
    passed: results.filter((r) => r.outcome === "passed").length,
    failed: results.filter((r) => r.outcome === "failed").length,
    flaky: 0,
    skipped: 0,
  };
  run.status = fail ? "failed" : "passed";
  run.finishedAt = toIso(now);
  run.durationSec = durationSec;
  run.billedBrowserMinutes = Math.round((durationSec / 60) * 1.6 * 10) / 10;
  run.checkRun = { name: "ForgePilot ShipSafe", conclusion: fail ? "failure" : "success", detailsUrl: `/app/shipsafe/runs/${run.id}` };
  run.simulatedEndsAt = undefined;
  db.usageRecords.push({ orgId: run.orgId, date: toIso(now).slice(0, 10), projectId: repo.projectId, meter: "browser_minutes", provider: "shipsafe", units: run.billedBrowserMinutes, costUsd: Math.round(run.billedBrowserMinutes * 0.02 * 100) / 100 });
  db.usageRecords.push({ orgId: run.orgId, date: toIso(now).slice(0, 10), projectId: repo.projectId, meter: "test_runs", provider: "shipsafe", units: 1, costUsd: 0 });
  audit(db, run.orgId, { type: "system", id: "shipsafe" }, fail ? "test.failed" : "test.passed", `run:${run.id}`, `${run.totals.passed} passed · ${run.totals.failed} failed`, now);

  if (!pr) return;
  pr.checkStatus = run.status;
  const tasks = db.tasks.filter((t) => t.pullRequestId === pr.id && ["verifying", "running"].includes(t.status));
  if (fail && defect) {
    // test.failed → create linked defect and offer a DevPilot fix task (no auto-loop).
    const bug: Bug = {
      id: newId("bug"),
      orgId: run.orgId,
      repositoryId: repo.id,
      runId: run.id,
      resultId: defect.id,
      pullRequestId: pr.id,
      title: "Saved value does not persist after reload",
      severity: "high",
      status: "open",
      commitSha: run.headSha,
      reproSteps: ["Open the preview URL for this PR", "Change the setting and save", "Reload the page", "The default value is shown instead of the saved one"],
      stackTrace: `Error: expect(received).toBe(expected)\n    at ${defect.name.split(" ›")[0]}:31:18`,
      suspectedCause: "The save handler writes to local state but the request is never awaited.",
      createdAt: toIso(now),
      taskId: null,
      assigneeId: null,
    };
    db.bugs.push(bug);
    tasks.forEach((t) => {
      t.status = "failed";
      if (!t.bugId) t.bugId = bug.id;
    });
    notify(db, run.orgId, "test_failed", `ShipSafe failed on PR #${pr.number}`, `${pr.title} · 1 product defect`, `/app/pull-requests/${pr.id}`, now);
  } else {
    // test.passed → update verification status and notify reviewers. Never merge automatically.
    db.bugs
      .filter((b) => b.pullRequestId === pr.id && b.status === "fix_in_progress")
      .forEach((b) => {
        b.status = "resolved";
        audit(db, run.orgId, { type: "system", id: "shipsafe" }, "bug.resolved", `bug:${b.id}`, `verified by ${run.id}`, now);
      });
    tasks.forEach((t) => (t.status = "review_ready"));
    db.tasks
      .filter((t) => t.bugId && t.status === "verifying" && db.bugs.find((b) => b.id === t.bugId)?.pullRequestId === pr.id)
      .forEach((t) => (t.status = "review_ready"));
    notify(db, run.orgId, "review_ready", `PR #${pr.number} passed ShipSafe`, `${pr.title} · ready for human review`, `/app/pull-requests/${pr.id}`, now);
  }
}

// ---------------------------------------------------------------- CodeKeeper
export function startScan(db: MockDb, repo: Repository, trigger: "manual" | "push" | "schedule" | "onboarding", now: number) {
  const scan = {
    id: newId("scan"),
    repositoryId: repo.id,
    orgId: repo.orgId,
    commitSha: repo.indexedSha,
    status: "running" as const,
    trigger,
    startedAt: toIso(now),
    finishedAt: null,
    findingsCount: null,
    scoreAfter: null,
    scoreDelta: null,
    changes: [],
    config: { ecosystems: repo.ecosystems, checks: ["dependencies", "advisories", "ci", "tests", "docs"] },
    simulatedEndsAt: now + SCAN_MS,
  };
  db.scans.unshift(scan);
  audit(db, repo.orgId, { type: "system", id: "codekeeper" }, "scan.started", `repo:${repo.id}`, trigger, now);
  return scan;
}

export function recomputeHealth(db: MockDb, repo: Repository) {
  const open = db.findings.filter((f) => f.repositoryId === repo.id && (f.status === "open" || f.status === "task_created"));
  const weight = { critical: 30, high: 18, medium: 8, low: 3 } as const;
  const h = {
    dependencies: Math.max(30, 100 - 7 * open.filter((f) => f.category === "outdated" || f.category === "vulnerability").length),
    security: Math.max(20, 100 - open.filter((f) => f.category === "vulnerability").reduce((s, f) => s + weight[f.severity], 0)),
    buildStability: open.some((f) => f.category === "build") ? 74 : 93,
    tests: open.some((f) => f.category === "tests") ? 71 : 88,
    docs: repo.health.docs,
  };
  repo.health = { ...h, score: computeHealthScore(h), scoreVersion: HEALTH_SCORE_VERSION };
}

export function completeScan(db: MockDb, scan: MockDb["scans"][number], now: number) {
  const repo = db.repositories.find((r) => r.id === scan.repositoryId)!;
  const before = repo.health.score;
  recomputeHealth(db, repo);
  const resolved = db.findings.filter((f) => f.repositoryId === repo.id && f.status === "resolved" && Date.parse(f.detectedAt) < now).length;
  scan.status = "completed";
  scan.finishedAt = toIso(now);
  scan.commitSha = repo.indexedSha;
  scan.findingsCount = db.findings.filter((f) => f.repositoryId === repo.id && f.status !== "resolved").length;
  scan.scoreAfter = repo.health.score;
  scan.scoreDelta = repo.health.score - before;
  scan.changes = scan.scoreDelta > 0 ? [`${resolved} finding(s) resolved since the last scan`] : scan.scoreDelta < 0 ? ["New findings matched"] : ["No change"];
  scan.simulatedEndsAt = undefined;
  const week = toIso(now).slice(0, 10);
  const last = db.healthHistory.filter((h) => h.repositoryId === repo.id).at(-1);
  if (last && last.weekStart === week) last.score = repo.health.score;
  else db.healthHistory.push({ repositoryId: repo.id, weekStart: week, score: repo.health.score });
  db.usageRecords.push({ orgId: repo.orgId, date: week, projectId: repo.projectId, meter: "scan_runs", provider: "codekeeper", units: 1, costUsd: 0 });
  audit(db, repo.orgId, { type: "system", id: "codekeeper" }, "scan.completed", `repo:${repo.id}`, `score ${before} → ${repo.health.score}`, now);
}

/** Simulated GitHub merge webhook: GitHub is the source of truth for merge state. */
export function applyMerge(db: MockDb, pr: PullRequest, by: string, now: number) {
  pr.status = "merged";
  pr.mergedAt = toIso(now);
  pr.mergedBy = by;
  const repo = db.repositories.find((r) => r.id === pr.repositoryId)!;
  repo.indexedSha = pr.headSha;
  repo.indexedAt = toIso(now);
  db.tasks
    .filter((t) => t.pullRequestId === pr.id && t.status !== "completed")
    .forEach((t) => {
      t.status = "completed";
      if (t.findingId) {
        const f = db.findings.find((x) => x.id === t.findingId);
        if (f) f.status = "resolved";
      }
    });
  audit(db, pr.orgId, { type: "person", id: by }, "pull_request.merged", `pr:${pr.id}`, `#${pr.number} merged in GitHub`, now);
  // MAINTAIN: CodeKeeper rescans the updated repository.
  startScan(db, repo, "push", now);
}
