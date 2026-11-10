import { beforeEach, describe, expect, it, vi } from "vitest";
import seed from "@/mocks/mock-data.json";
import { loadMockDb, MockDataError, resetDb } from "@/lib/mock/db";
import { dispatch } from "@/lib/mock/handlers";
import { RUN_MS, VERIFY_MS, SCAN_MS } from "@/lib/mock/loop";

const C = (session: string, workspace: string) => ({ session, workspace });
const MAYA = C("u_maya", "ws_lumen");
const get = (path: string, c = MAYA, q = "") =>
  dispatch("GET", path, new URLSearchParams(q), undefined, c);
const post = (path: string, body: unknown, c = MAYA) =>
  dispatch("POST", path, new URLSearchParams(), body, c);
const T0 = Date.parse("2026-11-09T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers({ now: T0 });
  resetDb();
});

const newTask = (overrides = {}) => ({
  repositoryId: "repo_web",
  title: "Add CSV export to reports",
  description: "Users need to export the report table as CSV for finance reconciliation.",
  acceptanceCriteria: ["CSV matches visible columns", "Large exports stream"],
  constraints: [],
  priority: "medium",
  agentId: "agent_claude_lumen",
  targetBranch: "main",
  budgetUsd: 5,
  timeoutMin: 30,
  launch: true,
  ...overrides,
});

describe("mock data validation", () => {
  it("accepts the seed", () => expect(() => loadMockDb(seed)).not.toThrow());
  it("fails loudly on schema errors", () => {
    const bad = structuredClone(seed) as { tasks: { status: string }[] };
    bad.tasks[0].status = "shipped_by_magic";
    expect(() => loadMockDb(bad)).toThrow(MockDataError);
  });
  it("detects cross-tenant references", () => {
    const bad = structuredClone(seed) as { tasks: { id: string; agentId: string | null }[] };
    bad.tasks.find((t) => t.id === "task_001")!.agentId = "agent_claude_nw";
    expect(() => loadMockDb(bad)).toThrow(/cross-tenant/);
  });
});

describe("tenant isolation and permissions", () => {
  it("returns 404 for another workspace's records", () => {
    expect(get("/tasks/task_015", MAYA).status).toBe(404); // Northwind task
    expect(get("/tasks/task_015", C("u_sofia", "ws_northwind")).status).toBe(200);
  });
  it("viewers can read but not act", () => {
    const viewer = C("u_jordan", "ws_lumen");
    expect(get("/overview", viewer).status).toBe(200);
    expect(post("/tasks", newTask(), viewer).status).toBe(403);
  });
  it("approvals need the named role, and requesters can't approve themselves", () => {
    expect(
      post("/approvals/apr_001/decision", { decision: "approved" }, C("u_alex", "ws_lumen")).status,
    ).toBe(403);
    expect(
      post("/approvals/apr_003/decision", { decision: "approved" }, C("u_dev", "ws_lumen")).status,
    ).toBe(403); // owner-only budget, and Dev requested it
  });
});

describe("closed loop (PRD §10)", () => {
  it("task → agent → PR → ShipSafe pass → review-ready; merge only via GitHub; then CodeKeeper rescans", () => {
    const created = post("/tasks", newTask());
    expect(created.status).toBe(200);
    const id = (created.body as { id: string }).id;
    expect((get(`/tasks/${id}`).body as { task: { status: string } }).task.status).toBe("running");

    vi.advanceTimersByTime(RUN_MS + 10);
    const verifying = get(`/tasks/${id}`).body as {
      task: { status: string; pullRequestId: string };
      pullRequest: { author: { type: string } };
    };
    expect(verifying.task.status).toBe("verifying");
    expect(verifying.pullRequest.author.type).toBe("agent");

    vi.advanceTimersByTime(VERIFY_MS + 10);
    const ready = get(`/tasks/${id}`).body as {
      task: { status: string; verified: boolean };
      lifecycle: { key: string; state: string }[];
    };
    expect(ready.task.status).toBe("review_ready");
    expect(ready.task.verified).toBe(true);
    expect(ready.lifecycle.find((s) => s.key === "merge")!.state).toBe("upcoming");

    const prId = verifying.task.pullRequestId;
    // No auto-merge: merging without human review is refused.
    expect(post(`/pull-requests/${prId}/merge`, {}).status).toBe(409);
    expect(post(`/pull-requests/${prId}/review`, { decision: "approved" }).status).toBe(200);
    expect(post(`/pull-requests/${prId}/merge`, {}).status).toBe(200);
    expect((get(`/tasks/${id}`).body as { task: { status: string } }).task.status).toBe(
      "completed",
    );
    const scans = (get("/repositories/repo_web").body as { repository: { scanRunning: boolean } })
      .repository;
    expect(scans.scanRunning).toBe(true);
    vi.advanceTimersByTime(SCAN_MS + 10);
    expect(
      (get("/repositories/repo_web").body as { repository: { scanRunning: boolean } }).repository
        .scanRunning,
    ).toBe(false);
  });

  it("failure → linked bug → fix task on the same PR → retest passes → bug resolved", () => {
    const id = (
      post("/tasks", newTask({ title: "Remember table density preference" })).body as { id: string }
    ).id;
    post(`/tasks/${id}/actions`, { action: "cancel" });
    const id2 = (
      post("/tasks", newTask({ title: "Persist table density preference", launch: false }))
        .body as { id: string }
    ).id;
    expect(post(`/tasks/${id2}/actions`, { action: "launch", simulateFailure: true }).status).toBe(
      200,
    );
    vi.advanceTimersByTime(RUN_MS + VERIFY_MS + 50);
    const failed = get(`/tasks/${id2}`).body as {
      task: { status: string; bugId: string; pullRequestId: string };
    };
    expect(failed.task.status).toBe("failed");
    const bugId = failed.task.bugId;
    expect(bugId).toBeTruthy();

    const fix = post(`/bugs/${bugId}/actions`, { action: "create_fix_task" });
    expect(fix.status).toBe(200);
    const bug = (fix.body as { bug: { status: string; taskId: string } }).bug;
    expect(bug.status).toBe("fix_in_progress");
    vi.advanceTimersByTime(RUN_MS + VERIFY_MS + 50);
    const pr = get(`/pull-requests/${failed.task.pullRequestId}`).body as {
      runs: { status: string; retestOf: string | null }[];
      bugs: { status: string }[];
    };
    expect(pr.runs[0].status).toBe("passed");
    expect(pr.runs[0].retestOf).toBeTruthy();
    expect(pr.bugs.find((b) => b.status === "resolved")).toBeTruthy();
    expect((get(`/tasks/${bug.taskId}`).body as { task: { status: string } }).task.status).toBe(
      "review_ready",
    );
  });

  it("pauses for approval on protected paths and resumes when approved", () => {
    const id = (
      post(
        "/tasks",
        newTask({ title: "Add migration for report indexes", repositoryId: "repo_payments" }),
      ).body as { id: string }
    ).id;
    vi.advanceTimersByTime(RUN_MS * 0.5 + 10);
    const waiting = get(`/tasks/${id}`).body as {
      task: { status: string };
      approvals: { id: string; status: string }[];
    };
    expect(waiting.task.status).toBe("waiting_input");
    const approval = waiting.approvals.find((a) => a.status === "pending")!;
    expect(
      post(`/approvals/${approval.id}/decision`, { decision: "approved" }, C("u_dev", "ws_lumen"))
        .status,
    ).toBe(200);
    expect((get(`/tasks/${id}`).body as { task: { status: string } }).task.status).toBe("running");
  });

  it("caps fix attempts per bug", () => {
    const bugId = "bug_002"; // already has a fix task (task_005)
    for (let i = 0; i < 2; i++) post(`/bugs/${bugId}/actions`, { action: "create_fix_task" });
    const capped = post(`/bugs/${bugId}/actions`, { action: "create_fix_task" });
    expect(capped.status).toBe(409);
    expect((capped.body as { error: string }).error).toMatch(/limit/);
  });

  it("never classifies infrastructure failures as product defects", () => {
    const runs = get("/test-runs", MAYA, "status=errored").body as {
      id: string;
      failureClasses: Record<string, number>;
    }[];
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0].failureClasses.product_defect ?? 0).toBe(0);
    const bugs = get("/bugs").body as { runId: string }[];
    expect(bugs.some((b) => b.runId === runs[0].id)).toBe(false);
  });
});

describe("findings and billing", () => {
  it("creates a policy-validated maintenance task from a finding", () => {
    const f = (
      get("/findings", MAYA, "status=open&category=vulnerability").body as { id: string }[]
    )[0];
    const r = post(`/findings/${f.id}/actions`, { action: "create_task" });
    expect(r.status).toBe(200);
    expect(
      (r.body as { finding: { status: string }; task: { source: string } }).finding.status,
    ).toBe("task_created");
    expect((r.body as { task: { source: string } }).task.source).toBe("codekeeper_finding");
  });
  it("suppression needs an admin, a reason and a policy-bounded expiry", () => {
    const f = (get("/findings", MAYA, "status=open").body as { id: string }[])[0];
    expect(
      post(
        `/findings/${f.id}/actions`,
        { action: "suppress", reason: "Accepted risk for Q1", expiresInDays: 30 },
        C("u_alex", "ws_lumen"),
      ).status,
    ).toBe(403);
    expect(
      post(`/findings/${f.id}/actions`, {
        action: "suppress",
        reason: "Accepted risk for Q1",
        expiresInDays: 400,
      }).status,
    ).toBe(422);
    expect(
      post(`/findings/${f.id}/actions`, {
        action: "suppress",
        reason: "Accepted risk for Q1",
        expiresInDays: 30,
      }).status,
    ).toBe(200);
  });
  it("enforces plan seat limits on downgrade and lets only owners change plans", () => {
    expect(
      post("/billing/plan", { plan: "pro", billingCycle: "monthly" }, C("u_dev", "ws_lumen"))
        .status,
    ).toBe(403);
    const r = post("/billing/plan", { plan: "pro", billingCycle: "monthly" });
    expect(r.status).toBe(409);
    expect((r.body as { error: string }).error).toMatch(/seat/);
    expect(post("/billing/plan", { plan: "business", billingCycle: "annual" }).status).toBe(200);
  });
  it("blocks launches once a hard-capped budget is used up", () => {
    expect(
      post("/billing/budget", { monthlyLimitUsd: 1, hardCap: true, alertAtPct: [80] }).status,
    ).toBe(200);
    expect(post("/tasks", newTask()).status).toBe(402);
  });
});
