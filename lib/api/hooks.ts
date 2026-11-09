"use client";
/**
 * TanStack Query hooks — the only way components get data.
 * Mutations invalidate everything: the mock API is cheap, and it keeps every
 * screen (badges, counts, timelines) consistent after an action.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ApplicationDetailSchema,
  ApplicationSummarySchema,
  ApprovalQueueItemSchema,
  ClientDetailSchema,
  ClientSummarySchema,
  DiffFileSchema,
  EvidencePackSchema,
  GitRepoCandidateSchema,
  IntegrationViewSchema,
  LiveLogSchema,
  NotificationListSchema,
  OkSchema,
  OnboardingResultSchema,
  OnboardingStatusSchema,
  OpsDashboardSchema,
  PortalOverviewSchema,
  RepositoryDetailSchema,
  RepositorySummarySchema,
  SavingsReportSchema,
  SearchResultSchema,
  SessionSchema,
  SlaReportSchema,
  TaskDetailSchema,
  TaskListItemSchema,
  UserSchema,
  ActivityItemSchema,
  type ApprovalInput,
  type InviteUserInput,
  type NewTaskInput,
  type OnboardingInput,
  type TaskActionInput,
  type TaskFilters,
} from "@/lib/schemas";
import { api } from "./client";

export const qk = {
  session: ["session"] as const,
  personas: ["personas"] as const,
  overview: (orgId?: string) => ["overview", orgId] as const,
  activity: (limit: number) => ["activity", limit] as const,
  applications: (orgId?: string) => ["applications", orgId] as const,
  application: (id: string) => ["application", id] as const,
  repositories: (f: { orgId?: string; applicationId?: string }) => ["repositories", f] as const,
  repository: (id: string) => ["repository", id] as const,
  tasks: (f: TaskFilters) => ["tasks", f] as const,
  task: (id: string) => ["task", id] as const,
  taskLog: (id: string) => ["taskLog", id] as const,
  taskDiff: (id: string) => ["taskDiff", id] as const,
  approvals: ["approvals"] as const,
  evidence: (f: Record<string, string | undefined>) => ["evidence", f] as const,
  savings: (month?: string, orgId?: string) => ["savings", month, orgId] as const,
  sla: (orgId?: string) => ["sla", orgId] as const,
  clients: ["clients"] as const,
  client: (id: string) => ["client", id] as const,
  ops: ["ops"] as const,
  engineers: ["engineers"] as const,
  team: ["team"] as const,
  integrations: (orgId?: string) => ["integrations", orgId] as const,
  notifications: ["notifications"] as const,
  search: (q: string) => ["search", q] as const,
  gitRepos: (provider: string, account: string) => ["gitRepos", provider, account] as const,
  onboarding: (orgId: string) => ["onboarding", orgId] as const,
};

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

// ---------------------------------------------------------------- session
export function useSession() {
  return useQuery({ queryKey: qk.session, queryFn: () => api.get(SessionSchema, "/session"), staleTime: 60_000 });
}

export function usePersonas() {
  return useQuery({ queryKey: qk.personas, queryFn: () => api.get(z.array(UserSchema), "/session/personas") });
}

export function useSwitchPersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(SessionSchema, "/session", { userId }),
    onSuccess: (data) => {
      qc.clear();
      qc.setQueryData(qk.session, data);
    },
  });
}

// ---------------------------------------------------------------- portal
export function usePortalOverview() {
  return useQuery({ queryKey: qk.overview(), queryFn: () => api.get(PortalOverviewSchema, "/overview") });
}

export function useActivity(limit = 20) {
  return useQuery({
    queryKey: qk.activity(limit),
    queryFn: () => api.get(z.array(ActivityItemSchema), "/activity", { limit }),
  });
}

export function useApplications(orgId?: string) {
  return useQuery({
    queryKey: qk.applications(orgId),
    queryFn: () => api.get(z.array(ApplicationSummarySchema), "/applications", { orgId }),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: qk.application(id),
    queryFn: () => api.get(ApplicationDetailSchema, `/applications/${id}`),
    enabled: !!id,
  });
}

export function useRepositories(f: { orgId?: string; applicationId?: string } = {}) {
  return useQuery({
    queryKey: qk.repositories(f),
    queryFn: () => api.get(z.array(RepositorySummarySchema), "/repositories", f),
  });
}

export function useRepository(id: string) {
  return useQuery({
    queryKey: qk.repository(id),
    queryFn: () => api.get(RepositoryDetailSchema, `/repositories/${id}`),
    enabled: !!id,
    // Poll while a scan is running so progress and results update.
    refetchInterval: (q) => (q.state.data?.repository.scanRunning ? 1500 : false),
  });
}

export function useRunScan(repoId: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => api.post(z.object({ scanId: z.string() }), `/repositories/${repoId}/scans`),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- tasks
export function useTasks(filters: TaskFilters = {}, opts: { refetchInterval?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.tasks(filters),
    queryFn: () => api.get(z.array(TaskListItemSchema), "/tasks", filters),
    refetchInterval: opts.refetchInterval,
    enabled: opts.enabled ?? true,
  });
}

const LIVE_STATES = new Set(["running", "verifying"]);

export function useTask(id: string) {
  return useQuery({
    queryKey: qk.task(id),
    queryFn: () => api.get(TaskDetailSchema, `/tasks/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && LIVE_STATES.has(q.state.data.task.state) ? 1500 : false),
  });
}

export function useTaskLog(id: string, live: boolean) {
  return useQuery({
    queryKey: qk.taskLog(id),
    queryFn: () => api.get(LiveLogSchema, `/tasks/${id}/log`),
    enabled: !!id,
    refetchInterval: live ? 1400 : false,
  });
}

export function useTaskDiff(id: string) {
  return useQuery({
    queryKey: qk.taskDiff(id),
    queryFn: () => api.get(z.array(DiffFileSchema), `/tasks/${id}/diff`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: NewTaskInput) => api.post(TaskListItemSchema, "/tasks", input),
    onSuccess: invalidate,
  });
}

export function useTaskAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskActionInput) => api.post(TaskDetailSchema, `/tasks/${id}/actions`, input),
    onSuccess: (data) => {
      qc.setQueryData(qk.task(id), data);
      qc.invalidateQueries();
    },
  });
}

export function useApprovalDecision(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApprovalInput) => api.post(TaskDetailSchema, `/tasks/${id}/approval`, input),
    onSuccess: (data) => {
      qc.setQueryData(qk.task(id), data);
      qc.invalidateQueries();
    },
  });
}

/** For approval rows where the task id is only known at call time. */
export function useApprove() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ taskId, ...input }: ApprovalInput & { taskId: string }) =>
      api.post(TaskDetailSchema, `/tasks/${taskId}/approval`, input),
    onSuccess: invalidate,
  });
}

export function useApprovals(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.approvals,
    queryFn: () => api.get(z.array(ApprovalQueueItemSchema), "/approvals"),
    enabled: opts.enabled ?? true,
  });
}

// ---------------------------------------------------------------- evidence & reports
export function useEvidence(filters: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: qk.evidence(filters),
    queryFn: () => api.get(z.array(EvidencePackSchema), "/evidence", filters),
  });
}

export const EvidenceExportSchema = z.object({
  exportedAt: z.string(),
  exportedBy: z.string(),
  packs: z.array(EvidencePackSchema),
});

export function exportEvidence(ids: string[]) {
  return api.get(EvidenceExportSchema, "/evidence/export", { ids: ids.join(",") });
}

export function useSavingsReport(month?: string, orgId?: string) {
  return useQuery({
    queryKey: qk.savings(month, orgId),
    queryFn: () => api.get(SavingsReportSchema, "/reports/savings", { month, orgId }),
  });
}

export function useSlaReport(orgId?: string) {
  return useQuery({
    queryKey: qk.sla(orgId),
    queryFn: () => api.get(SlaReportSchema, "/reports/sla", { orgId }),
  });
}

// ---------------------------------------------------------------- console
export function useClients() {
  return useQuery({ queryKey: qk.clients, queryFn: () => api.get(z.array(ClientSummarySchema), "/clients") });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: qk.client(id),
    queryFn: () => api.get(ClientDetailSchema, `/clients/${id}`),
    enabled: !!id,
  });
}

export function useOps() {
  return useQuery({ queryKey: qk.ops, queryFn: () => api.get(OpsDashboardSchema, "/ops") });
}

export function useEngineers() {
  return useQuery({ queryKey: qk.engineers, queryFn: () => api.get(z.array(UserSchema), "/engineers") });
}

// ---------------------------------------------------------------- team, integrations, notifications
export function useTeam() {
  return useQuery({ queryKey: qk.team, queryFn: () => api.get(z.array(UserSchema), "/team") });
}

export function useInviteUser() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: InviteUserInput) => api.post(UserSchema, "/team/invite", input),
    onSuccess: invalidate,
  });
}

export function useIntegrations(orgId?: string) {
  return useQuery({
    queryKey: qk.integrations(orgId),
    queryFn: () => api.get(z.array(IntegrationViewSchema), "/integrations", { orgId }),
  });
}

export function useConnectIntegration() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ providerId, account }: { providerId: string; account: string }) =>
      api.post(IntegrationViewSchema, `/integrations/${providerId}/connect`, { account }),
    onSuccess: invalidate,
  });
}

export function useDisconnectIntegration() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (providerId: string) => api.post(OkSchema, `/integrations/${providerId}/disconnect`),
    onSuccess: invalidate,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: () => api.get(NotificationListSchema, "/notifications"),
    refetchInterval: 20_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api.post(OkSchema, "/notifications/read", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export function useSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: qk.search(q),
    queryFn: () => api.get(z.array(SearchResultSchema), "/search", { q }),
    enabled,
    staleTime: 10_000,
  });
}

// ---------------------------------------------------------------- onboarding & demo
export function useGitRepos(provider: string, account: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.gitRepos(provider, account),
    queryFn: () => api.get(z.array(GitRepoCandidateSchema), "/onboarding/git-repos", { provider, account }),
    enabled,
  });
}

export function useSubmitOnboarding() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: OnboardingInput) => api.post(OnboardingResultSchema, "/onboarding", input),
    onSuccess: invalidate,
  });
}

export function useOnboardingStatus(orgId: string | null) {
  return useQuery({
    queryKey: qk.onboarding(orgId ?? ""),
    queryFn: () => api.get(OnboardingStatusSchema, `/onboarding/${orgId}/status`),
    enabled: !!orgId,
    refetchInterval: (q) => (q.state.data?.done ? false : 1000),
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(OkSchema, "/demo/reset"),
    onSuccess: () => qc.invalidateQueries(),
  });
}
