/** Renders docs/api-contract.md from the mock route table + Zod schemas. */
import { z } from "zod";
import * as S from "@/lib/schemas";
import { routes } from "./handlers";

function buildRegistry() {
  const registry = z.registry<{ id: string }>();
  const names = new Map<z.ZodType, string>();
  for (const [key, value] of Object.entries(S)) {
    if (key.endsWith("Schema") && value instanceof z.ZodType && !names.has(value)) {
      const id = key.replace(/Schema$/, "");
      names.set(value, id);
      registry.add(value, { id });
    }
  }
  return { registry, names };
}

function typeName(schema: z.ZodType, names: Map<z.ZodType, string>): string {
  const named = names.get(schema);
  if (named) return named;
  if (schema instanceof z.ZodArray) {
    const inner = typeName(schema.element as z.ZodType, names);
    return inner === "inline" ? "inline" : `${inner}[]`;
  }
  return "inline";
}

const authLabel = (a: string) => (a === "public" ? "None" : a === "member" ? "Any workspace member" : `Permission \`${a}\``);

export function renderContract(): string {
  const { registry, names } = buildRegistry();
  const defs = z.toJSONSchema(registry, { unrepresentable: "any", io: "output", uri: (id) => `#/schemas/${id}` }).schemas;
  const used = new Set<string>();
  const ref = (schema: z.ZodType) => {
    const n = typeName(schema, names);
    if (n !== "inline") {
      used.add(n.replace(/\[\]$/, ""));
      return `[\`${n}\`](#${n.replace(/\[\]$/, "").toLowerCase()})`;
    }
    return "\n\n```json\n" + JSON.stringify(z.toJSONSchema(schema, { unrepresentable: "any", io: "output" }), null, 2) + "\n```";
  };
  const lines = [
    "# ForgePilot API contract",
    "",
    "> Generated from `lib/mock/handlers.ts` and `lib/schemas`. Do not edit by hand —",
    "> run `UPDATE_CONTRACT=1 pnpm test` to regenerate. `pnpm test` fails if this file is out of date.",
    "",
    "Base URL: `/api/mock` today (set `NEXT_PUBLIC_API_BASE` for the real backend). JSON bodies.",
    'Errors: `{ "error": string, "details"?: unknown }` with 400/401/402 (plan limit)/403/404/409/422.',
    "Auth: mock cookies `fp_session` (user) and `fp_ws` (active workspace). Every route is scoped to the active workspace.",
    "",
    "Guardrails the backend must enforce (not just the UI):",
    "",
    "- **Tenant isolation:** records from another workspace return 404.",
    "- **Least privilege:** permissions per route below; viewers are read-only; approvals need the approver role named on the request and requesters can't approve themselves.",
    "- **No auto-merge:** passing checks set `review_ready`; merge state comes from GitHub.",
    "- **Loop protection:** fix tasks per bug are capped by `policy.maxFixRetries`; retries are capped too.",
    "- **Budgets:** with `hardCap`, launches are refused once the monthly budget is used (402).",
    "- **Commit pinning:** every test run and scan records exact SHAs.",
    "",
    "## Endpoints",
    "",
    "| Method | Path | Auth | Request | Response | Summary |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of routes) {
    const req = r.request ? typeName(r.request, names) : "—";
    const res = typeName(r.response, names);
    const cell = (n: string) => (n === "—" ? "—" : n === "inline" ? "see below" : `\`${n}\``);
    lines.push(`| ${r.method} | \`${r.path}\` | ${authLabel(r.auth)} | ${cell(req)} | ${cell(res)} | ${r.summary.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Endpoint details", "");
  for (const r of routes) {
    lines.push(`### ${r.method} \`${r.path}\``, "", r.summary, "", `- **Auth:** ${authLabel(r.auth)}`);
    if (r.request) lines.push(`- **Request body:** ${ref(r.request)}`);
    lines.push(`- **Response 200:** ${ref(r.response)}`, "");
  }
  const queue = [...used];
  const include = new Set<string>();
  while (queue.length) {
    const id = queue.pop()!;
    if (include.has(id) || !defs[id]) continue;
    include.add(id);
    for (const m of JSON.stringify(defs[id]).matchAll(/#\/schemas\/(\w+)/g)) queue.push(m[1]);
  }
  lines.push("## Schemas", "", "`$ref`s point at other schemas in this section.", "");
  for (const id of [...include].sort()) lines.push(`### ${id}`, "", "```json", JSON.stringify(defs[id], null, 2), "```", "");
  return lines.join("\n");
}
