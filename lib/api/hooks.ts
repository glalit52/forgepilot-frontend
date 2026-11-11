"use client";
/**
 * TanStack Query hooks — the only way components get data.
 * Mutations invalidate all queries: the mock API is cheap and it keeps
 * badges, boards and timelines consistent after every action.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import * as S from "@/lib/schemas";
import { api } from "./client";
import { isLive, poll } from "@/lib/live/status";

type Q = Record<string, string | number | boolean | undefined | null>;
const LIVE = 1500;

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

function useAction<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: invalidate });
}

// ---------------------------------------------------------------- session & workspace
const PersonaSchema = S.UserSchema.extend({
  workspaces: z.array(z.object({ orgId: z.string(), name: z.string(), role: S.RoleSchema })),
});
export type Persona = z.infer<typeof PersonaSchema>;

export function useSession(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => api.get(S.SessionInfoSchema, "/session"),
    staleTime: 30_000,
    refetchInterval: poll(15_000),
    enabled: opts.enabled ?? true,
  });
}
export function useSessionStatus() {
  return useQuery({
    queryKey: ["session-status"],
    queryFn: () =>
      api.get(
        z.object({ signedIn: z.boolean(), hasWorkspace: z.boolean(), name: z.string().nullable() }),
        "/session/status",
      ),
  });
}
export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: () => api.get(z.array(PersonaSchema), "/session/personas"),
  });
}
export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; orgId?: string }) =>
      api.post(S.SessionInfoSchema, "/session", input),
    onSuccess: (data) => {
      qc.clear();
      qc.setQueryData(["session"], data);
    },
  });
}
export function useSwitchWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => api.post(S.SessionInfoSchema, "/session/workspace", { orgId }),
    onSuccess: (data) => {
      qc.clear();
      qc.setQueryData(["session"], data);
    },
  });
}
export function useSignUp() {
  return useMutation({
    mutationFn: (input: S.SignUpInput) => api.post(S.UserSchema, "/signup", input),
  });
}
export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: S.CreateWorkspaceInput) => api.post(S.OrganizationSchema, "/orgs", input),
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useRenameWorkspace() {
  return useAction((name: string) => api.post(S.OrganizationSchema, "/workspace", { name }));
}

// ---------------------------------------------------------------- onboarding
export function useGithubRepositories(account: string, enabled: boolean) {
  return useQuery({
    queryKey: ["github-repos", account],
    queryFn: () =>
      api.get(z.array(S.GithubRepoCandidateSchema), "/github/repositories", { account }),
    enabled,
  });
}
export function useInstallGithub() {
  return useAction((account: string) =>
    api.post(S.IntegrationSchema, "/github/install", { account }),
  );
}
export function useConnectRepositories() {
  return useAction((input: z.input<typeof S.ConnectReposInputSchema>) =>
    api.post(S.ConnectReposResultSchema, "/repositories/connect", input),
  );
}
export function useRepoConfig() {
  return useAction(({ id, ...input }: { id: string } & z.input<typeof S.RepoConfigInputSchema>) =>
    api.post(S.RepositorySchema, `/repositories/${id}/config`, input),
  );
}
export function useFirstRun() {
  return useAction((input: z.input<typeof S.FirstRunInputSchema>) =>
    api.post(S.FirstRunResultSchema, "/onboarding/first-run", input),
  );
}

// ---------------------------------------------------------------- overview, projects, repositories
export function useOverview() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: () => api.get(S.OverviewSchema, "/overview"),
    refetchInterval: poll(5000),
  });
}
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get(z.array(S.ProjectSummarySchema), "/projects"),
  });
}
export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get(S.ProjectDetailSchema, `/projects/${id}`),
    enabled: !!id,
  });
}
export function useCreateProject() {
  return useAction((input: z.input<typeof S.NewProjectInputSchema>) =>
    api.post(S.ProjectSchema, "/projects", input),
  );
}
export function useRepositories(projectId?: string) {
  return useQuery({
    queryKey: ["repositories", projectId],
    queryFn: () => api.get(z.array(S.RepositorySummarySchema), "/repositories", { projectId }),
    refetchInterval: (q) =>
      isLive()
        ? false
        : q.state.data?.some((r) => r.indexStatus === "indexing" || r.scanRunning)
          ? LIVE
          : false,
  });
}
export function useRepository(id: string) {
  return useQuery({
    queryKey: ["repository", id],
    queryFn: () => api.get(S.RepositoryDetailSchema, `/repositories/${id}`),
    enabled: !!id,
    refetchInterval: (q) =>
      isLive()
        ? false
        : q.state.data?.repository.scanRunning ||
            q.state.data?.repository.indexStatus === "indexing"
          ? LIVE
          : false,
  });
}
export function useRunScan() {
  return useAction((repositoryId: string) =>
    api.post(S.ScanSchema, `/repositories/${repositoryId}/scans`),
  );
}

// ---------------------------------------------------------------- DevPilot
export function useDevPilotOverview() {
  return useQuery({
    queryKey: ["devpilot"],
    queryFn: () => api.get(S.DevPilotOverviewSchema, "/devpilot/overview"),
    refetchInterval: poll(3000),
  });
}
export function useTasks(filters: Q = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.get(z.array(S.TaskListItemSchema), "/tasks", filters),
    refetchInterval: poll(5000),
  });
}
const ACTIVE_TASK = new Set(["queued", "running", "waiting_input", "verifying"]);
export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => api.get(S.TaskDetailSchema, `/tasks/${id}`),
    enabled: !!id,
    refetchInterval: (q) =>
      isLive()
        ? false
        : q.state.data &&
            (ACTIVE_TASK.has(q.state.data.task.status) ||
              q.state.data.children.some((c) => ACTIVE_TASK.has(c.status)))
          ? LIVE
          : false,
  });
}
export function useCreateTask() {
  return useAction((input: S.NewTaskInput) => api.post(S.TaskSchema, "/tasks", input));
}
export function useTaskAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: S.TaskActionInput) =>
      api.post(S.TaskDetailSchema, `/tasks/${id}/actions`, input),
    onSuccess: (data) => {
      qc.setQueryData(["task", id], data);
      qc.invalidateQueries();
    },
  });
}
export function useSessions(status?: string) {
  return useQuery({
    queryKey: ["sessions", status],
    queryFn: () => api.get(z.array(S.SessionListItemSchema), "/sessions", { status }),
    refetchInterval: poll(4000),
  });
}
export function useSessionDetail(id: string) {
  return useQuery({
    queryKey: ["session-detail", id],
    queryFn: () => api.get(S.SessionDetailSchema, `/sessions/${id}`),
    enabled: !!id,
    refetchInterval: (q) =>
      isLive()
        ? false
        : q.state.data && ["running", "waiting", "queued"].includes(q.state.data.session.status)
          ? LIVE
          : false,
  });
}
export function useSessionLog(id: string, live: boolean) {
  return useQuery({
    queryKey: ["session-log", id],
    queryFn: () => api.get(S.LiveLogSchema, `/sessions/${id}/log`),
    enabled: !!id,
    refetchInterval: live ? poll(1200) : false,
  });
}
export function useSessionDiff(id: string, enabled = true) {
  return useQuery({
    queryKey: ["session-diff", id],
    queryFn: () => api.get(z.array(S.DiffFileSchema), `/sessions/${id}/diff`),
    enabled: !!id && enabled,
  });
}
export function useCancelSession() {
  return useAction((id: string) => api.post(S.SessionListItemSchema, `/sessions/${id}/cancel`));
}
export function useAnswerSession() {
  return useAction(({ id, answer }: { id: string; answer: string }) =>
    api.post(S.SessionListItemSchema, `/sessions/${id}/input`, { answer }),
  );
}
const WorkspaceRowSchema = S.WorkspaceSchema.extend({
  taskTitle: z.string(),
  sessionStatus: S.SessionStatusSchema,
  repositoryName: z.string(),
});
export type WorkspaceRow = z.infer<typeof WorkspaceRowSchema>;
export function useExecutionWorkspaces() {
  return useQuery({
    queryKey: ["exec-workspaces"],
    queryFn: () => api.get(z.array(WorkspaceRowSchema), "/workspaces"),
    refetchInterval: poll(5000),
  });
}
export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get(z.array(S.AgentSchema), "/agents"),
  });
}
export function useUpdateAgent() {
  return useAction(
    ({
      id,
      ...patch
    }: {
      id: string;
      status?: "active" | "suspended";
      maxConcurrent?: number;
      defaultBudgetUsd?: number;
      defaultTimeoutMin?: number;
    }) => api.post(S.AgentSchema, `/agents/${id}`, patch),
  );
}

// ---------------------------------------------------------------- ShipSafe
export function useShipSafeOverview() {
  return useQuery({
    queryKey: ["shipsafe"],
    queryFn: () => api.get(S.ShipSafeOverviewSchema, "/shipsafe/overview"),
    refetchInterval: poll(5000),
  });
}
const SuiteRowSchema = S.TestSuiteSchema.extend({
  repositoryName: z.string(),
  lastStatus: z.string().nullable(),
});
export type SuiteRow = z.infer<typeof SuiteRowSchema>;
export function useTestSuites(repositoryId?: string) {
  return useQuery({
    queryKey: ["suites", repositoryId],
    queryFn: () => api.get(z.array(SuiteRowSchema), "/test-suites", { repositoryId }),
  });
}
export function useCreateSuite() {
  return useAction((input: S.TestSuiteInput) => api.post(S.TestSuiteSchema, "/test-suites", input));
}
export function useUpdateSuite() {
  return useAction(({ id, ...patch }: { id: string } & z.input<typeof S.TestSuitePatchSchema>) =>
    api.post(S.TestSuiteSchema, `/test-suites/${id}`, patch),
  );
}
export function useTestRuns(filters: Q = {}) {
  return useQuery({
    queryKey: ["runs", filters],
    queryFn: () => api.get(z.array(S.TestRunListItemSchema), "/test-runs", filters),
    refetchInterval: poll(4000),
  });
}
export function useTestRun(id: string) {
  return useQuery({
    queryKey: ["run", id],
    queryFn: () => api.get(S.TestRunDetailSchema, `/test-runs/${id}`),
    enabled: !!id,
    refetchInterval: (q) =>
      isLive()
        ? false
        : q.state.data && ["running", "queued"].includes(q.state.data.run.status)
          ? LIVE
          : false,
  });
}
export function useStartTestRun() {
  return useAction((input: z.input<typeof S.NewTestRunInputSchema>) =>
    api.post(S.TestRunSchema, "/test-runs", input),
  );
}
export function useRerun() {
  return useAction((runId: string) => api.post(S.TestRunSchema, `/test-runs/${runId}/rerun`));
}
export function useBugs(filters: Q = {}) {
  return useQuery({
    queryKey: ["bugs", filters],
    queryFn: () => api.get(z.array(S.BugListItemSchema), "/bugs", filters),
    refetchInterval: poll(5000),
  });
}
export function useBug(id: string) {
  return useQuery({
    queryKey: ["bug", id],
    queryFn: () => api.get(S.BugDetailSchema, `/bugs/${id}`),
    enabled: !!id,
    refetchInterval: poll(3000),
  });
}
export function useBugAction(id: string) {
  return useAction((input: S.BugActionInput) =>
    api.post(S.BugDetailSchema, `/bugs/${id}/actions`, input),
  );
}

// ---------------------------------------------------------------- pull requests
export function usePullRequests(filters: Q = {}) {
  return useQuery({
    queryKey: ["prs", filters],
    queryFn: () => api.get(z.array(S.PullRequestListItemSchema), "/pull-requests", filters),
    refetchInterval: poll(5000),
  });
}
export function usePullRequest(id: string) {
  return useQuery({
    queryKey: ["pr", id],
    queryFn: () => api.get(S.PullRequestDetailSchema, `/pull-requests/${id}`),
    enabled: !!id,
    refetchInterval: (q) =>
      isLive()
        ? false
        : q.state.data &&
            (["running", "queued"].includes(q.state.data.pullRequest.checkStatus) ||
              q.state.data.bugs.some((b) => b.status === "fix_in_progress"))
          ? LIVE
          : false,
  });
}
export function usePullRequestDiff(id: string, enabled = true) {
  return useQuery({
    queryKey: ["pr-diff", id],
    queryFn: () => api.get(z.array(S.DiffFileSchema), `/pull-requests/${id}/diff`),
    enabled: !!id && enabled,
  });
}
export function useReviewPullRequest(id: string) {
  return useAction((input: z.input<typeof S.ReviewInputSchema>) =>
    api.post(S.PullRequestDetailSchema, `/pull-requests/${id}/review`, input),
  );
}
export function useSimulateMerge(id: string) {
  return useAction(() => api.post(S.PullRequestDetailSchema, `/pull-requests/${id}/merge`));
}

// ---------------------------------------------------------------- CodeKeeper
export function useCodeKeeperOverview() {
  return useQuery({
    queryKey: ["codekeeper"],
    queryFn: () => api.get(S.CodeKeeperOverviewSchema, "/codekeeper/overview"),
    refetchInterval: poll(6000),
  });
}
const DependencyRowSchema = S.DependencySchema.extend({
  repositoryName: z.string(),
  outdated: z.boolean(),
  vulnerable: z.boolean(),
  majorBehind: z.boolean(),
});
export type DependencyRow = z.infer<typeof DependencyRowSchema>;
export function useDependencies(filters: Q = {}) {
  return useQuery({
    queryKey: ["dependencies", filters],
    queryFn: () => api.get(z.array(DependencyRowSchema), "/dependencies", filters),
  });
}
export function useFindings(filters: Q = {}) {
  return useQuery({
    queryKey: ["findings", filters],
    queryFn: () => api.get(z.array(S.FindingListItemSchema), "/findings", filters),
    refetchInterval: poll(6000),
  });
}
export function useFinding(id: string | null) {
  return useQuery({
    queryKey: ["finding", id],
    queryFn: () => api.get(S.FindingDetailSchema, `/findings/${id}`),
    enabled: !!id,
  });
}
export function useFindingAction(id: string) {
  return useAction((input: S.FindingActionInput) =>
    api.post(S.FindingDetailSchema, `/findings/${id}/actions`, input),
  );
}

// ---------------------------------------------------------------- approvals
const ApprovalRowSchema = S.ApprovalSchema.extend({
  requesterResolved: S.ResolvedActorSchema,
  taskTitle: z.string().nullable(),
  canDecide: z.boolean(),
});
export type ApprovalRow = z.infer<typeof ApprovalRowSchema>;
export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ["approvals", status],
    queryFn: () => api.get(z.array(ApprovalRowSchema), "/approvals", { status }),
    refetchInterval: poll(4000),
  });
}
export function useDecideApproval() {
  return useAction(({ id, ...input }: { id: string } & S.ApprovalDecisionInput) =>
    api.post(S.ApprovalSchema, `/approvals/${id}/decision`, input),
  );
}

// ---------------------------------------------------------------- analytics, integrations, settings, billing
export function useAnalytics(range: 30 | 90 = 30) {
  return useQuery({
    queryKey: ["analytics", range],
    queryFn: () => api.get(S.AnalyticsSchema, "/analytics", { range }),
  });
}
export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get(z.array(S.IntegrationViewSchema), "/integrations"),
  });
}
export function useConnectIntegration() {
  return useAction(({ providerId, account }: { providerId: string; account: string }) =>
    api.post(S.IntegrationSchema, `/integrations/${providerId}/connect`, { account }),
  );
}
export function useDisconnectIntegration() {
  return useAction((providerId: string) =>
    api.post(S.OkSchema, `/integrations/${providerId}/disconnect`),
  );
}
export function useMembers() {
  return useQuery({ queryKey: ["members"], queryFn: () => api.get(S.MembersSchema, "/members") });
}
export function useInviteMember() {
  return useAction((input: S.InviteInput) =>
    api.post(S.InvitationSchema, "/members/invite", input),
  );
}
export function useRevokeInvitation() {
  return useAction((id: string) => api.post(S.OkSchema, `/invitations/${id}/revoke`));
}
export function useChangeRole() {
  return useAction(({ userId, role }: { userId: string; role: S.Role }) =>
    api.post(S.OkSchema, `/members/${userId}/role`, { role }),
  );
}
export function useRemoveMember() {
  return useAction((userId: string) => api.post(S.OkSchema, `/members/${userId}/remove`));
}
export function usePolicy() {
  return useQuery({ queryKey: ["policy"], queryFn: () => api.get(S.PolicySchema, "/policy") });
}
export function useUpdatePolicy() {
  return useAction((patch: S.PolicyPatch) => api.post(S.PolicySchema, "/policy", patch));
}
export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get(z.array(S.ApiKeySchema), "/api-keys"),
  });
}
export function useCreateApiKey() {
  return useAction((input: z.input<typeof S.ApiKeyInputSchema>) =>
    api.post(S.ApiKeyCreatedSchema, "/api-keys", input),
  );
}
export function useRevokeApiKey() {
  return useAction((id: string) => api.post(S.OkSchema, `/api-keys/${id}/revoke`));
}
export function useAuditLogs(filters: Q = {}) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: () => api.get(z.array(S.ActivityItemSchema), "/audit-logs", filters),
  });
}
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get(z.array(S.PlanSchema), "/plans"),
    staleTime: Infinity,
  });
}
export function useBilling() {
  return useQuery({ queryKey: ["billing"], queryFn: () => api.get(S.BillingSchema, "/billing") });
}
export function useChangePlan() {
  return useAction((input: z.input<typeof S.ChangePlanInputSchema>) =>
    api.post(S.BillingSchema, "/billing/plan", input),
  );
}
export function useUpdateBudget() {
  return useAction((input: S.BudgetInput) => api.post(S.BillingSchema, "/billing/budget", input));
}

// ---------------------------------------------------------------- notifications, search, demo
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get(z.array(S.NotificationSchema), "/notifications"),
    refetchInterval: poll(10_000),
  });
}
export function useMarkNotificationsRead() {
  return useAction((ids?: string[]) => api.post(S.OkSchema, "/notifications/read", { ids }));
}
export function useSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => api.get(z.array(S.SearchResultSchema), "/search", { q }),
    enabled,
    staleTime: 5000,
  });
}
export function useResetDemo() {
  return useAction(() => api.post(S.OkSchema, "/demo/reset"));
}

// ---------------------------------------------------------------- ShipSafe visual comparison & GitHub issue import
export function useVisualSnapshots(filters: Q = {}) {
  return useQuery({
    queryKey: ["visuals", filters],
    queryFn: () => api.get(z.array(S.VisualSnapshotListItemSchema), "/visual-snapshots", filters),
    refetchInterval: poll(6000),
  });
}
export function useDecideVisual() {
  return useAction(({ id, ...input }: { id: string } & S.VisualDecisionInput) =>
    api.post(S.VisualSnapshotSchema, `/visual-snapshots/${id}/decision`, input),
  );
}
export function useGithubIssues(filters: Q = {}, enabled = true) {
  return useQuery({
    queryKey: ["github-issues", filters],
    queryFn: () => api.get(z.array(S.GithubIssueListItemSchema), "/github/issues", filters),
    enabled,
  });
}
export function useImportIssues() {
  return useAction((input: S.ImportIssuesInput) =>
    api.post(S.ImportIssuesResultSchema, "/github/issues/import", input),
  );
}
