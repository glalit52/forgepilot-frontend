/**
 * In-memory mock database (server only). Loaded from mocks/mock-data.json,
 * validated with Zod at startup so bad mock data fails loudly, then mutated
 * by the mock API. Lives on globalThis so it survives dev hot reloads.
 * Reset with POST /api/mock/demo/reset.
 */
import "server-only";
import seed from "@/mocks/mock-data.json";
import { MockDbSchema, type MockDb } from "@/lib/schemas";
import { advanceSimulation, prepareSimulation } from "./simulation";

export class MockDataError extends Error {}

function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return error.issues
    .slice(0, 15)
    .map((i) => `  • ${i.path.map(String).join(".")}: ${i.message}`)
    .join("\n");
}

/** Cross-entity checks Zod can't express: every foreign key must resolve. */
export function checkIntegrity(db: MockDb): string[] {
  const problems: string[] = [];
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const orgs = ids(db.organizations);
  const users = ids(db.users);
  const apps = ids(db.applications);
  const repos = ids(db.repositories);
  const tasks = ids(db.tasks);
  const runs = ids(db.agentRuns);
  const ref = (ok: boolean, msg: string) => !ok && problems.push(msg);

  db.contracts.forEach((c) => ref(orgs.has(c.orgId), `contract ${c.id} → unknown org ${c.orgId}`));
  db.users.forEach((u) => ref(u.orgId === null || orgs.has(u.orgId), `user ${u.id} → unknown org`));
  db.applications.forEach((a) => {
    ref(orgs.has(a.orgId), `application ${a.id} → unknown org ${a.orgId}`);
    a.ownerUserIds.forEach((o) => ref(users.has(o), `application ${a.id} → unknown owner ${o}`));
  });
  db.repositories.forEach((r) => ref(apps.has(r.applicationId), `repo ${r.id} → unknown app`));
  db.tasks.forEach((t) => {
    ref(repos.has(t.repositoryId), `task ${t.id} → unknown repo ${t.repositoryId}`);
    ref(apps.has(t.applicationId), `task ${t.id} → unknown app ${t.applicationId}`);
    ref(orgs.has(t.orgId), `task ${t.id} → unknown org ${t.orgId}`);
    ref(!t.assigneeUserId || users.has(t.assigneeUserId), `task ${t.id} → unknown assignee`);
  });
  db.agentRuns.forEach((r) => ref(tasks.has(r.taskId), `run ${r.id} → unknown task`));
  db.verificationRuns.forEach((v) =>
    ref(runs.has(v.agentRunId), `verification ${v.id} → unknown run`),
  );
  db.pullRequests.forEach((p) => ref(tasks.has(p.taskId), `PR ${p.id} → unknown task`));
  db.approvals.forEach((a) => {
    ref(tasks.has(a.taskId), `approval ${a.id} → unknown task`);
    ref(users.has(a.approverUserId), `approval ${a.id} → unknown approver`);
  });
  db.evidenceRecords.forEach((e) => {
    ref(tasks.has(e.taskId), `evidence ${e.id} → unknown task`);
    if (e.actor.type === "person") ref(users.has(e.actor.id), `evidence ${e.id} → unknown person`);
  });
  db.findings.forEach((f) => ref(repos.has(f.repositoryId), `finding ${f.id} → unknown repo`));
  db.scans.forEach((s) => ref(repos.has(s.repositoryId), `scan ${s.id} → unknown repo`));
  db.healthHistory.forEach((h) => ref(apps.has(h.applicationId), `health history → unknown app`));
  db.integrations.forEach((i) => ref(orgs.has(i.orgId), `integration ${i.id} → unknown org`));
  return problems;
}

/** Parse + integrity-check raw data. Throws MockDataError with a readable message. */
export function loadMockDb(raw: unknown): MockDb {
  const parsed = MockDbSchema.safeParse(structuredClone(raw));
  if (!parsed.success) {
    throw new MockDataError(
      `mocks/mock-data.json does not match lib/schemas:\n${formatIssues(parsed.error)}`,
    );
  }
  const problems = checkIntegrity(parsed.data);
  if (problems.length) {
    throw new MockDataError(
      `mocks/mock-data.json has broken references:\n${problems
        .slice(0, 15)
        .map((p) => `  • ${p}`)
        .join("\n")}`,
    );
  }
  return parsed.data;
}

const globalForDb = globalThis as unknown as { __fpMockDb?: MockDb };

export function getDb(): MockDb {
  if (!globalForDb.__fpMockDb) {
    const db = loadMockDb(seed);
    prepareSimulation(db, Date.now());
    globalForDb.__fpMockDb = db;
  }
  advanceSimulation(globalForDb.__fpMockDb, Date.now());
  return globalForDb.__fpMockDb;
}

export function resetDb(): MockDb {
  globalForDb.__fpMockDb = undefined;
  return getDb();
}

let counter = 0;
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
