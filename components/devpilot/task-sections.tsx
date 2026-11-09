"use client";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BanIcon,
  BugIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  GitPullRequestIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  StickyNoteIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ActorChip } from "@/components/shared/actor-chip";
import { LogViewer } from "@/components/shared/log-viewer";
import { CommitSha } from "@/components/shared/misc";
import { EmptyState } from "@/components/shared/states";
import {
  RunStatusBadge,
  SessionStatusBadge,
  SeverityBadge,
  TaskStatusBadge,
  ToneBadge,
} from "@/components/shared/status-badge";
import { useBugAction, useSession, useSessionLog } from "@/lib/api/hooks";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";
import { APPROVAL_ACTION_LABEL } from "@/lib/domain/labels";
import { can } from "@/lib/domain/permissions";
import type { Approval, Bug, Task, TaskDetail } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ReasonTip } from "./bits";
import { formatCost, formatTokens, sessionSeconds, useNow } from "./utils";

// ---------------------------------------------------------------- spec
export function TaskSpec({ task }: { task: TaskDetail["task"] }) {
  return (
    <Card className="flex flex-col gap-5 p-5">
      {task.clarityWarning && (
        <div
          role="status"
          className="bg-warning-soft text-warning-foreground flex items-start gap-2 rounded-md p-3 text-sm"
        >
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">This task may be too vague for an agent</p>
            <p className="text-xs">{task.clarityWarning}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-sm font-semibold">Goal</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center justify-between text-sm font-semibold">
          Acceptance criteria
          <span className="text-muted-foreground text-xs font-normal">
            {task.verified ? "Verified by ShipSafe" : "Checked when verification passes"}
          </span>
        </h2>
        <ul className="flex flex-col gap-1.5" aria-label="Acceptance criteria">
          {task.acceptanceCriteria.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {task.verified ? (
                <CheckCircle2Icon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <CircleIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <span>
                {c}
                <span className="sr-only">{task.verified ? " (met)" : " (not yet verified)"}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {task.constraints.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Constraints</h2>
          <ul className="flex flex-col gap-1">
            {task.constraints.map((c, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                <BanIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- policy preview
export function PolicyPreview({
  preview,
  task,
}: {
  preview: TaskDetail["policyPreview"];
  task: TaskDetail["task"];
}) {
  const groups = [
    {
      key: "allowed",
      label: "Allowed",
      items: preview.allowed,
      icon: ShieldCheckIcon,
      cls: "text-success-foreground",
    },
    {
      key: "approval",
      label: "Requires approval",
      items: preview.requiresApproval,
      icon: ShieldAlertIcon,
      cls: "text-warning-foreground",
    },
    {
      key: "prohibited",
      label: "Prohibited",
      items: preview.prohibited,
      icon: BanIcon,
      cls: "text-danger-foreground",
    },
  ];
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold">What the agent may do</h2>
        <p className="text-muted-foreground text-xs">
          From workspace policy, checked before every launch.
        </p>
      </div>
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-1.5">
          <h3 className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", g.cls)}>
            <g.icon className="size-3.5" aria-hidden /> {g.label}
          </h3>
          {g.items.length ? (
            <ul className="flex flex-col gap-1 pl-5 text-sm">
              {g.items.map((i) => (
                <li key={i} className="list-disc first-letter:uppercase">
                  {i}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground pl-5 text-xs">None</p>
          )}
        </div>
      ))}
      <div className="flex flex-col gap-1 border-t pt-3 text-sm">
        <span className="inline-flex items-center justify-between gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <WalletIcon className="size-3.5" aria-hidden /> Workspace budget left
          </span>
          <span
            className={cn(
              "font-medium tabular-nums",
              preview.budgetRemainingUsd <= 0 && "text-danger-foreground",
            )}
          >
            {formatCost(preview.budgetRemainingUsd)}
          </span>
        </span>
        <span className="inline-flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Task ceiling</span>
          <span className="tabular-nums">
            {formatCost(task.costUsd)} of {formatCost(task.budgetUsd)}
          </span>
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- sessions
export function SessionAttempts({ detail }: { detail: TaskDetail }) {
  const now = useNow(
    1000,
    detail.sessions.some((s) => s.status === "running"),
  );
  const active = [...detail.sessions]
    .reverse()
    .find((s) => s.status === "running" || s.status === "waiting" || s.status === "queued");
  const log = useSessionLog(active?.id ?? "", !!active && active.status !== "waiting");
  if (!detail.sessions.length)
    return (
      <EmptyState
        title="No agent sessions yet"
        description="Launch the agent to start the first attempt. Each attempt gets its own isolated workspace."
        className="py-8"
      />
    );
  return (
    <div className="flex flex-col gap-3">
      {active && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              Live log · attempt {active.attempt}
              <SessionStatusBadge status={active.status} />
            </span>
            <Link
              href={`/app/devpilot/sessions/${active.id}`}
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              Open session <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          </div>
          {log.data && (
            <>
              <Progress
                value={log.data.progressPct}
                aria-label={`Session progress ${Math.round(log.data.progressPct)}%`}
              />
              <LogViewer
                lines={log.data.lines}
                live={active.status === "running"}
                redactions={log.data.redactions}
                height="h-64"
              />
            </>
          )}
        </Card>
      )}
      <ol className="flex flex-col gap-2" aria-label="Agent attempts">
        {[...detail.sessions].reverse().map((s) => (
          <li key={s.id}>
            <Card className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/devpilot/sessions/${s.id}`}
                    className="hover:text-primary text-sm font-medium hover:underline"
                  >
                    Attempt {s.attempt}
                  </Link>
                  <SessionStatusBadge status={s.status} />
                  {s.headSha && <CommitSha sha={s.headSha} />}
                </div>
                <time
                  dateTime={s.startedAt}
                  title={formatDateTime(s.startedAt)}
                  className="text-muted-foreground text-xs"
                  suppressHydrationWarning
                >
                  {formatRelative(s.startedAt)}
                </time>
              </div>
              <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <div>
                  <dt className="sr-only">Duration</dt>
                  <dd className="tabular-nums" suppressHydrationWarning>
                    {formatDuration(sessionSeconds(s, now))}
                    {!s.endedAt && " so far"}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">Tokens</dt>
                  <dd className="tabular-nums">
                    {formatTokens(s.tokensIn)} in · {formatTokens(s.tokensOut)} out
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">Cost</dt>
                  <dd className="tabular-nums">{formatCost(s.costUsd)}</dd>
                </div>
                {s.workspace && (
                  <div>
                    <dt className="sr-only">Workspace</dt>
                    <dd>
                      <Link href="/app/devpilot/workspaces" className="hover:underline">
                        <span className="font-mono">{s.workspace.id}</span> · {s.workspace.state}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
              {s.notes && (
                <p className="bg-muted/60 flex items-start gap-2 rounded-md p-2 text-xs">
                  <StickyNoteIcon
                    className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">Notes: </span>
                    {s.notes}
                  </span>
                </p>
              )}
              {s.summary && <p className="text-sm">{s.summary}</p>}
              {s.changedFiles.length > 0 && (
                <ul
                  className="flex flex-col gap-0.5 text-xs"
                  aria-label={`Changed files in attempt ${s.attempt}`}
                >
                  {s.changedFiles.map((f) => (
                    <li key={f.path} className="flex items-center gap-2">
                      <FileCodeIcon
                        className="text-muted-foreground size-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate font-mono">{f.path}</span>
                      <span className="text-success-foreground tabular-nums">+{f.additions}</span>
                      <span className="text-danger-foreground tabular-nums">−{f.deletions}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- approvals
export function TaskApprovals({ approvals }: { approvals: Approval[] }) {
  const pending = approvals.filter((a) => a.status === "pending");
  if (!approvals.length) return null;
  return (
    <Card className={cn("flex flex-col gap-3 p-4", pending.length && "border-warning/50")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Approvals</h2>
        <Link href="/app/approvals" className="text-primary text-xs hover:underline">
          Approval centre
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {approvals.map((a) => (
          <li key={a.id} className="flex flex-col gap-1 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <ToneBadge
                tone={
                  a.status === "pending"
                    ? "warning"
                    : a.status === "approved"
                      ? "success"
                      : a.status === "rejected"
                        ? "danger"
                        : "neutral"
                }
                pulse={a.status === "pending"}
              >
                {a.status === "pending" ? "Pending" : a.status[0].toUpperCase() + a.status.slice(1)}
              </ToneBadge>
              <span className="text-muted-foreground text-xs">
                {APPROVAL_ACTION_LABEL[a.action]}
              </span>
            </span>
            <span className="font-medium">{a.title}</span>
            <span className="text-muted-foreground text-xs" suppressHydrationWarning>
              Requested {formatRelative(a.requestedAt)} · needs {a.approverRole} or above
            </span>
          </li>
        ))}
      </ul>
      {pending.length > 0 && (
        <Button asChild size="sm" className="w-fit">
          <Link href="/app/approvals">
            Review {pending.length === 1 ? "request" : `${pending.length} requests`}{" "}
            <ArrowRightIcon />
          </Link>
        </Button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- PR + verification
export function PullRequestCard({ detail }: { detail: TaskDetail }) {
  const pr = detail.pullRequest;
  if (!pr)
    return (
      <EmptyState
        icon={GitPullRequestIcon}
        title="No pull request yet"
        description="When the agent finishes, ForgePilot opens a PR on the task branch and ShipSafe verifies it."
        className="py-8"
      />
    );
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={`/app/pull-requests/${pr.id}`}
              className="hover:text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
            >
              <GitPullRequestIcon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">
                #{pr.number} {pr.title}
              </span>
            </Link>
            <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
              <ActorChip actor={pr.authorResolved} className="text-xs" />
              <span className="font-mono">{pr.branch}</span>
              <CommitSha sha={pr.headSha} />
              <span className="text-success-foreground tabular-nums">+{pr.additions}</span>
              <span className="text-danger-foreground tabular-nums">−{pr.deletions}</span>
            </span>
          </div>
          <RunStatusBadge status={pr.checkStatus} prefix="ShipSafe" />
        </div>
        <p className="text-muted-foreground text-xs">
          {pr.status === "merged"
            ? "Merged in GitHub."
            : pr.checkStatus === "passed"
              ? "Verification passed. A human reviews and merges in GitHub; ForgePilot never merges on its own."
              : pr.checkStatus === "failed"
                ? "Verification failed. Fix the defect before this PR can be reviewed."
                : pr.checkStatus === "errored"
                  ? "ShipSafe hit an infrastructure problem. That's never blamed on the change; it will be rerun."
                  : "ShipSafe is verifying this change."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/pull-requests/${pr.id}`}>Verification details</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={pr.url} target="_blank" rel="noreferrer">
              View in GitHub <ExternalLinkIcon />
            </a>
          </Button>
        </div>
      </Card>
      {detail.runs.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border" aria-label="Verification runs">
          {detail.runs.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                <RunStatusBadge status={r.status} />
                <Link
                  href={`/app/shipsafe/runs/${r.id}`}
                  className="hover:text-primary font-mono text-xs hover:underline"
                >
                  {r.id}
                </Link>
                <CommitSha sha={r.headSha} />
                {r.retestOf && <span className="text-muted-foreground text-xs">retest</span>}
              </span>
              <span className="text-muted-foreground flex items-center gap-3 text-xs tabular-nums">
                <span>
                  {r.totals.passed} passed · {r.totals.failed} failed
                  {r.totals.flaky ? ` · ${r.totals.flaky} flaky` : ""}
                </span>
                <span>{r.durationSec ? formatDuration(r.durationSec) : "running…"}</span>
                <time dateTime={r.startedAt} suppressHydrationWarning>
                  {formatRelative(r.startedAt)}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- closed loop
/** Failure → bug → fix task → retest. Shown whenever the task is part of a loop. */
export function FixLoop({ detail }: { detail: TaskDetail }) {
  const { bug, children, task } = detail;
  if (!bug && !children.length) return null;
  const passedChild = children.find((c) => c.status === "review_ready" || c.status === "completed");
  return (
    <Card className={cn("flex flex-col gap-4 p-4", bug?.status === "open" && "border-danger/40")}>
      <div className="flex items-center gap-2">
        <WrenchIcon className="text-muted-foreground size-4" aria-hidden />
        <h2 className="text-sm font-semibold">Fix loop</h2>
      </div>
      {bug && <BugBlock bug={bug} task={task} />}
      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-medium">Fix tasks</h3>
          <ul className="flex flex-col divide-y rounded-md border">
            {children.map((c) => (
              <ChildRow key={c.id} task={c} />
            ))}
          </ul>
        </div>
      )}
      {passedChild && (
        <p
          role="status"
          className="bg-success-soft text-success-foreground flex items-start gap-2 rounded-md p-3 text-sm"
        >
          <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            The retest passed. The fix is on the same pull request
            {detail.pullRequest ? ` (#${detail.pullRequest.number})` : ""} and is ready for human
            review.
          </span>
        </p>
      )}
    </Card>
  );
}

function ChildRow({ task }: { task: Task }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-sm">
      <Link
        href={`/app/devpilot/tasks/${task.id}`}
        className="hover:text-primary min-w-0 truncate font-medium hover:underline"
      >
        {task.title}
      </Link>
      <TaskStatusBadge status={task.status} />
    </li>
  );
}

function BugBlock({ bug, task }: { bug: Bug; task: Task }) {
  const role = useSession().data?.role;
  const action = useBugAction(bug.id);
  const isFixTask = bug.taskId === task.id;
  const allowed = can(role, "bug.manage");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <BugIcon className="text-danger-foreground size-4" aria-hidden />
        <Link
          href={`/app/shipsafe/bugs/${bug.id}`}
          className="hover:text-primary text-sm font-medium hover:underline"
        >
          {bug.title}
        </Link>
        <SeverityBadge severity={bug.severity} />
        <ToneBadge
          tone={
            bug.status === "open"
              ? "danger"
              : bug.status === "fix_in_progress"
                ? "accent"
                : bug.status === "resolved"
                  ? "success"
                  : "neutral"
          }
          pulse={bug.status === "fix_in_progress"}
        >
          {bug.status === "open"
            ? "Open"
            : bug.status === "fix_in_progress"
              ? "Fix in progress"
              : bug.status === "resolved"
                ? "Resolved"
                : "Won't fix"}
        </ToneBadge>
      </div>
      <p className="text-muted-foreground text-xs">
        {isFixTask
          ? "This task was created to fix a product defect ShipSafe found on "
          : "ShipSafe classified this as a product defect on "}
        <CommitSha sha={bug.commitSha} />. Suspected cause: {bug.suspectedCause}
      </p>
      {!isFixTask && bug.status === "open" && (
        <div className="flex flex-wrap items-center gap-2">
          <ReasonTip
            reason={
              allowed
                ? undefined
                : "Viewers can't create fix tasks. Ask a workspace admin for Member access."
            }
          >
            <Button
              size="sm"
              disabled={!allowed || action.isPending}
              onClick={() =>
                action.mutate(
                  { action: "create_fix_task" },
                  {
                    onSuccess: (d) =>
                      toast.success("Fix task created", {
                        description: d.task
                          ? `${d.task.title}. The agent is pushing to the same PR; ShipSafe retests automatically.`
                          : undefined,
                      }),
                    onError: (e) =>
                      toast.error("Couldn't create a fix task", { description: e.message }),
                  },
                )
              }
            >
              <WrenchIcon /> {action.isPending ? "Creating…" : "Create fix task"}
            </Button>
          </ReasonTip>
          <span className="text-muted-foreground text-xs">
            Keeps the failing commit, logs and evidence as context. Retries are capped.
          </span>
        </div>
      )}
      {!isFixTask && bug.taskId && bug.status !== "open" && (
        <Link
          href={`/app/devpilot/tasks/${bug.taskId}`}
          className="text-primary inline-flex w-fit items-center gap-1 text-xs hover:underline"
        >
          Open the fix task <ArrowRightIcon className="size-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}
