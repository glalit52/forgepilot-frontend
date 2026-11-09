/** Renders docs/api-contract.md from the mock route table + Zod schemas. */
import { z } from "zod";
import * as S from "@/lib/schemas";
import { routes } from "./handlers";

const AUTH_LABEL = {
  public: "None",
  any: "Any signed-in user",
  portal: "Client portal roles",
  console: "ForgePilot console roles",
  manager: "fp_manager only",
} as const;

/** Every exported `XxxSchema` becomes a named, $ref-able definition. */
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
  if (schema instanceof z.ZodArray) return `${typeName(schema.element as z.ZodType, names)}[]`;
  return "inline";
}

export function renderContract(): string {
  const { registry, names } = buildRegistry();
  const defs = z.toJSONSchema(registry, {
    unrepresentable: "any",
    io: "output",
    uri: (id) => `#/schemas/${id}`,
  }).schemas;

  const used = new Set<string>();
  const ref = (schema: z.ZodType) => {
    const n = typeName(schema, names);
    if (n !== "inline") {
      used.add(n.replace(/\[\]$/, ""));
      return `[\`${n}\`](#${n.replace(/\[\]$/, "").toLowerCase()})`;
    }
    return "```json\n" + JSON.stringify(z.toJSONSchema(schema, { unrepresentable: "any", io: "output" }), null, 2) + "\n```";
  };

  const lines: string[] = [
    "# ForgePilot API contract (Phase 1)",
    "",
    "> Generated from `lib/mock/handlers.ts` and `lib/schemas`. Do not edit by hand —",
    "> run `UPDATE_CONTRACT=1 pnpm test` to regenerate. `pnpm test` fails if this file is out of date.",
    "",
    "Base URL: `/api/mock` today (set `NEXT_PUBLIC_API_BASE` to point the frontend at the real backend).",
    'All bodies are JSON. Errors return `{ "error": string, "details"?: unknown }` with 400/401/403/404/409/422.',
    "Auth: the mock session is the `fp_session` cookie (user id). The real backend should use the identity",
    "provider of choice; the role rules below must be preserved.",
    "",
    "Product rules the backend must enforce (not just the UI):",
    "",
    "- Sign-off requires the latest verification `passed` **and** `reviewedDiff: true` (409 otherwise).",
    "- `open_pr` only after sign-off. Nothing in this API merges: merge happens in the client's Git.",
    "- Every state-changing action appends a hash-chained `EvidenceRecord` with the correct actor (person, agent or system).",
    "- Portal users only ever see their own organization's data. Margin is only returned to `fp_manager`.",
    "",
    "## Endpoints",
    "",
    "| Method | Path | Auth | Request | Response | Summary |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of routes) {
    const req = r.request ? typeName(r.request, names) : "—";
    const res = typeName(r.response, names);
    lines.push(`| ${r.method} | \`${r.path}\` | ${AUTH_LABEL[r.auth]} | ${req === "—" ? "—" : req === "inline" ? "see below" : `\`${req}\``} | ${res === "inline" ? "see below" : `\`${res}\``} | ${r.summary.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Endpoint details", "");
  for (const r of routes) {
    lines.push(`### ${r.method} \`${r.path}\``, "", r.summary, "", `- **Auth:** ${AUTH_LABEL[r.auth]}`);
    if (r.request) lines.push(`- **Request body:** ${ref(r.request)}`);
    lines.push(`- **Response 200:** ${ref(r.response)}`, "");
  }

  // Include referenced schemas and everything they reference.
  const queue = [...used];
  const include = new Set<string>();
  while (queue.length) {
    const id = queue.pop()!;
    if (include.has(id) || !defs[id]) continue;
    include.add(id);
    const text = JSON.stringify(defs[id]);
    for (const m of text.matchAll(/#\/schemas\/(\w+)/g)) queue.push(m[1]);
  }
  lines.push("## Schemas", "", "`$ref`s point at other schemas in this section.", "");
  for (const id of [...include].sort()) {
    lines.push(`### ${id}`, "", "```json", JSON.stringify(defs[id], null, 2), "```", "");
  }
  return lines.join("\n");
}
