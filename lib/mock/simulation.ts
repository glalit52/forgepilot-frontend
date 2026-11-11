/**
 * Time-based simulation. Instead of background timers, the DB is "advanced"
 * on every request: sessions, test runs, scans and repository indexing whose
 * simulated end has passed are completed via the closed-loop helpers.
 */
import type { MockDb } from "@/lib/schemas";
import { toIso } from "./db";
import { completeScan, completeSession, completeTestRun, INDEX_MS, pauseForApproval } from "./loop";

/** Seeded "running" work gets realistic timings relative to server start. */
export function prepareSimulation(db: MockDb, now: number) {
  const LONG = 40 * 60_000;
  const plan: Record<string, number> = {
    // One seeded agent session finishes ~1 minute after boot so the loop is visible.
    sess_003_1: 75_000,
  };
  db.sessions.forEach((s) => {
    if (s.status === "running") {
      s.simulated = true;
      s.startedAt = toIso(now - 3 * 60_000);
      s.simulatedEndsAt = now + (plan[s.id] ?? LONG);
    }
    if (s.status === "waiting") {
      s.simulated = true;
      s.startedAt = toIso(now - 9 * 60_000);
      s.pausedRemainingMs = 60_000;
    }
  });
  const runTimes = [25_000, 40_000, 60_000];
  db.testRuns
    .filter((r) => r.status === "running")
    .forEach((r, i) => {
      r.startedAt = toIso(now - 2 * 60_000);
      r.simulatedEndsAt = now + (runTimes[i] ?? 60_000);
    });
}

export function advanceSimulation(db: MockDb, now: number) {
  for (const s of db.sessions) {
    if (!s.simulated || s.status !== "running") continue;
    if (s.approvalCheckpointAt && now >= s.approvalCheckpointAt) {
      pauseForApproval(db, s, s.approvalCheckpointAt);
      continue;
    }
    if (s.simulatedEndsAt && now >= s.simulatedEndsAt) completeSession(db, s, s.simulatedEndsAt);
  }
  for (const r of db.testRuns) {
    if (r.status === "running" && r.simulatedEndsAt && now >= r.simulatedEndsAt)
      completeTestRun(db, r, r.simulatedEndsAt);
  }
  for (const scan of db.scans) {
    if (scan.status === "running" && scan.simulatedEndsAt && now >= scan.simulatedEndsAt)
      completeScan(db, scan, scan.simulatedEndsAt);
  }
  for (const repo of db.repositories) {
    if (repo.indexStatus === "indexing" && repo.indexReadyAt && now >= repo.indexReadyAt) {
      repo.indexStatus = "ready";
      repo.indexedAt = toIso(repo.indexReadyAt);
      repo.indexReadyAt = undefined;
    }
  }
}

export { INDEX_MS };
