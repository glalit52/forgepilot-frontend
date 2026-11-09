import type {
  AgentKind,
  Criticality,
  EvidenceEvent,
  HealthDimension,
  Priority,
  Role,
  TaskState,
  TaskType,
  Tier,
} from "@/lib/schemas";

export const TASK_STATE_LABEL: Record<TaskState, string> = {
  created: "Created",
  planned: "Planned",
  plan_approved: "Plan approved",
  running: "Agent running",
  verifying: "Verifying",
  retrying: "Retrying",
  escalated: "Escalated",
  awaiting_review: "Awaiting review",
  signed_off: "Signed off",
  pr_open: "PR open",
  client_approved: "Client approved",
  merged: "Merged",
  closed: "Closed",
  failed: "Failed",
  rejected: "Changes requested",
};

/** Plain-English state copy for the client portal. */
export const TASK_STATE_CLIENT_COPY: Record<TaskState, string> = {
  created: "Queued — ForgePilot is planning this change.",
  planned: "Planned — an engineer is reviewing the plan.",
  plan_approved: "Plan approved — work starts shortly.",
  running: "In progress — an AI agent is making the change in a sandbox.",
  verifying: "Testing — automated tests and security scans are running.",
  retrying: "Re-working — the first attempt didn't pass every check.",
  escalated: "With an engineer — needs hands-on attention.",
  awaiting_review: "In review — a ForgePilot engineer is checking the change.",
  signed_off: "Signed off — the pull request is being prepared.",
  pr_open: "Waiting for your approval.",
  client_approved: "Approved — it merges in your repository under your branch rules.",
  merged: "Merged into your repository.",
  closed: "Done.",
  failed: "Stopped — needs a decision from you or ForgePilot.",
  rejected: "Sent back with your requested changes.",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  dependency_upgrade: "Upgrade",
  cve_patch: "CVE patch",
  bug_fix: "Bug fix",
  enhancement: "Enhancement",
  test_coverage: "Tests",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  p0: "P0 · Urgent",
  p1: "P1 · High",
  p2: "P2 · Normal",
  p3: "P3 · Low",
};

export const ROLE_LABEL: Record<Role, string> = {
  client_admin: "Client admin",
  client_approver: "Client approver",
  client_viewer: "Client viewer",
  fp_engineer: "ForgePilot engineer",
  fp_manager: "Delivery manager",
};

export const AGENT_LABEL: Record<AgentKind, string> = {
  claude_code: "Claude Code",
  codex: "OpenAI Codex",
  devin: "Devin",
};

export const TIER_LABEL: Record<Tier, string> = {
  maintain: "Maintain",
  maintain_assure: "Maintain + Assure",
  full_run: "Full Run",
};

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const HEALTH_DIMENSION_LABEL: Record<HealthDimension, string> = {
  dependencies: "Dependencies",
  security: "Security",
  buildStability: "Build stability",
  tests: "Tests",
  docs: "Docs",
};

export const EVIDENCE_EVENT_LABEL: Record<EvidenceEvent, string> = {
  task_created: "Task created",
  plan_updated: "Plan updated",
  plan_approved: "Plan approved",
  agent_run_started: "Agent run started",
  agent_run_stopped: "Agent run stopped",
  retry_requested: "Retry requested",
  manual_takeover: "Taken over manually",
  verification_passed: "Verification passed",
  verification_failed: "Verification failed",
  escalated: "Escalated to engineer",
  engineer_signed_off: "Engineer signed off",
  pr_opened: "Pull request opened",
  client_approved: "Client approved",
  client_requested_changes: "Client requested changes",
  merged: "Merged",
  closed: "Closed",
};

export const LANGUAGE_LABEL: Record<string, string> = {
  java: "Java",
  dotnet: ".NET",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  kotlin: "Kotlin",
};

export function repoName(url: string): string {
  const parts = url.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] ?? url;
}
