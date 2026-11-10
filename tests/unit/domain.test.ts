import { describe, expect, it } from "vitest";
import { checkTaskAction, statusAfterVerification } from "@/lib/domain/workflow";
import { can, meetsRole } from "@/lib/domain/permissions";
import { computeHealthScore, healthBand } from "@/lib/domain/health";
import { hasFeature, isUpgrade, PLANS, planById } from "@/lib/domain/plans";
import { formatDateTime, formatDuration } from "@/lib/domain/format";

describe("task state machine", () => {
  it("launches only drafts/queued tasks with an agent", () => {
    expect(
      checkTaskAction("launch", { status: "draft", attempts: 0, hasAgent: true }).allowed,
    ).toBe(true);
    expect(
      checkTaskAction("launch", { status: "running", attempts: 1, hasAgent: true }).allowed,
    ).toBe(false);
    expect(
      checkTaskAction("launch", { status: "draft", attempts: 0, hasAgent: false }).reason,
    ).toMatch(/agent/);
  });
  it("caps retries and escalates to a human", () => {
    expect(
      checkTaskAction("retry", { status: "failed", attempts: 2, hasAgent: true, maxRetries: 3 })
        .allowed,
    ).toBe(true);
    expect(
      checkTaskAction("retry", { status: "failed", attempts: 4, hasAgent: true, maxRetries: 3 })
        .reason,
    ).toMatch(/human/);
  });
  it("refuses launches when the hard-capped budget is exhausted", () => {
    expect(
      checkTaskAction("launch", {
        status: "draft",
        attempts: 0,
        hasAgent: true,
        budgetRemainingUsd: 0,
      }).reason,
    ).toMatch(/budget/i);
  });
  it("never merges: passing verification only makes a task review-ready; infra errors don't fail it", () => {
    expect(statusAfterVerification("passed")).toBe("review_ready");
    expect(statusAfterVerification("failed")).toBe("failed");
    expect(statusAfterVerification("errored")).toBe("verifying");
  });
});

describe("permissions", () => {
  it("keeps viewers read-only", () => {
    expect(can("viewer", "task.create")).toBe(false);
    expect(can("viewer", "pr.review")).toBe(false);
    expect(can("member", "task.launch")).toBe(true);
  });
  it("reserves governance for admins and money for owners", () => {
    expect(can("member", "approval.decide")).toBe(false);
    expect(can("admin", "approval.decide")).toBe(true);
    expect(can("admin", "billing.manage")).toBe(false);
    expect(can("owner", "billing.manage")).toBe(true);
    expect(meetsRole("admin", "owner")).toBe(false);
    expect(meetsRole("owner", "admin")).toBe(true);
  });
});

describe("health score", () => {
  it("uses the PRD weights and ignores unknown dimensions instead of treating them as healthy", () => {
    const all = computeHealthScore({
      dependencies: 80,
      security: 60,
      buildStability: 100,
      tests: 70,
      docs: 50,
    });
    expect(all).toBe(Math.round(0.2 * 80 + 0.25 * 60 + 0.2 * 100 + 0.2 * 70 + 0.15 * 50));
    const unknownDocs = computeHealthScore({
      dependencies: 80,
      security: 60,
      buildStability: 100,
      tests: 70,
      docs: null,
    });
    expect(unknownDocs).toBe(Math.round((0.2 * 80 + 0.25 * 60 + 0.2 * 100 + 0.2 * 70) / 0.85));
  });
  it("bands at 80 / 60", () => {
    expect(healthBand(80)).toBe("healthy");
    expect(healthBand(79)).toBe("at_risk");
    expect(healthBand(59)).toBe("poor");
  });
});

describe("plans", () => {
  it("matches the PRD price points", () => {
    expect(PLANS.map((p) => p.priceMonthlyUsd)).toEqual([0, 29, 79, 199, 499, null]);
  });
  it("gates governance features by plan", () => {
    expect(hasFeature("pro", "approvals")).toBe(false);
    expect(hasFeature("team", "approvals")).toBe(true);
    expect(hasFeature("team", "auditExport")).toBe(false);
    expect(isUpgrade("team", "business")).toBe(true);
    expect(planById("enterprise").limits.seats).toBeNull();
  });
});

describe("formatters", () => {
  it("formats dates with a time zone and durations", () => {
    expect(formatDateTime("2026-11-09T10:00:00Z")).toMatch(/2026/);
    expect(formatDuration(3 * 3600 + 14 * 60)).toBe("3h 14m");
  });
});
