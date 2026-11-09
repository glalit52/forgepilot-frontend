/**
 * Response/request shapes for the mock API (and, later, the real one).
 * Each is built from the entity schemas so types never drift.
 */
import { z } from "zod";
import {
  AgentRunSchema,
  ApplicationSchema,
  ApprovalSchema,
  ContractSchema,
  EvidenceRecordSchema,
  FindingSchema,
  HealthBreakdownSchema,
  HealthSnapshotSchema,
  IntegrationSchema,
  NotificationSchema,
  OrganizationSchema,
  PullRequestSchema,
  RepositorySchema,
  ScanSchema,
  TaskSchema,
  UserSchema,
  VerificationRunSchema,
} from "./entities";
import {
  AgentKindSchema,
  CriticalitySchema,
  GitProviderSchema,
  LanguageSchema,
  PrioritySchema,
  TaskStateSchema,
  TaskTypeSchema,
  TierSchema,
} from "./enums";

export const SlaStatusSchema = z.enum(["on_track", "at_risk", "breached"]);
export type SlaStatus = z.infer<typeof SlaStatusSchema>;

export const TaskSlaRiskSchema = z.enum(["ok", "at_risk", "breached", "met", "missed"]);
export type TaskSlaRisk = z.infer<typeof TaskSlaRiskSchema>;

export const ResolvedActorSchema = z.object({
  type: z.enum(["person", "agent", "system"]),
  id: z.string(),
  name: z.string(),
  /** Role/title for people, model for agents. */
  detail: z.string(),
});
export type ResolvedActor = z.infer<typeof ResolvedActorSchema>;

export const EvidenceItemSchema = EvidenceRecordSchema.extend({
  actorResolved: ResolvedActorSchema,
  hashValid: z.boolean(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ---------------------------------------------------------------- session
export const SessionSchema = z.object({
  user: UserSchema,
  organization: OrganizationSchema.nullable(),
  personas: z.array(UserSchema),
});
export type Session = z.infer<typeof SessionSchema>;

export const SwitchSessionInputSchema = z.object({ userId: z.string() });

// ---------------------------------------------------------------- applications
export const ApplicationSummarySchema = ApplicationSchema.extend({
  organizationName: z.string(),
  repoCount: z.number().int(),
  healthScore: z.number(),
  healthDelta: z.number(),
  openTasks: z.number().int(),
  slaStatus: SlaStatusSchema,
  languages: z.array(LanguageSchema),
});
export type ApplicationSummary = z.infer<typeof ApplicationSummarySchema>;

// ---------------------------------------------------------------- tasks
export const TaskListItemSchema = TaskSchema.extend({
  applicationName: z.string(),
  organizationName: z.string(),
  repositoryName: z.string(),
  assignee: UserSchema.nullable(),
  latestRun: AgentRunSchema.nullable(),
  latestVerification: VerificationRunSchema.nullable(),
  pullRequest: PullRequestSchema.nullable(),
  slaRisk: TaskSlaRiskSchema,
  lastEvent: EvidenceItemSchema.nullable(),
  attempts: z.number().int(),
});
export type TaskListItem = z.infer<typeof TaskListItemSchema>;

export const TaskDetailSchema = z.object({
  task: TaskListItemSchema,
  application: ApplicationSchema,
  repository: RepositorySchema,
  organization: OrganizationSchema,
  contract: ContractSchema.nullable(),
  runs: z.array(AgentRunSchema),
  verifications: z.array(VerificationRunSchema),
  approvals: z.array(ApprovalSchema.extend({ approver: UserSchema.nullable() })),
  evidence: z.array(EvidenceItemSchema),
  chainValid: z.boolean(),
  signOff: z.object({ by: z.string(), at: z.string() }).nullable(),
});
export type TaskDetail = z.infer<typeof TaskDetailSchema>;

export const TaskFiltersSchema = z.object({
  orgId: z.string().optional(),
  applicationId: z.string().optional(),
  repositoryId: z.string().optional(),
  type: TaskTypeSchema.optional(),
  state: TaskStateSchema.optional(),
  assigneeUserId: z.string().optional(),
  agent: AgentKindSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  mine: z.boolean().optional(),
});
export type TaskFilters = z.infer<typeof TaskFiltersSchema>;

export const NewTaskInputSchema = z.object({
  orgId: z.string().min(1, "Choose a client"),
  repositoryId: z.string().min(1, "Choose a repository"),
  type: TaskTypeSchema,
  title: z.string().trim().min(5, "Title needs at least 5 characters").max(120),
  description: z.string().trim().min(10, "Describe the change in at least 10 characters"),
  acceptanceCriteria: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one acceptance criterion"),
  agent: AgentKindSchema,
  priority: PrioritySchema,
  assigneeUserId: z.string().nullable().optional(),
});
export type NewTaskInput = z.infer<typeof NewTaskInputSchema>;

export const TaskActionSchema = z.enum([
  "save_plan",
  "approve_plan",
  "launch",
  "stop",
  "retry",
  "take_over",
  "sign_off",
  "open_pr",
  "escalate",
  "close",
]);
export type TaskAction = z.infer<typeof TaskActionSchema>;

export const TaskActionInputSchema = z.object({
  action: TaskActionSchema,
  notes: z.string().optional(),
  reviewedDiff: z.boolean().optional(),
  simulateFailure: z.boolean().optional(),
  plan: z
    .object({ steps: z.array(z.string().min(1)), acceptanceCriteria: z.array(z.string().min(1)) })
    .optional(),
});
export type TaskActionInput = z.infer<typeof TaskActionInputSchema>;

export const ApprovalInputSchema = z
  .object({
    decision: z.enum(["approved", "changes_requested"]),
    comment: z.string().trim().default(""),
  })
  .refine((v) => v.decision === "approved" || v.comment.length >= 5, {
    message: "Tell the engineer what to change (at least 5 characters)",
    path: ["comment"],
  });
export type ApprovalInput = z.input<typeof ApprovalInputSchema>;

export const ApprovalQueueItemSchema = TaskListItemSchema.extend({
  waitingHours: z.number(),
  signOff: z.object({ by: z.string(), at: z.string() }).nullable(),
  highRisk: z.boolean(),
});
export type ApprovalQueueItem = z.infer<typeof ApprovalQueueItemSchema>;

export const LogLineSchema = z.object({
  seq: z.number().int(),
  at: z.string(),
  level: z.enum(["info", "tool", "warn", "error", "success"]),
  text: z.string(),
});
export type LogLine = z.infer<typeof LogLineSchema>;

export const LiveLogSchema = z.object({
  runId: z.string().nullable(),
  status: z.enum(["idle", "running", "verifying", "done"]),
  lines: z.array(LogLineSchema),
  progressPct: z.number(),
});
export type LiveLog = z.infer<typeof LiveLogSchema>;

export const DiffLineSchema = z.object({
  kind: z.enum(["context", "add", "del", "hunk"]),
  oldNo: z.number().nullable(),
  newNo: z.number().nullable(),
  text: z.string(),
});
export const DiffFileSchema = z.object({
  path: z.string(),
  status: z.enum(["modified", "added", "deleted"]),
  additions: z.number().int(),
  deletions: z.number().int(),
  aiAuthored: z.boolean(),
  lines: z.array(DiffLineSchema),
});
export type DiffFile = z.infer<typeof DiffFileSchema>;
export type DiffLine = z.infer<typeof DiffLineSchema>;

// ---------------------------------------------------------------- overview & activity
export const ActivityItemSchema = EvidenceItemSchema.extend({
  taskTitle: z.string(),
  applicationName: z.string(),
  href: z.string(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const AttentionItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["approval", "sla_risk", "critical_cve", "escalation", "integration_error"]),
  title: z.string(),
  detail: z.string(),
  href: z.string(),
  severity: z.enum(["danger", "warning", "info"]),
});
export type AttentionItem = z.infer<typeof AttentionItemSchema>;

export const KpiSchema = z.object({
  value: z.number(),
  previous: z.number().nullable(),
  spark: z.array(z.number()).default([]),
});
export type Kpi = z.infer<typeof KpiSchema>;

export const PortalOverviewSchema = z.object({
  kpis: z.object({
    applicationsCovered: KpiSchema,
    slaMetPct: KpiSchema.extend({ target: z.number() }),
    changesDelivered: KpiSchema,
    estimatedSavingUsd: KpiSchema.extend({ pct: z.number() }),
    openApprovals: KpiSchema,
  }),
  healthTrend: z.array(z.object({ weekStart: z.string(), score: z.number() })),
  attention: z.array(AttentionItemSchema),
  activity: z.array(ActivityItemSchema),
});
export type PortalOverview = z.infer<typeof PortalOverviewSchema>;

// ---------------------------------------------------------------- applications detail
export const ApplicationDetailSchema = z.object({
  application: ApplicationSummarySchema,
  organization: OrganizationSchema,
  owners: z.array(UserSchema),
  health: HealthBreakdownSchema,
  history: z.array(HealthSnapshotSchema),
  repositories: z.array(RepositorySchema),
  findings: z.array(FindingSchema.extend({ repositoryName: z.string() })),
  tasks: z.array(TaskListItemSchema),
});
export type ApplicationDetail = z.infer<typeof ApplicationDetailSchema>;

// ---------------------------------------------------------------- repositories
export const RepositorySummarySchema = RepositorySchema.extend({
  name: z.string(),
  applicationName: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  openFindings: z.number().int(),
  criticalFindings: z.number().int(),
  scanRunning: z.boolean(),
});
export type RepositorySummary = z.infer<typeof RepositorySummarySchema>;

export const RepositoryDetailSchema = z.object({
  repository: RepositorySummarySchema,
  findings: z.array(FindingSchema),
  scans: z.array(ScanSchema),
  tasks: z.array(TaskListItemSchema),
  flakyTests: z.array(z.object({ name: z.string(), failureRatePct: z.number(), lastSeen: z.string() })),
});
export type RepositoryDetail = z.infer<typeof RepositoryDetailSchema>;

// ---------------------------------------------------------------- evidence
export const EvidencePackSchema = z.object({
  id: z.string(),
  task: TaskListItemSchema,
  records: z.array(EvidenceItemSchema),
  chainValid: z.boolean(),
  verification: VerificationRunSchema.nullable(),
  agentLabel: z.string(),
  signOff: z.object({ by: z.string(), at: z.string() }).nullable(),
  clientApproval: z.object({ by: z.string(), at: z.string(), decision: z.string() }).nullable(),
  diffSummary: z.object({ files: z.number(), additions: z.number(), deletions: z.number() }),
  lastEventAt: z.string(),
});
export type EvidencePack = z.infer<typeof EvidencePackSchema>;

// ---------------------------------------------------------------- reports
export const SavingsReportSchema = z.object({
  month: z.string(),
  availableMonths: z.array(z.string()),
  byType: z.array(
    z.object({ type: TaskTypeSchema, count: z.number(), hours: z.number(), priorVendorCostUsd: z.number() }),
  ),
  totals: z.object({
    tasks: z.number(),
    hours: z.number(),
    priorVendorRateUsd: z.number(),
    priorVendorCostUsd: z.number(),
    baselineHours: z.number(),
    baselineCostUsd: z.number(),
    forgePilotFeeUsd: z.number(),
    savingUsd: z.number(),
    savingPct: z.number(),
    applications: z.number(),
    pricePerAppMonthlyUsd: z.number(),
  }),
  agentSharePct: z.number(),
});
export type SavingsReport = z.infer<typeof SavingsReportSchema>;

export const SlaMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.enum(["hours", "minutes", "pct"]),
  target: z.number(),
  actual: z.number().nullable(),
  /** true = lower is better */
  lowerIsBetter: z.boolean(),
  met: z.boolean().nullable(),
  samples: z.number(),
});
export type SlaMetric = z.infer<typeof SlaMetricSchema>;

export const SlaReportSchema = z.object({
  metrics: z.array(SlaMetricSchema),
  breaches: z.array(
    z.object({
      taskId: z.string(),
      title: z.string(),
      applicationName: z.string(),
      dueAt: z.string(),
      resolvedAt: z.string().nullable(),
      reason: z.string(),
    }),
  ),
  slaMetPct: z.number(),
  breachCount: z.number(),
});
export type SlaReport = z.infer<typeof SlaReportSchema>;

// ---------------------------------------------------------------- console: clients & ops
export const ClientSummarySchema = OrganizationSchema.extend({
  applications: z.number(),
  arrUsd: z.number(),
  slaMetPct: z.number(),
  slaStatus: SlaStatusSchema,
  openTasks: z.number(),
  marginPct: z.number().nullable(),
  avgHealth: z.number(),
});
export type ClientSummary = z.infer<typeof ClientSummarySchema>;

export const ClientDetailSchema = z.object({
  client: ClientSummarySchema,
  contract: ContractSchema.nullable(),
  applications: z.array(ApplicationSummarySchema),
  contacts: z.array(UserSchema),
  tasks: z.array(TaskListItemSchema),
  integrations: z.array(IntegrationSchema),
});
export type ClientDetail = z.infer<typeof ClientDetailSchema>;

export const OpsDashboardSchema = z.object({
  kpis: z.object({
    slaMetPct: z.number(),
    tasksCompletedWeek: z.number(),
    tasksCompletedPrevWeek: z.number(),
    agentSharePct: z.number(),
    avgCostPerTaskUsd: z.number(),
    grossMarginPct: z.number(),
    escalations: z.number(),
  }),
  tasksByStateByClient: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  agentShareTrend: z.array(z.object({ week: z.string(), agentPct: z.number(), humanPct: z.number() })),
  slaRisk: z.array(TaskListItemSchema),
  workload: z.array(z.object({ user: UserSchema, active: z.number(), awaitingReview: z.number() })),
  costByAgent: z.array(z.object({ agent: AgentKindSchema, runs: z.number(), costUsd: z.number(), successPct: z.number() })),
});
export type OpsDashboard = z.infer<typeof OpsDashboardSchema>;

// ---------------------------------------------------------------- integrations
export const IntegrationCategorySchema = z.enum([
  "source_control",
  "work_intake",
  "notifications",
  "security",
  "identity",
  "observability",
  "agents",
]);
export type IntegrationCategory = z.infer<typeof IntegrationCategorySchema>;

export const IntegrationViewSchema = z.object({
  providerId: z.string(),
  name: z.string(),
  category: IntegrationCategorySchema,
  description: z.string(),
  availability: z.enum(["available", "phase_2", "phase_3"]),
  scopes: z.array(z.string()),
  connection: IntegrationSchema.nullable(),
});
export type IntegrationView = z.infer<typeof IntegrationViewSchema>;

export const ConnectIntegrationInputSchema = z.object({
  account: z.string().trim().min(2, "Enter the account, workspace or org name"),
});

// ---------------------------------------------------------------- team
export const InviteUserInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  email: z.email("Enter a valid email"),
  role: z.enum(["client_admin", "client_approver", "client_viewer"]),
});
export type InviteUserInput = z.infer<typeof InviteUserInputSchema>;

// ---------------------------------------------------------------- onboarding
export const GitRepoCandidateSchema = z.object({
  fullName: z.string(),
  language: LanguageSchema,
  defaultBranch: z.string(),
  private: z.boolean(),
  lastPushAt: z.string(),
});
export type GitRepoCandidate = z.infer<typeof GitRepoCandidateSchema>;

export const OnboardingInputSchema = z.object({
  company: z.object({
    name: z.string().trim().min(2, "Enter the company name"),
    industry: z.string().min(1, "Choose an industry"),
    region: z.string().min(2, "Choose a region"),
    contactName: z.string().trim().min(2, "Enter a contact name"),
    contactEmail: z.email("Enter a valid email"),
  }),
  provider: GitProviderSchema,
  account: z.string().min(1),
  repositories: z.array(GitRepoCandidateSchema).min(1, "Select at least one repository"),
  mapping: z
    .array(
      z.object({
        repoFullName: z.string(),
        applicationName: z.string().trim().min(2, "Name the application"),
        criticality: CriticalitySchema,
      }),
    )
    .min(1),
  tier: TierSchema,
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const OnboardingResultSchema = z.object({
  organizationId: z.string(),
  applicationIds: z.array(z.string()),
  repositoryIds: z.array(z.string()),
  scanIds: z.array(z.string()),
});
export type OnboardingResult = z.infer<typeof OnboardingResultSchema>;

export const OnboardingStatusSchema = z.object({
  organization: OrganizationSchema,
  scans: z.array(ScanSchema.extend({ repositoryName: z.string() })),
  done: z.boolean(),
  progressPct: z.number(),
  applications: z.array(ApplicationSummarySchema),
  topFindings: z.array(FindingSchema.extend({ repositoryName: z.string() })),
  plan90: z.array(z.object({ window: z.string(), items: z.array(z.string()) })),
});
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

// ---------------------------------------------------------------- search & misc
export const SearchResultSchema = z.object({
  kind: z.enum(["client", "application", "task", "repository"]),
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const NotificationListSchema = z.array(NotificationSchema);
export const OkSchema = z.object({ ok: z.literal(true) });


