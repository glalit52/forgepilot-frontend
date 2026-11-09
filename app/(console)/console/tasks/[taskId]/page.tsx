"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  FileCheck2Icon,
  FileDiffIcon,
  FlaskConicalIcon,
  InfoIcon,
  TerminalIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { EvidenceTimeline } from "@/components/shared/evidence-timeline";
import { MockDataBadge, TaskTypeBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { ActionBar, actionReasons } from "@/components/console/workspace/action-bar";
import { LiveLog } from "@/components/console/workspace/live-log";
import { PlanEditor } from "@/components/console/workspace/plan-editor";
import { RunHistory } from "@/components/console/workspace/run-history";
import { TaskInfo } from "@/components/console/workspace/task-info";
import { VerificationTab } from "@/components/console/workspace/verification-tab";
import { isManualRun, runActor } from "@/components/console/run-actor";
import { useNow } from "@/components/console/use-now";
import { useEngineers, useTask, useTaskAction, useTaskDiff, useTaskLog } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { TaskAction, TaskActionInput, TaskDetail, TaskState } from "@/lib/schemas";
import { AGENT_LABEL } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/domain/format";

const LIVE: TaskState[] = ["running", "verifying"];

function successMessage(
  input: TaskActionInput,
  d: TaskDetail,
): { title: string; description?: string } {
  const agent = AGENT_LABEL[d.task.agent];
  switch (input.action) {
    case "save_plan":
      return {
        title: "Plan saved",
        description: "Recorded in the evidence trail. Approve it to launch an agent.",
      };
    case "approve_plan":
      return { title: "Plan approved", description: "Ready to launch an agent." };
    case "launch":
      return {
        title: "Agent launched",
        description: `${agent} is working in an isolated sandbox. Output streams in the live log.`,
      };
    case "stop":
      return {
        title: "Agent run stopped",
        description: "You can launch again or take over manually.",
      };
    case "retry":
      return {
        title: "Retry started",
        description: `${agent} is making attempt #${d.task.attempts} with your notes.`,
      };
    case "take_over":
      return {
        title: "You've taken over this task",
        description: "Your change is marked as human-authored and still goes through verification.",
      };
    case "sign_off":
      return {
        title: "Signed off",
        description: "Open the PR to send the change for client approval.",
      };
    case "open_pr":
      return {
        title: d.task.pullRequest
          ? `PR #${d.task.pullRequest.number} opened`
          : "Pull request opened",
        description:
          "Waiting for client approval. It merges in the client's repository under their branch rules.",
      };
    case "escalate":
      return { title: "Task escalated", description: "The delivery manager has been notified." };
    case "close":
      return { title: "Task closed" };
  }
}

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading task">
      <Skeleton className="h-7 w-96 max-w-full" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
        <Skeleton className="h-[32rem]" />
        <Skeleton className="h-[32rem]" />
        <Skeleton className="hidden h-[32rem] 2xl:block" />
      </div>
    </div>
  );
}

/** C-03 Agent workspace — the core engineer screen. */
export default function AgentWorkspacePage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wantsLaunch = searchParams.get("launch") === "1";

  const taskQuery = useTask(taskId);
  const detail = taskQuery.data;
  const state = detail?.task.state;
  const live = !!state && LIVE.includes(state);
  const log = useTaskLog(taskId, live);
  const diff = useTaskDiff(taskId);
  const action = useTaskAction(taskId);
  const engineers = useEngineers();
  const now = useNow(15_000);
  const [tab, setTab] = useState("log");
  const launchRef = useRef<HTMLButtonElement>(null);

  useBreadcrumbLabel(taskId, detail?.task.title);

  // When the run or state moves on (e.g. agent finished → verifying → awaiting review),
  // fetch the final log and the diff once, and tell the engineer what happened.
  const runKey = `${state ?? ""}|${detail?.task.latestRun?.id ?? ""}|${detail?.task.latestRun?.outcome ?? ""}`;
  const prev = useRef<{ key: string; state?: TaskState } | null>(null);
  const { refetch: refetchLog } = log;
  const { refetch: refetchDiff } = diff;
  useEffect(() => {
    if (!state) return;
    const before = prev.current;
    prev.current = { key: runKey, state };
    if (!before || before.key === runKey) return;
    refetchLog();
    refetchDiff();
    if (before.state && LIVE.includes(before.state)) {
      if (state === "awaiting_review")
        toast.success("Checks passed — ready for your review", {
          description: "Review the diff, then sign off.",
        });
      else if (state === "retrying")
        toast.warning("Verification didn't pass", {
          description: "Retry with notes, or take over manually.",
        });
      else if (state === "escalated")
        toast.error("Escalated after repeated failures", {
          description: "This task needs hands-on attention.",
        });
    }
  }, [runKey, state, refetchLog, refetchDiff]);

  // ?launch=1 (command palette): focus and highlight the Launch button — never auto-launch.
  const focused = useRef(false);
  useEffect(() => {
    if (!wantsLaunch || focused.current || !detail) return;
    focused.current = true;
    const el = launchRef.current;
    if (el && !el.disabled) {
      el.focus();
      el.scrollIntoView({ block: "center" });
    }
  }, [wantsLaunch, detail]);

  const names = useMemo(
    () => new Map((engineers.data ?? []).map((u) => [u.id, u.name])),
    [engineers.data],
  );

  if (taskQuery.isPending) return <WorkspaceSkeleton />;
  if (taskQuery.error || !detail) {
    const notFound = taskQuery.error instanceof ApiError && taskQuery.error.status === 404;
    return notFound ? (
      <EmptyState
        title="Task not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Button asChild variant="outline">
            <Link href="/console/tasks">
              <ArrowLeftIcon /> All tasks
            </Link>
          </Button>
        }
      />
    ) : (
      <ErrorState error={taskQuery.error} onRetry={() => taskQuery.refetch()} />
    );
  }

  const { task } = detail;
  const latestVerification = task.latestVerification;
  const reasons = actionReasons(task.state, latestVerification);
  const pending: TaskAction | null = action.isPending ? (action.variables?.action ?? null) : null;
  const latestRun = task.latestRun;
  const actorLabel = latestRun
    ? isManualRun(latestRun)
      ? `${runActor(latestRun).name} · manual change`
      : `${AGENT_LABEL[latestRun.agent]} · ${latestRun.model}`
    : null;
  const launchReason = reasons("launch");
  const approveReason =
    task.state === "plan_approved" || task.plan.approvedBy
      ? reasons("approve_plan")
        ? "The plan is already approved."
        : undefined
      : reasons("approve_plan");

  const runAction = (input: TaskActionInput) => {
    action.mutate(input, {
      onSuccess: (d) => {
        const m = successMessage(input, d);
        toast.success(m.title, { description: m.description });
        if (input.action === "launch" || input.action === "retry" || input.action === "take_over")
          setTab("log");
        if (input.action === "launch" && wantsLaunch) router.replace(pathname, { scroll: false });
      },
      onError: (e) =>
        toast.error("Action failed", { description: e instanceof Error ? e.message : String(e) }),
    });
  };

  const diffFiles = diff.data ?? [];
  const evidenceNewestFirst = [...detail.evidence].reverse();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={task.title}
        description={
          <>
            <span className="text-foreground font-medium">{detail.organization.name}</span> ·{" "}
            {detail.application.name} · <span className="font-mono text-xs">{task.id}</span>
          </>
        }
        meta={
          <>
            <StatusBadge state={task.state} />
            <VerificationBadge status={latestVerification?.status} />
            <TaskTypeBadge type={task.type} />
            {task.attempts > 0 && <AiCodeFlag pct={task.aiAuthoredPct} />}
            {detail.signOff && (
              <Badge variant="success">
                Signed off by {detail.signOff.by} · {formatDateTime(detail.signOff.at)}
              </Badge>
            )}
            <MockDataBadge />
          </>
        }
        actions={
          task.pullRequest && (
            <Button asChild variant="outline" size="sm">
              <a href={task.pullRequest.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon /> View PR #{task.pullRequest.number}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          )
        }
      />

      {wantsLaunch && launchReason && (
        <p
          role="status"
          className="bg-info-soft text-info-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm"
        >
          <InfoIcon className="size-4 shrink-0" aria-hidden />
          Can&apos;t launch an agent right now: {launchReason}
        </p>
      )}
      {task.state === "pr_open" && (
        <p
          role="note"
          className="bg-warning-soft text-warning-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm"
        >
          <InfoIcon className="size-4 shrink-0" aria-hidden />
          Waiting for client approval. ForgePilot never merges: the client merges in their own
          repository under their branch rules.
        </p>
      )}

      <ActionBar
        ref={launchRef}
        state={task.state}
        latestVerification={latestVerification}
        pending={pending}
        highlightLaunch={wantsLaunch}
        agentName={AGENT_LABEL[task.agent]}
        onRun={runAction}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
        {/* Left: task info + plan */}
        <div className="flex flex-col gap-4 lg:row-span-2 2xl:row-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Task</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskInfo
                detail={detail}
                manualTakeoverName={
                  task.manualTakeoverBy
                    ? (names.get(task.manualTakeoverBy) ?? task.manualTakeoverBy)
                    : null
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanEditor
                key={JSON.stringify(task.plan)}
                plan={task.plan}
                approvedByName={
                  task.plan.approvedBy ? (names.get(task.plan.approvedBy) ?? null) : null
                }
                canEdit={!reasons("save_plan")}
                approveReason={approveReason}
                pending={pending}
                onAction={(a, plan) =>
                  runAction(a === "save_plan" ? { action: a, plan } : { action: a })
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Centre: log / diff / verification / evidence */}
        <Card className="min-w-0 p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Workspace views">
              <TabsTrigger value="log">
                <TerminalIcon aria-hidden /> Live log
                {live && (
                  <span
                    className="bg-primary size-1.5 animate-pulse rounded-full"
                    aria-label="live"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="diff">
                <FileDiffIcon aria-hidden /> Diff
                {diffFiles.length > 0 && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {diffFiles.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="verification">
                <FlaskConicalIcon aria-hidden /> Verification
              </TabsTrigger>
              <TabsTrigger value="evidence">
                <FileCheck2Icon aria-hidden /> Evidence
                <span className="text-muted-foreground text-xs tabular-nums">
                  {detail.evidence.length}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="log">
              <LiveLog query={log} actorLabel={actorLabel} />
            </TabsContent>
            <TabsContent value="diff">
              {diff.isPending ? (
                <Skeleton className="h-96 w-full" />
              ) : diff.error ? (
                <ErrorState error={diff.error} onRetry={() => diff.refetch()} />
              ) : diffFiles.length === 0 ? (
                <EmptyState
                  icon={FileDiffIcon}
                  title="No changes yet"
                  description={
                    launchReason
                      ? "The diff appears once an agent or engineer has made a change."
                      : "Launch an agent to produce a change."
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {live && (
                    <p className="text-muted-foreground text-xs" role="status">
                      Work in progress — the diff updates when the run finishes.
                    </p>
                  )}
                  <DiffViewer files={diffFiles} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="verification">
              <VerificationTab
                latest={latestVerification}
                verifications={detail.verifications}
                runs={detail.runs}
              />
            </TabsContent>
            <TabsContent value="evidence">
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">
                  Every action on this task, newest first, with who did it: an AI agent (with model)
                  or a named person.
                </p>
                <EvidenceTimeline records={evidenceNewestFirst} chainValid={detail.chainValid} />
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right: AgentRun history */}
        <Card className="lg:col-start-2 2xl:col-start-3 2xl:row-start-1">
          <CardHeader>
            <CardTitle>Agent runs</CardTitle>
          </CardHeader>
          <CardContent>
            <RunHistory runs={detail.runs} now={now} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
