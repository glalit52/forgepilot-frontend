import type { TaskState } from "@/lib/schemas";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "accent";

export const TASK_STATE_TONE: Record<TaskState, Tone> = {
  created: "neutral",
  planned: "neutral",
  plan_approved: "info",
  running: "accent",
  verifying: "accent",
  retrying: "warning",
  escalated: "danger",
  awaiting_review: "warning",
  signed_off: "success",
  pr_open: "warning",
  client_approved: "success",
  merged: "success",
  closed: "neutral",
  failed: "danger",
  rejected: "danger",
};

export type HealthBand = "healthy" | "at_risk" | "poor";

/** ≥80 green, 60–79 amber, <60 red (frontend spec §HealthScore). */
export function healthBand(score: number): HealthBand {
  if (score >= 80) return "healthy";
  if (score >= 60) return "at_risk";
  return "poor";
}

export function healthTone(score: number): Tone {
  const band = healthBand(score);
  return band === "healthy" ? "success" : band === "at_risk" ? "warning" : "danger";
}

export const TERMINAL_STATES: TaskState[] = ["merged", "closed", "failed", "rejected"];
export const DONE_STATES: TaskState[] = ["client_approved", "merged", "closed"];
export const ACTIVE_STATES: TaskState[] = [
  "created",
  "planned",
  "plan_approved",
  "running",
  "verifying",
  "retrying",
  "escalated",
  "awaiting_review",
  "signed_off",
  "pr_open",
];

export function isOpenTask(state: TaskState): boolean {
  return ACTIVE_STATES.includes(state);
}
