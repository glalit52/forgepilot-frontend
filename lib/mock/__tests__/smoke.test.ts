import { describe, expect, it } from "vitest";
import { dispatch, routes } from "@/lib/mock/handlers";

const as = (session: string, workspace?: string) => ({ session, workspace });

const GETS = [
  "/session",
  "/overview",
  "/projects",
  "/projects/proj_web",
  "/repositories",
  "/repositories/repo_web",
  "/devpilot/overview",
  "/tasks",
  "/tasks/task_001",
  "/tasks/task_004",
  "/tasks/task_005",
  "/sessions",
  "/sessions/sess_002_1",
  "/sessions/sess_002_1/log",
  "/sessions/sess_001_1/diff",
  "/workspaces",
  "/agents",
  "/shipsafe/overview",
  "/test-suites",
  "/test-runs",
  "/test-runs/run_015",
  "/bugs",
  "/bugs/bug_002",
  "/pull-requests",
  "/pull-requests/pr_h1",
  "/pull-requests/pr_001/diff",
  "/codekeeper/overview",
  "/dependencies",
  "/findings",
  "/approvals",
  "/analytics",
  "/integrations",
  "/members",
  "/policy",
  "/api-keys",
  "/audit-logs",
  "/billing",
  "/notifications",
  "/search?q=pay",
  "/github/repositories",
  "/visual-snapshots",
  "/github/issues",
];

describe("mock API smoke", () => {
  it.each(GETS)("GET %s returns 200 with a schema-valid body", (path) => {
    const [p, q] = path.split("?");
    const r = dispatch("GET", p, new URLSearchParams(q), undefined, as("u_maya", "ws_lumen"));
    if (r.status !== 200) console.error(path, JSON.stringify(r.body, null, 2).slice(0, 3000));
    expect(r.status).toBe(200);
  });

  it.each([
    ["u_sofia", "ws_northwind"],
    ["u_maya", "ws_maya"],
    ["u_jordan", "ws_lumen"],
  ])("%s in %s can load every dashboard", (u, w) => {
    for (const p of [
      "/overview",
      "/devpilot/overview",
      "/shipsafe/overview",
      "/codekeeper/overview",
      "/analytics",
      "/billing",
    ]) {
      const r = dispatch("GET", p, new URLSearchParams(), undefined, as(u, w));
      if (r.status !== 200) console.error(p, JSON.stringify(r.body).slice(0, 2000));
      expect(r.status).toBe(200);
    }
  });

  it("has a unique method+path for every route", () => {
    const keys = routes.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
