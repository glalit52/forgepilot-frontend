"use client";
import { useEffect, useState } from "react";
import type { Agent, ResolvedActor, TaskSource, User } from "@/lib/schemas";

/** Agent session costs are small; show cents (formatUsd rounds to whole dollars). */
const usdCents = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function formatCost(n: number) {
  return usdCents.format(n);
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
export function formatTokens(n: number) {
  return compact.format(n);
}

export function agentActor(agent: Pick<Agent, "id" | "name" | "model">): ResolvedActor {
  return { type: "agent", id: agent.id, name: agent.name, detail: agent.model };
}

export function personActor(user: Pick<User, "id" | "name" | "title">): ResolvedActor {
  return { type: "person", id: user.id, name: user.name, detail: user.title };
}

/** Short labels for the source chip next to a task title. */
export const SOURCE_SHORT: Record<TaskSource, string> = {
  manual: "Manual",
  github_issue: "GitHub issue",
  linear: "Linear",
  jira: "Jira",
  shipsafe_failure: "ShipSafe failure",
  codekeeper_finding: "CodeKeeper finding",
};

/** Ticks every `ms` so elapsed times keep moving between polls. */
export function useNow(ms = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, active]);
  return now;
}

/** Seconds a session has run (ended or still going). */
export function sessionSeconds(s: { startedAt: string; endedAt: string | null }, now: number) {
  const end = s.endedAt ? Date.parse(s.endedAt) : now;
  return Math.max(0, (end - Date.parse(s.startedAt)) / 1000);
}
