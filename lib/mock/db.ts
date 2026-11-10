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

/** Cross-entity checks Zod can't express: every foreign key resolves and tenants never cross. */
export function checkIntegrity(db: MockDb): string[] {
  const problems: string[] = [];
  const ids = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const orgs = ids(db.organizations);
  const users = ids(db.users);
  const projects = ids(db.projects);
  const repos = ids(db.repositories);
  const tasks = ids(db.tasks);
  const sessions = ids(db.sessions);
  const agents = ids(db.agents);
  const prs = ids(db.pullRequests);
  const runs = ids(db.testRuns);
  const suites = ids(db.testSuites);
  const results = ids(db.testResults);
  const ref = (ok: unknown, msg: string) => !ok && problems.push(msg);
  /** Tenant isolation: a child's orgId must equal its parent's (PRD §13.2). */
  const sameOrg = (child: { orgId: string }, parent: { orgId: string } | undefined, msg: string) =>
    parent && child.orgId !== parent.orgId && problems.push(`cross-tenant reference: ${msg}`);

  db.memberships.forEach((m) => {
    ref(orgs.has(m.orgId), `membership → unknown org ${m.orgId}`);
    ref(users.has(m.userId), `membership → unknown user ${m.userId}`);
  });
  db.projects.forEach((p) => ref(orgs.has(p.orgId), `project ${p.id} → unknown org`));
  db.repositories.forEach((r) => {
    ref(projects.has(r.projectId), `repo ${r.id} → unknown project`);
    sameOrg(r, projects.get(r.projectId), `repo ${r.id}`);
  });
  db.agents.forEach((a) => ref(orgs.has(a.orgId), `agent ${a.id} → unknown org`));
  db.policies.forEach((p) => ref(orgs.has(p.orgId), `policy → unknown org ${p.orgId}`));
  db.testSuites.forEach((s) => {
    ref(repos.has(s.repositoryId), `suite ${s.id} → unknown repo`);
    sameOrg(s, repos.get(s.repositoryId), `suite ${s.id}`);
  });
  db.dependencies.forEach((d) =>
    ref(repos.has(d.repositoryId), `dependency ${d.id} → unknown repo`),
  );
  db.findings.forEach((f) => {
    ref(repos.has(f.repositoryId), `finding ${f.id} → unknown repo`);
    sameOrg(f, repos.get(f.repositoryId), `finding ${f.id}`);
    ref(!f.taskId || tasks.has(f.taskId), `finding ${f.id} → unknown task`);
  });
  db.tasks.forEach((t) => {
    ref(repos.has(t.repositoryId), `task ${t.id} → unknown repo ${t.repositoryId}`);
    sameOrg(t, repos.get(t.repositoryId), `task ${t.id}`);
    ref(!t.agentId || agents.has(t.agentId), `task ${t.id} → unknown agent`);
    sameOrg(t, t.agentId ? agents.get(t.agentId) : undefined, `task ${t.id} agent`);
    ref(users.has(t.createdBy), `task ${t.id} → unknown creator`);
    ref(!t.pullRequestId || prs.has(t.pullRequestId), `task ${t.id} → unknown PR`);
  });
  db.sessions.forEach((s) => {
    ref(tasks.has(s.taskId), `session ${s.id} → unknown task`);
    sameOrg(s, tasks.get(s.taskId), `session ${s.id}`);
    ref(agents.has(s.agentId), `session ${s.id} → unknown agent`);
  });
  db.workspaces.forEach((w) =>
    ref(sessions.has(w.sessionId), `workspace ${w.id} → unknown session`),
  );
  db.pullRequests.forEach((p) => {
    ref(repos.has(p.repositoryId), `PR ${p.id} → unknown repo`);
    sameOrg(p, repos.get(p.repositoryId), `PR ${p.id}`);
    ref(!p.taskId || tasks.has(p.taskId), `PR ${p.id} → unknown task`);
    ref(!p.latestRunId || runs.has(p.latestRunId), `PR ${p.id} → unknown run`);
  });
  db.testRuns.forEach((r) => {
    ref(repos.has(r.repositoryId), `run ${r.id} → unknown repo`);
    sameOrg(r, repos.get(r.repositoryId), `run ${r.id}`);
    ref(!r.pullRequestId || prs.has(r.pullRequestId), `run ${r.id} → unknown PR`);
    r.selectedSuites.forEach((s) =>
      ref(suites.has(s.suiteId), `run ${r.id} → unknown suite ${s.suiteId}`),
    );
  });
  db.testResults.forEach((r) => {
    ref(runs.has(r.runId), `result ${r.id} → unknown run`);
    ref(suites.has(r.suiteId), `result ${r.id} → unknown suite`);
  });
  db.bugs.forEach((b) => {
    ref(runs.has(b.runId), `bug ${b.id} → unknown run`);
    ref(results.has(b.resultId), `bug ${b.id} → unknown result`);
    ref(!b.taskId || tasks.has(b.taskId), `bug ${b.id} → unknown task`);
    sameOrg(b, runs.get(b.runId), `bug ${b.id}`);
  });
  db.approvals.forEach((a) => ref(orgs.has(a.orgId), `approval ${a.id} → unknown org`));
  db.integrations.forEach((i) => ref(orgs.has(i.orgId), `integration ${i.id} → unknown org`));
  db.auditLogs.forEach((a) => ref(orgs.has(a.orgId), `audit ${a.id} → unknown org`));
  return problems;
}

export function loadMockDb(raw: unknown): MockDb {
  const parsed = MockDbSchema.safeParse(structuredClone(raw));
  if (!parsed.success) {
    const lines = parsed.error.issues
      .slice(0, 15)
      .map((i) => `  • ${i.path.map(String).join(".")}: ${i.message}`);
    throw new MockDataError(
      `mocks/mock-data.json does not match lib/schemas:\n${lines.join("\n")}`,
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

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/**
 * Shift every timestamp in the seed so the demo story always happens "now":
 * the seed was generated at meta.generatedAt; pending approvals, running
 * work and SLAs would otherwise drift into the past as real time passes.
 */
export function shiftSeedTimes<T>(raw: T, now: number): T {
  const generated = Date.parse((raw as { meta: { generatedAt: string } }).meta.generatedAt);
  // Datetimes move by the exact offset (so "6 minutes ago" stays true);
  // calendar dates (usage days, health weeks) move by whole days.
  const offset = now - generated;
  const dayOffset = Math.round(offset / DAY_MS) * DAY_MS;
  if (Math.abs(offset) < 60_000) return structuredClone(raw);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (DATETIME.test(v)) return toIso(Date.parse(v) + offset);
      if (DATE.test(v)) return toIso(Date.parse(v + "T00:00:00Z") + dayOffset).slice(0, 10);
      return v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(raw) as T;
}

const g = globalThis as unknown as { __fpSaasDb?: MockDb };

export function getDb(): MockDb {
  if (!g.__fpSaasDb) {
    const db = loadMockDb(shiftSeedTimes(seed, Date.now()));
    prepareSimulation(db, Date.now());
    g.__fpSaasDb = db;
  }
  advanceSimulation(g.__fpSaasDb, Date.now());
  return g.__fpSaasDb;
}

export function resetDb(): MockDb {
  g.__fpSaasDb = undefined;
  return getDb();
}

let counter = 0;
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function toIso(ms: number) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function fakeSha(seed: string) {
  let h = 2166136261;
  let out = "";
  for (let i = 0; out.length < 40; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 40);
}
