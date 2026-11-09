import { describe, expect, it } from "vitest";
import { availableActions, canShip, checkAction, nextStateAfterVerification } from "@/lib/domain/workflow";
import { canAccessPath, homeForRole } from "@/lib/domain/roles";
import { taskSlaRisk } from "@/lib/domain/sla";
import { fnv1a64, verifyChain } from "@/lib/domain/hash";
import { healthBand } from "@/lib/domain/status";

describe("workflow rules", () => {
  it("blocks sign-off unless verification passed", () => {
    const r = checkAction("sign_off", { state: "awaiting_review", latestVerification: { status: "failed" }, reviewedDiff: true });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/Verification must pass/);
  });
  it('blocks sign-off unless "I reviewed the diff" is ticked', () => {
    const r = checkAction("sign_off", { state: "awaiting_review", latestVerification: { status: "passed" }, reviewedDiff: false });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/reviewed the diff/);
  });
  it("allows sign-off when verified and reviewed", () => {
    expect(checkAction("sign_off", { state: "awaiting_review", latestVerification: { status: "passed" }, reviewedDiff: true }).allowed).toBe(true);
  });
  it("only allows opening a PR after sign-off", () => {
    expect(checkAction("open_pr", { state: "awaiting_review", latestVerification: { status: "passed" } }).allowed).toBe(false);
    expect(checkAction("open_pr", { state: "signed_off", latestVerification: { status: "passed" } }).allowed).toBe(true);
  });
  it("only launches from an approved plan", () => {
    expect(availableActions({ state: "planned", latestVerification: null })).not.toContain("launch");
    expect(availableActions({ state: "plan_approved", latestVerification: null })).toContain("launch");
  });
  it("never offers merge or ship without verification and sign-off", () => {
    expect(canShip("signed_off", true, true)).toBe(true);
    expect(canShip("signed_off", false, true)).toBe(false);
    expect(canShip("awaiting_review", true, false)).toBe(false);
    expect(availableActions({ state: "pr_open", latestVerification: { status: "passed" } })).not.toContain("open_pr");
  });
  it("retries up to 3 attempts then escalates", () => {
    expect(nextStateAfterVerification(true, 1)).toBe("awaiting_review");
    expect(nextStateAfterVerification(false, 1)).toBe("retrying");
    expect(nextStateAfterVerification(false, 3)).toBe("escalated");
  });
});

describe("roles and route guards", () => {
  it("sends each role to its home", () => {
    expect(homeForRole("client_approver")).toBe("/portal");
    expect(homeForRole("fp_engineer")).toBe("/console");
  });
  it("keeps portal roles out of the console and vice versa", () => {
    expect(canAccessPath("client_admin", "/console/tasks")).toBe(false);
    expect(canAccessPath("fp_engineer", "/portal/approvals")).toBe(false);
    expect(canAccessPath("client_viewer", "/portal/evidence")).toBe(true);
  });
  it("restricts the ops dashboard to managers", () => {
    expect(canAccessPath("fp_engineer", "/console/ops")).toBe(false);
    expect(canAccessPath("fp_manager", "/console/ops")).toBe(true);
  });
});

describe("SLA risk", () => {
  const now = Date.parse("2026-11-09T10:00:00Z");
  it("flags at-risk inside 24h and breached after due", () => {
    expect(taskSlaRisk("running", "2026-11-10T04:00:00Z", now, null)).toBe("at_risk");
    expect(taskSlaRisk("running", "2026-11-09T09:00:00Z", now, null)).toBe("breached");
    expect(taskSlaRisk("running", "2026-11-14T09:00:00Z", now, null)).toBe("ok");
  });
  it("judges delivered work by when the PR opened", () => {
    expect(taskSlaRisk("merged", "2026-11-05T00:00:00Z", now, "2026-11-04T00:00:00Z")).toBe("met");
    expect(taskSlaRisk("merged", "2026-11-05T00:00:00Z", now, "2026-11-06T00:00:00Z")).toBe("missed");
  });
});

describe("evidence hash chain", () => {
  it("is deterministic", () => {
    expect(fnv1a64("abc")).toBe(fnv1a64("abc"));
    expect(fnv1a64("abc")).not.toBe(fnv1a64("abd"));
    expect(fnv1a64("x")).toHaveLength(16);
  });
  it("detects a broken link", () => {
    expect(verifyChain([{ hash: "a", prevHash: null }, { hash: "b", prevHash: "a" }])).toEqual([true, true]);
    expect(verifyChain([{ hash: "a", prevHash: null }, { hash: "b", prevHash: "z" }])).toEqual([true, false]);
  });
});

describe("health bands", () => {
  it("uses ≥80 / 60–79 / <60", () => {
    expect(healthBand(80)).toBe("healthy");
    expect(healthBand(79)).toBe("at_risk");
    expect(healthBand(60)).toBe("at_risk");
    expect(healthBand(59)).toBe("poor");
  });
});

describe("formatters", () => {
  it("formats date-times with a time zone without throwing", async () => {
    const { formatDateTime, formatDuration } = await import("@/lib/domain/format");
    expect(formatDateTime("2026-11-09T10:00:00Z")).toMatch(/2026/);
    expect(formatDuration(3 * 3600 + 14 * 60)).toBe("3h 14m");
    expect(formatDuration(-90)).toBe("1m");
  });
});
