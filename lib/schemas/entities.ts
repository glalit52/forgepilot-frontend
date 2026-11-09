import { z } from "zod";
import {
  AgentKindSchema,
  CriticalitySchema,
  EvidenceEventSchema,
  GitProviderSchema,
  HealthDimensionSchema,
  LanguageSchema,
  PrioritySchema,
  RoleSchema,
  SeveritySchema,
  TaskStateSchema,
  TaskTypeSchema,
  TierSchema,
} from "./enums";

const isoDateTime = z.iso.datetime();
const isoDate = z.iso.date();

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  region: z.string(),
  tier: TierSchema,
  headquarters: z.string().optional(),
  domain: z.string().optional(),
  onboardedAt: isoDateTime.optional(),
  status: z.enum(["active", "onboarding", "paused"]).default("active"),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const SlaTargetsSchema = z.object({
  criticalCvePatchHours: z.number().positive(),
  verificationMinutesP90: z.number().positive(),
  approvalTurnaroundHours: z.number().positive(),
  slaMetTargetPct: z.number().min(0).max(100),
});
export type SlaTargets = z.infer<typeof SlaTargetsSchema>;

export const ContractSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  tier: TierSchema,
  pricePerAppMonthlyUsd: z.number().nonnegative(),
  priorVendorHourlyRateUsd: z.number().nonnegative(),
  /** Hours/app/month a prior vendor bills for baseline upkeep (regression testing, patch triage). */
  priorVendorBaselineHoursPerAppMonthly: z.number().nonnegative().default(0),
  slaTargets: SlaTargetsSchema,
  startDate: isoDate,
  endDate: isoDate,
});
export type Contract = z.infer<typeof ContractSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: RoleSchema,
  orgId: z.string().nullable(),
  title: z.string().optional(),
  status: z.enum(["active", "invited"]).default("active"),
});
export type User = z.infer<typeof UserSchema>;

export const ApplicationSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  criticality: CriticalitySchema,
  environments: z.array(z.string()),
  ownerUserIds: z.array(z.string()),
  description: z.string().optional(),
  tier: TierSchema.optional(),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const HealthBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  dependencies: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  buildStability: z.number().min(0).max(100),
  tests: z.number().min(0).max(100),
  docs: z.number().min(0).max(100),
});
export type HealthBreakdown = z.infer<typeof HealthBreakdownSchema>;

export const RepositorySchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  provider: GitProviderSchema,
  url: z.url(),
  language: LanguageSchema,
  defaultBranch: z.string(),
  health: HealthBreakdownSchema,
  coveragePct: z.number().min(0).max(100),
  flakyTests: z.number().int().nonnegative(),
  lastScanAt: isoDateTime,
});
export type Repository = z.infer<typeof RepositorySchema>;

export const PlanSchema = z.object({
  steps: z.array(z.string().min(1)),
  acceptanceCriteria: z.array(z.string().min(1)),
  approvedBy: z.string().nullable(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  applicationId: z.string(),
  orgId: z.string(),
  type: TaskTypeSchema,
  title: z.string(),
  summary: z.string(),
  source: z.object({
    kind: z.enum(["ticket", "scan", "manual"]),
    ref: z.string(),
    url: z.string().optional(),
  }),
  state: TaskStateSchema,
  priority: PrioritySchema,
  slaDueAt: isoDateTime,
  assigneeUserId: z.string().nullable(),
  agent: AgentKindSchema,
  createdAt: isoDateTime,
  aiAuthoredPct: z.number().min(0).max(100),
  plan: PlanSchema,
  estimatedHours: z.number().nonnegative(),
  escalationReason: z.string().optional(),
  manualTakeoverBy: z.string().nullable().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const AgentRunSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  attempt: z.number().int().positive(),
  agent: AgentKindSchema,
  model: z.string(),
  modelVersion: z.string().optional(),
  tokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  durationSec: z.number().nonnegative().nullable(),
  outcome: z.enum(["running", "success", "verification_failed", "stopped", "error"]),
  startedAt: isoDateTime,
  notes: z.string().optional(),
  /** Mock-only: ms since epoch when the simulated run finishes. */
  simulatedEndsAt: z.number().optional(),
  simulateFailure: z.boolean().optional(),
});
export type AgentRun = z.infer<typeof AgentRunSchema>;

export const TestResultSchema = z.object({
  name: z.string(),
  suite: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  durationMs: z.number().nonnegative(),
  flaky: z.boolean().default(false),
});
export type TestResult = z.infer<typeof TestResultSchema>;

export const VerificationRunSchema = z.object({
  id: z.string(),
  agentRunId: z.string(),
  testsRun: z.number().int().nonnegative(),
  testsPassed: z.number().int().nonnegative(),
  testsFailed: z.number().int().nonnegative(),
  securityFindings: z.object({
    critical: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
  }),
  riskScore: z.number().min(0).max(100),
  status: z.enum(["running", "passed", "failed"]),
  durationMin: z.number().nonnegative(),
  startedAt: isoDateTime.optional(),
  coveragePct: z.number().min(0).max(100).optional(),
  testResults: z.array(TestResultSchema).default([]),
  artifacts: z
    .array(
      z.object({
        kind: z.enum(["screenshot", "log", "sbom", "report"]),
        label: z.string(),
        url: z.string(),
      }),
    )
    .default([]),
  scanners: z.array(z.string()).default([]),
});
export type VerificationRun = z.infer<typeof VerificationRunSchema>;

export const PullRequestSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  number: z.number().int().positive(),
  url: z.url(),
  status: z.enum(["open", "merged", "closed"]),
  aiAuthoredPct: z.number().min(0).max(100),
  openedAt: isoDateTime,
});
export type PullRequest = z.infer<typeof PullRequestSchema>;

export const ApprovalSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  approverUserId: z.string(),
  decision: z.enum(["approved", "changes_requested"]),
  at: isoDateTime,
  comment: z.string(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const ActorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("person"), id: z.string() }),
  /** Agent ids look like `claude_code:claude-sonnet`. */
  z.object({ type: z.literal("agent"), id: z.string() }),
  z.object({ type: z.literal("system"), id: z.string() }),
]);
export type Actor = z.infer<typeof ActorSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  event: EvidenceEventSchema,
  actor: ActorSchema,
  at: isoDateTime,
  payload: z.record(z.string(), z.unknown()),
  hash: z.string(),
  prevHash: z.string().nullable(),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const FindingSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  dimension: HealthDimensionSchema,
  severity: SeveritySchema,
  title: z.string(),
  recommendation: z.string(),
  status: z.enum(["open", "in_progress", "resolved"]),
  detectedAt: isoDateTime,
});
export type Finding = z.infer<typeof FindingSchema>;

export const ScanSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  startedAt: isoDateTime,
  finishedAt: isoDateTime.nullable(),
  status: z.enum(["running", "completed", "failed"]),
  healthScore: z.number().min(0).max(100).nullable(),
  findingsCount: z.number().int().nonnegative().nullable(),
  trigger: z.enum(["scheduled", "manual", "onboarding"]),
  /** Mock-only: ms since epoch when the simulated scan finishes. */
  simulatedEndsAt: z.number().optional(),
});
export type Scan = z.infer<typeof ScanSchema>;

export const HealthSnapshotSchema = z.object({
  applicationId: z.string(),
  weekStart: isoDate,
  score: z.number().min(0).max(100),
});
export type HealthSnapshot = z.infer<typeof HealthSnapshotSchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  providerId: z.string(),
  status: z.enum(["connected", "disconnected", "error"]),
  account: z.string(),
  connectedAt: isoDateTime.nullable(),
  scopes: z.array(z.string()),
  error: z.string().optional(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  audience: z.enum(["portal", "console"]),
  orgId: z.string().nullable(),
  title: z.string(),
  body: z.string(),
  href: z.string(),
  at: isoDateTime,
  read: z.boolean(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const MockDbSchema = z.object({
  meta: z
    .object({
      note: z.string(),
      generatedAt: isoDateTime,
      now: isoDateTime.optional(),
      version: z.number().optional(),
      fpEngineerMonthlyCostUsd: z.number().optional(),
    })
    .loose(),
  organizations: z.array(OrganizationSchema),
  contracts: z.array(ContractSchema),
  users: z.array(UserSchema),
  applications: z.array(ApplicationSchema),
  repositories: z.array(RepositorySchema),
  tasks: z.array(TaskSchema),
  agentRuns: z.array(AgentRunSchema),
  verificationRuns: z.array(VerificationRunSchema),
  pullRequests: z.array(PullRequestSchema),
  approvals: z.array(ApprovalSchema),
  evidenceRecords: z.array(EvidenceRecordSchema),
  findings: z.array(FindingSchema),
  scans: z.array(ScanSchema),
  healthHistory: z.array(HealthSnapshotSchema),
  integrations: z.array(IntegrationSchema),
  notifications: z.array(NotificationSchema),
});
export type MockDb = z.infer<typeof MockDbSchema>;
