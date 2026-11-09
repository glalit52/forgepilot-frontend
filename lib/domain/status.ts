import type { FailureClass, SessionStatus, Severity, TaskStatus, TestRunStatus } from "@/lib/schemas";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "accent";

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  draft: "neutral",
  queued: "neutral",
  running: "accent",
  waiting_input: "warning",
  verifying: "info",
  review_ready: "success",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

export const SESSION_STATUS_TONE: Record<SessionStatus, Tone> = {
  queued: "neutral",
  running: "accent",
  waiting: "warning",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};
export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  queued: "Queued",
  running: "Running",
  waiting: "Waiting for input",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const RUN_STATUS_TONE: Record<TestRunStatus, Tone> = {
  queued: "neutral",
  running: "accent",
  passed: "success",
  failed: "danger",
  errored: "warning",
};
export const RUN_STATUS_LABEL: Record<TestRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
  errored: "Infra error",
};

export const SEVERITY_TONE: Record<Severity, Tone> = { critical: "danger", high: "danger", medium: "warning", low: "neutral" };

export const FAILURE_CLASS_LABEL: Record<FailureClass, string> = {
  product_defect: "Product defect",
  test_defect: "Test defect",
  environment: "Environment",
  flaky: "Flaky",
  infrastructure: "Infrastructure",
};
export const FAILURE_CLASS_TONE: Record<FailureClass, Tone> = {
  product_defect: "danger",
  test_defect: "warning",
  environment: "info",
  flaky: "warning",
  infrastructure: "neutral",
};
export const FAILURE_CLASS_HELP: Record<FailureClass, string> = {
  product_defect: "The application behaved incorrectly. This is a real bug.",
  test_defect: "The test itself is wrong or out of date.",
  environment: "The preview environment wasn't ready or misconfigured.",
  flaky: "Failed then passed on retry. Not counted as a defect.",
  infrastructure: "ForgePilot worker problem. Never blamed on your change; reruns are free.",
};
