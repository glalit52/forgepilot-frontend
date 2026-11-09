/**
 * Time-based simulation for the mock API. Instead of background timers, the
 * DB is "advanced" on every request: runs whose simulated end has passed
 * complete, verification results land and tasks move state.
 * Durations are short so demos and Playwright journeys stay fast.
 */
import type { AgentRun, MockDb, TestResult } from "@/lib/schemas";
import { nextStateAfterVerification } from "@/lib/domain/workflow";
import { appendEvidence, toIso } from "./evidence";

export const RUN_MS = Number(process.env.FP_MOCK_RUN_MS ?? 9000);
export const VERIFY_MS = Number(process.env.FP_MOCK_VERIFY_MS ?? 5000);
export const SCAN_MS = Number(process.env.FP_MOCK_SCAN_MS ?? 6000);
/** Seeded "running" tasks keep streaming for a long time so the demo looks alive. */
const SEED_RUN_MS = 45 * 60_000;

type VerificationWithSim = MockDb["verificationRuns"][number] & { simulatedEndsAt?: number };

export function prepareSimulation(db: MockDb, now: number) {
  for (const task of db.tasks) {
    if (task.state !== "running") continue;
    const run = latestRun(db, task.id);
    if (run && run.outcome === "running") {
      run.startedAt = toIso(now - 90_000);
      run.simulatedEndsAt = now + SEED_RUN_MS;
    }
  }
}

export function latestRun(db: MockDb, taskId: string): AgentRun | undefined {
  return db.agentRuns
    .filter((r) => r.taskId === taskId)
    .sort((a, b) => a.attempt - b.attempt)
    .at(-1);
}

function agentActor(run: AgentRun) {
  return { type: "agent" as const, id: `${run.agent}:${run.model}` };
}

function buildTests(seed: number, failed: number): TestResult[] {
  const names = [
    ["unit", "applies change without altering public API"],
    ["unit", "handles null and empty inputs"],
    ["integration", "persists and reads back records"],
    ["integration", "retries on transient upstream errors"],
    ["contract", "response schema unchanged for v1 clients"],
    ["e2e", "critical user journey completes"],
    ["e2e", "error message shown on timeout"],
    ["security", "no new high/critical findings"],
  ];
  return names.map(([suite, name], i) => ({
    name,
    suite,
    status: i >= names.length - failed ? "failed" : "passed",
    durationMs: 120 + ((seed * (i + 3)) % 3900),
    flaky: false,
  }));
}

export function advanceSimulation(db: MockDb, now: number) {
  // 1) Agent runs that finished → start verification.
  for (const run of db.agentRuns) {
    if (run.outcome !== "running" || !run.simulatedEndsAt || now < run.simulatedEndsAt) continue;
    const task = db.tasks.find((t) => t.id === run.taskId);
    if (!task || task.state !== "running") continue;
    const endedAt = run.simulatedEndsAt;
    run.durationSec = Math.round((endedAt - Date.parse(run.startedAt)) / 1000);
    run.tokens = 60_000 + ((run.durationSec * 911) % 140_000);
    run.costUsd = Math.round(run.tokens * 0.000009 * 100) / 100;
    run.outcome = run.simulateFailure ? "verification_failed" : "success";
    const seed = run.tokens;
    const failed = run.simulateFailure ? 2 : 0;
    const tests = buildTests(seed, failed);
    const testsRun = 96 + (seed % 120);
    const ver: VerificationWithSim = {
      id: `ver_${run.id}`,
      agentRunId: run.id,
      testsRun,
      testsPassed: testsRun - failed,
      testsFailed: failed,
      securityFindings: { critical: 0, high: run.simulateFailure ? 1 : 0, medium: seed % 3 },
      riskScore: run.simulateFailure ? 71 : 18 + (seed % 30),
      status: "running",
      durationMin: Math.max(1, Math.round(VERIFY_MS / 60_000)),
      startedAt: toIso(endedAt),
      coveragePct: 55 + (seed % 30),
      testResults: tests,
      artifacts: [
        { kind: "screenshot", label: "Before / after: key screen", url: "#mock-screenshot" },
        { kind: "log", label: "Full test log", url: "#mock-log" },
        { kind: "sbom", label: "SBOM (CycloneDX)", url: "#mock-sbom" },
      ],
      scanners: ["Semgrep", "Trivy", "OSV-Scanner"],
      simulatedEndsAt: endedAt + VERIFY_MS,
    };
    db.verificationRuns.push(ver);
    task.state = "verifying";
  }

  // 2) Verifications that finished → result + task transition.
  for (const v of db.verificationRuns as VerificationWithSim[]) {
    if (v.status !== "running" || !v.simulatedEndsAt || now < v.simulatedEndsAt) continue;
    const run = db.agentRuns.find((r) => r.id === v.agentRunId);
    const task = run && db.tasks.find((t) => t.id === run.taskId);
    if (!run || !task) continue;
    const passed =
      v.testsFailed === 0 && v.securityFindings.critical + v.securityFindings.high === 0;
    v.status = passed ? "passed" : "failed";
    appendEvidence(
      db,
      task.id,
      passed ? "verification_passed" : "verification_failed",
      { type: "system", id: "verification-engine" },
      {
        verificationId: v.id,
        testsPassed: v.testsPassed,
        testsFailed: v.testsFailed,
        riskScore: v.riskScore,
      },
      v.simulatedEndsAt,
    );
    const attempts = db.agentRuns.filter((r) => r.taskId === task.id).length;
    task.state = nextStateAfterVerification(passed, attempts);
    if (task.state === "escalated") {
      task.escalationReason = `Verification failed on ${attempts} attempts. Needs an engineer.`;
      appendEvidence(
        db,
        task.id,
        "escalated",
        { type: "system", id: "forgepilot" },
        { attempts },
        v.simulatedEndsAt + 1,
      );
    }
    delete v.simulatedEndsAt;
  }

  // 3) Scans that finished.
  for (const scan of db.scans) {
    if (scan.status !== "running" || !scan.simulatedEndsAt || now < scan.simulatedEndsAt) continue;
    const repo = db.repositories.find((r) => r.id === scan.repositoryId);
    if (!repo) continue;
    const bump = (n: number, d: number) => Math.max(0, Math.min(100, n + d));
    const seed = repo.id.length + (Math.round(scan.simulatedEndsAt / 1000) % 5);
    if (scan.trigger === "manual") {
      repo.health = {
        dependencies: bump(repo.health.dependencies, 2),
        security: bump(repo.health.security, seed % 2 ? 3 : 1),
        buildStability: bump(repo.health.buildStability, 1),
        tests: bump(repo.health.tests, 2),
        docs: repo.health.docs,
        score: 0,
      };
      const h = repo.health;
      h.score = Math.round((h.dependencies + h.security + h.buildStability + h.tests + h.docs) / 5);
    }
    repo.lastScanAt = toIso(scan.simulatedEndsAt);
    scan.status = "completed";
    scan.finishedAt = toIso(scan.simulatedEndsAt);
    scan.healthScore = repo.health.score;
    scan.findingsCount = db.findings.filter(
      (f) => f.repositoryId === repo.id && f.status !== "resolved",
    ).length;
    delete scan.simulatedEndsAt;
  }
}

export { agentActor };
