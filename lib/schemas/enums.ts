import { z } from "zod";

export const RoleSchema = z.enum([
  "client_admin",
  "client_approver",
  "client_viewer",
  "fp_engineer",
  "fp_manager",
]);
export type Role = z.infer<typeof RoleSchema>;

export const TierSchema = z.enum(["maintain", "maintain_assure", "full_run"]);
export type Tier = z.infer<typeof TierSchema>;

export const CriticalitySchema = z.enum(["critical", "high", "medium", "low"]);
export type Criticality = z.infer<typeof CriticalitySchema>;

/** Task lifecycle, in order. `failed` and `rejected` are terminal side-exits. */
export const TASK_STATES = [
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
  "client_approved",
  "merged",
  "closed",
  "failed",
  "rejected",
] as const;
export const TaskStateSchema = z.enum(TASK_STATES);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const TaskTypeSchema = z.enum([
  "dependency_upgrade",
  "cve_patch",
  "bug_fix",
  "enhancement",
  "test_coverage",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const PrioritySchema = z.enum(["p0", "p1", "p2", "p3"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const AgentKindSchema = z.enum(["claude_code", "codex", "devin"]);
export type AgentKind = z.infer<typeof AgentKindSchema>;

export const GitProviderSchema = z.enum(["github", "gitlab", "bitbucket", "azure_devops"]);
export type GitProvider = z.infer<typeof GitProviderSchema>;

export const LanguageSchema = z.enum(["java", "dotnet", "typescript", "python", "go", "kotlin"]);
export type Language = z.infer<typeof LanguageSchema>;

export const HealthDimensionSchema = z.enum([
  "dependencies",
  "security",
  "buildStability",
  "tests",
  "docs",
]);
export type HealthDimension = z.infer<typeof HealthDimensionSchema>;

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const EvidenceEventSchema = z.enum([
  "task_created",
  "plan_updated",
  "plan_approved",
  "agent_run_started",
  "agent_run_stopped",
  "retry_requested",
  "manual_takeover",
  "verification_passed",
  "verification_failed",
  "escalated",
  "engineer_signed_off",
  "pr_opened",
  "client_approved",
  "client_requested_changes",
  "merged",
  "closed",
]);
export type EvidenceEvent = z.infer<typeof EvidenceEventSchema>;
