import type { TaskState } from "@/lib/schemas";
import type { TaskSlaRisk } from "@/lib/schemas";
import { DONE_STATES } from "./status";

export const AT_RISK_WINDOW_HOURS = 24;

export function taskSlaRisk(
  state: TaskState,
  slaDueAt: string,
  now: number,
  resolvedAt: string | null,
): TaskSlaRisk {
  const due = Date.parse(slaDueAt);
  if (DONE_STATES.includes(state) || state === "pr_open") {
    // Delivered (handed to the client) — compare delivery time to due date.
    const at = resolvedAt ? Date.parse(resolvedAt) : now;
    return at <= due ? "met" : "missed";
  }
  if (state === "failed" || state === "rejected") return now > due ? "missed" : "ok";
  if (now > due) return "breached";
  if (due - now < AT_RISK_WINDOW_HOURS * 3_600_000) return "at_risk";
  return "ok";
}

export function hoursBetween(a: string | number, b: string | number) {
  const ta = typeof a === "number" ? a : Date.parse(a);
  const tb = typeof b === "number" ? b : Date.parse(b);
  return (tb - ta) / 3_600_000;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}
