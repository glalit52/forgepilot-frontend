import { beforeEach, describe, expect, it, vi } from "vitest";
import seed from "@/mocks/mock-data.json";
import { loadMockDb, MockDataError, resetDb } from "@/lib/mock/db";
import { dispatch } from "@/lib/mock/handlers";
import { RUN_MS, VERIFY_MS } from "@/lib/mock/simulation";

const get = (user: string, path: string, q = "") => dispatch("GET", path, new URLSearchParams(q), undefined, user);
const post = (user: string, path: string, body: unknown) => dispatch("POST", path, new URLSearchParams(), body, user);

beforeEach(() => {
  vi.useRealTimers();
  resetDb();
});

describe("mock data validation (FE-03)", () => {
  it("accepts the seed", () => {
    expect(() => loadMockDb(seed)).not.toThrow();
  });
  it("fails loudly on schema errors", () => {
    const bad = structuredClone(seed) as { tasks: { state: string }[] };
    bad.tasks[0].state = "shipped_by_magic";
    expect(() => loadMockDb(bad)).toThrow(MockDataError);
    expect(() => loadMockDb(bad)).toThrow(/tasks\.0\.state/);
  });
  it("fails loudly on broken references", () => {
    const bad = structuredClone(seed) as { tasks: { applicationId: string }[] };
    bad.tasks[0].applicationId = "app_does_not_exist";
    expect(() => loadMockDb(bad)).toThrow(/unknown app/);
  });
});

describe("access control", () => {
  it("requires a session", () => {
    expect(get("nobody", "/tasks").status).toBe(401);
  });
  it("scopes portal users to their organization", () => {
    const tasks = get("u_dan", "/tasks").body as { orgId: string }[];
    expect(tasks.length).toBeGreaterThan(0);
    expect(new Set(tasks.map((t) => t.orgId))).toEqual(new Set(["org_shield_ins"]));
    expect(get("u_dan", "/tasks/task_010").status).toBe(404); // Acme task
  });
  it("blocks portal roles from console endpoints and engineers from ops", () => {
    expect(get("u_ravi", "/clients").status).toBe(403);
    expect(get("u_arjun", "/ops").status).toBe(403);
    expect(get("u_kabir", "/ops").status).toBe(200);
  });
  it("hides margin from engineers", () => {
    const eng = get("u_arjun", "/clients").body as { marginPct: number | null }[];
    const mgr = get("u_kabir", "/clients").body as { marginPct: number | null }[];
    expect(eng.every((c) => c.marginPct === null)).toBe(true);
    expect(mgr.every((c) => typeof c.marginPct === "number")).toBe(true);
  });
});

describe("client approval (FE-08)", () => {
  it("viewer cannot approve", () => {
    const r = post("u_neha", "/tasks/task_010/approval", { decision: "approved" });
    expect(r.status).toBe(403);
  });
  it("approver approves and an EvidenceRecord is appended to the chain", () => {
    const before = (get("u_priya", "/tasks/task_010").body as { evidence: unknown[] }).evidence.length;
    const r = post("u_priya", "/tasks/task_010/approval", { decision: "approved", comment: "" });
    expect(r.status).toBe(200);
    const detail = r.body as { task: { state: string }; evidence: { event: string; actorResolved: { name: string } }[]; chainValid: boolean };
    expect(detail.task.state).toBe("client_approved");
    expect(detail.evidence).toHaveLength(before + 1);
    expect(detail.evidence.at(-1)).toMatchObject({ event: "client_approved", actorResolved: { name: "Priya Shah" } });
    expect(detail.chainValid).toBe(true);
    expect((get("u_priya", "/approvals").body as unknown[]).some((t) => (t as { id: string }).id === "task_010")).toBe(false);
  });
  it("request changes needs a comment", () => {
    expect(post("u_priya", "/tasks/task_010/approval", { decision: "changes_requested", comment: "" }).status).toBe(422);
    expect(post("u_priya", "/tasks/task_010/approval", { decision: "changes_requested", comment: "Keep the old endpoint" }).status).toBe(200);
  });
});

describe("agent workspace journey (FE-10)", () => {
  it("launch → verification passes → sign off → PR opens, with correct actors", () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-09T10:00:00Z") });
    resetDb();
    const launch = post("u_arjun", "/tasks/task_003/actions", { action: "launch" });
    expect(launch.status).toBe(200);
    expect((launch.body as { task: { state: string } }).task.state).toBe("running");

    // Sign-off is impossible before verification.
    expect(post("u_arjun", "/tasks/task_003/actions", { action: "sign_off", reviewedDiff: true }).status).toBe(409);

    vi.advanceTimersByTime(RUN_MS + 10);
    expect((get("u_arjun", "/tasks/task_003").body as { task: { state: string } }).task.state).toBe("verifying");
    vi.advanceTimersByTime(VERIFY_MS + 10);
    const reviewed = get("u_arjun", "/tasks/task_003").body as { task: { state: string; latestVerification: { status: string } } };
    expect(reviewed.task.state).toBe("awaiting_review");
    expect(reviewed.task.latestVerification.status).toBe("passed");

    // Without the "I reviewed the diff" tick, sign-off is refused.
    expect(post("u_arjun", "/tasks/task_003/actions", { action: "sign_off" }).status).toBe(409);
    expect(post("u_arjun", "/tasks/task_003/actions", { action: "sign_off", reviewedDiff: true }).status).toBe(200);
    const pr = post("u_arjun", "/tasks/task_003/actions", { action: "open_pr" });
    const detail = pr.body as { task: { state: string; pullRequest: { number: number } }; evidence: { event: string; actor: { type: string; id: string } }[]; chainValid: boolean };
    expect(detail.task.state).toBe("pr_open");
    expect(detail.task.pullRequest.number).toBeGreaterThan(0);
    const events = detail.evidence.map((e) => [e.event, e.actor.type]);
    expect(events).toEqual(
      expect.arrayContaining([
        ["agent_run_started", "agent"],
        ["verification_passed", "system"],
        ["engineer_signed_off", "person"],
        ["pr_opened", "system"],
      ]),
    );
    expect(detail.chainValid).toBe(true);
  });

  it("escalates after 3 failed attempts", () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-09T10:00:00Z") });
    resetDb();
    // task_022 already has 2 failed runs; it is "failed" → retry is allowed.
    post("u_meera", "/tasks/task_022/actions", { action: "retry", notes: "pin the library", simulateFailure: true });
    vi.advanceTimersByTime(RUN_MS + VERIFY_MS + 50);
    const t = get("u_meera", "/tasks/task_022").body as { task: { state: string } };
    expect(t.task.state).toBe("escalated");
  });

  it("validates new tasks with the shared Zod schema", () => {
    expect(post("u_arjun", "/tasks", { orgId: "org_acme_bank", title: "x" }).status).toBe(422);
    const ok = post("u_arjun", "/tasks", {
      orgId: "org_acme_bank",
      repositoryId: "repo_payments_gateway_service",
      type: "bug_fix",
      title: "Fix flaky checkout test",
      description: "Make the checkout timeout test deterministic.",
      acceptanceCriteria: ["Test passes 50/50 runs"],
      agent: "claude_code",
      priority: "p1",
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ state: "planned", assignee: { id: "u_arjun" } });
  });
});

describe("reports are computed, not hardcoded (FE-13)", () => {
  it("savings = prior vendor (tasks + baseline) − ForgePilot fee", () => {
    const r = get("u_ravi", "/reports/savings", "month=2026-10").body as {
      byType: { hours: number }[];
      totals: { hours: number; priorVendorRateUsd: number; baselineCostUsd: number; priorVendorCostUsd: number; forgePilotFeeUsd: number; savingUsd: number };
    };
    const hours = r.byType.reduce((s, x) => s + x.hours, 0);
    expect(r.totals.hours).toBe(hours);
    expect(r.totals.priorVendorCostUsd).toBe(hours * r.totals.priorVendorRateUsd + r.totals.baselineCostUsd);
    expect(r.totals.savingUsd).toBe(r.totals.priorVendorCostUsd - r.totals.forgePilotFeeUsd);
  });
});
