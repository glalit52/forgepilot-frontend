"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { METER_INFO, PLANS } from "@/lib/domain/plans";
import { formatNumber } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/schemas";

const fmtLimit = (v: number | null, unit = "") => (v === null ? "Unlimited" : `${formatNumber(v)}${unit}`);

const ROWS: { label: string; get: (p: Plan) => React.ReactNode }[] = [
  { label: "Seats", get: (p) => fmtLimit(p.limits.seats) },
  { label: "Projects", get: (p) => fmtLimit(p.limits.projects) },
  { label: "Repositories", get: (p) => fmtLimit(p.limits.repositories) },
  { label: "Agent runtime / month", get: (p) => fmtLimit(p.limits.agentMinutes, " min") },
  { label: "Browser test minutes / month", get: (p) => fmtLimit(p.limits.browserMinutes, " min") },
  { label: "Verification runs / month", get: (p) => fmtLimit(p.limits.testRuns) },
  { label: "Concurrent agent sessions", get: (p) => fmtLimit(p.limits.concurrentSessions) },
  { label: "History", get: (p) => (p.limits.historyDays === null ? "Custom" : `${p.limits.historyDays} days`) },
];

const FEATURES: { label: string; from: Plan["id"] }[] = [
  { label: "ShipSafe PR verification & evidence", from: "free" },
  { label: "CodeKeeper scans & health score", from: "free" },
  { label: "DevPilot agent sessions", from: "free" },
  { label: "Parallel agent sessions", from: "pro" },
  { label: "Slack, Linear & Jira", from: "pro" },
  { label: "Roles, approvals & policies", from: "team" },
  { label: "Audit log", from: "team" },
  { label: "Client workspaces (agencies)", from: "business" },
  { label: "Audit export & custom retention", from: "business" },
  { label: "SSO / SAML & SCIM", from: "enterprise" },
];
const ORDER = PLANS.map((p) => p.id);

export function PricingTable() {
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <div className="mt-10 flex items-center justify-center gap-3 text-sm">
        <Label htmlFor="cycle">Monthly</Label>
        <Switch id="cycle" checked={annual} onCheckedChange={setAnnual} aria-label="Bill annually" />
        <Label htmlFor="cycle">
          Annual <span className="bg-success-soft text-success-foreground ml-1 rounded px-1.5 py-0.5 text-xs">2 months free</span>
        </Label>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {PLANS.map((p) => {
          const price = annual ? p.priceAnnualMonthlyUsd : p.priceMonthlyUsd;
          return (
            <div key={p.id} className={cn("bg-card flex flex-col gap-4 rounded-xl border p-5", p.highlighted && "border-primary ring-primary/20 ring-4")}>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{p.name}</h2>
                  {p.highlighted && <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">Popular</span>}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{p.audience}</p>
              </div>
              <p className="text-3xl font-semibold tabular-nums">
                {price === null ? "Custom" : `$${price}`}
                {price !== null && <span className="text-muted-foreground text-sm font-normal">/mo</span>}
              </p>
              <p className="text-muted-foreground min-h-10 text-sm">{p.tagline}</p>
              <Button variant={p.highlighted ? "default" : "outline"} asChild>
                <Link href={p.id === "enterprise" ? "mailto:sales@forgepilot.example" : "/signup"}>{p.id === "enterprise" ? "Talk to sales" : p.id === "free" ? "Start free" : "Start 14-day trial"}</Link>
              </Button>
              <ul className="flex flex-col gap-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-16 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Plan comparison</caption>
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Compare plans</th>
              {PLANS.map((p) => (
                <th key={p.id} className="px-3 py-3 text-center font-medium">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-t">
                <th scope="row" className="text-muted-foreground px-4 py-2.5 text-left font-normal">
                  {r.label}
                </th>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center tabular-nums">
                    {r.get(p)}
                  </td>
                ))}
              </tr>
            ))}
            {FEATURES.map((f) => (
              <tr key={f.label} className="border-t">
                <th scope="row" className="text-muted-foreground px-4 py-2.5 text-left font-normal">
                  {f.label}
                </th>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center">
                    {ORDER.indexOf(p.id) >= ORDER.indexOf(f.from) ? <CheckIcon className="text-success mx-auto size-4" aria-label="Included" /> : <MinusIcon className="text-muted-foreground mx-auto size-4" aria-label="Not included" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">Metered usage</h2>
          <p className="text-muted-foreground mt-2 text-sm">Beyond your plan&apos;s included quota. Set a hard cap and alerts in Usage & billing, and work stops before spend exceeds it.</p>
          <ul className="mt-4 divide-y rounded-lg border">
            {Object.values(METER_INFO)
              .filter((m) => m.overageUsd > 0)
              .map((m) => (
                <li key={m.label} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>{m.label}</span>
                  <span className="tabular-nums">
                    ${m.overageUsd.toFixed(2)} / {m.unit}
                  </span>
                </li>
              ))}
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">Agent model cost is billed by your provider on your own API key and shown as provider-reported cost. Prices are indicative for this demo.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Questions</h2>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            {[
              ["Can I start with just ShipSafe?", "Yes. Every module works on its own. Most teams start by verifying pull requests, then add agents and maintenance."],
              ["Does ForgePilot merge for me?", "Never automatically. Passing checks mark a PR ready for review; merges happen in GitHub under your branch protection."],
              ["What happens when I hit a limit?", "You see it coming: usage is projected to the end of the period. With a hard cap, new agent runs pause until you raise the budget or the period resets."],
              ["Which agents are supported?", "Claude Code and OpenAI Codex today, through their documented interfaces. More runtimes are added only once their integration is verified."],
            ].map(([q, a]) => (
              <div key={q}>
                <dt className="font-medium">{q}</dt>
                <dd className="text-muted-foreground mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  );
}
