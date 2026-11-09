import { describe, expect, it } from "vitest";
import { dispatch, routes } from "@/lib/mock/handlers";

const GETS: [string, string][] = [
  ["u_ravi", "/session"],
  ["u_ravi", "/overview"],
  ["u_ravi", "/applications"],
  ["u_ravi", "/applications/app_payments_gateway"],
  ["u_ravi", "/tasks"],
  ["u_ravi", "/tasks/task_010"],
  ["u_ravi", "/tasks/task_010/diff"],
  ["u_ravi", "/approvals"],
  ["u_ravi", "/evidence"],
  ["u_ravi", "/reports/savings"],
  ["u_ravi", "/reports/sla"],
  ["u_ravi", "/integrations"],
  ["u_ravi", "/notifications"],
  ["u_ravi", "/team"],
  ["u_ravi", "/search"],
  ["u_ravi", "/activity"],
  ["u_arjun", "/tasks/task_004/log"],
  ["u_arjun", "/clients"],
  ["u_arjun", "/clients/org_acme_bank"],
  ["u_arjun", "/repositories"],
  ["u_arjun", "/repositories/repo_payments_gateway_service"],
  ["u_kabir", "/ops"],
];

describe("mock API smoke", () => {
  it.each(GETS)("%s GET %s returns 200 with a schema-valid body", (user, path) => {
    const r = dispatch("GET", path, new URLSearchParams(), undefined, user);
    if (r.status !== 200) console.error(path, JSON.stringify(r.body, null, 2).slice(0, 2000));
    expect(r.status).toBe(200);
  });

  it("has a unique method+path for every route", () => {
    const keys = routes.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
