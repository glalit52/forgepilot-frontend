"use client";
import Link from "next/link";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestIcon,
  MessageSquareWarningIcon,
  XCircleIcon,
} from "lucide-react";
import type {
  Finding,
  PullRequestListItem,
  RepositorySummary,
  TaskListItem,
  TestRunListItem,
  TestRunStatus,
} from "@/lib/schemas";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ActorChip } from "@/components/shared/actor-chip";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { HealthPill } from "@/components/shared/health-score";
import { CommitSha } from "@/components/shared/misc";
import { EmptyState } from "@/components/shared/states";
import {
  FailureClassBadge,
  RunStatusBadge,
  SeverityBadge,
  TaskStatusBadge,
  ToneBadge,
} from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { FINDING_CATEGORY_LABEL } from "@/lib/domain/labels";
import { formatDuration } from "@/lib/domain/format";
import type { FailureClass } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./relative-time";

const RUN_STATUSES = new Set(["queued", "running", "passed", "failed", "errored"]);
export function asRunStatus(s: string | null | undefined): TestRunStatus | null {
  return s && RUN_STATUSES.has(s) ? (s as TestRunStatus) : null;
}

// ---------------------------------------------------------------- pull requests

export const REVIEW_STATE_LABEL: Record<PullRequestListItem["reviewState"], string> = {
  review_requested: "Review requested",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export function PrStateIcon({
  status,
  className,
}: {
  status: PullRequestListItem["status"];
  className?: string;
}) {
  const Icon =
    status === "merged"
      ? GitMergeIcon
      : status === "closed"
        ? GitPullRequestClosedIcon
        : GitPullRequestIcon;
  return (
    <Icon
      className={cn(
        "size-4 shrink-0",
        status === "merged"
          ? "text-primary"
          : status === "closed"
            ? "text-muted-foreground"
            : "text-success-foreground",
        className,
      )}
      aria-label={status === "merged" ? "Merged" : status === "closed" ? "Closed" : "Open"}
      role="img"
    />
  );
}

export function ReviewStateBadge({
  pr,
}: {
  pr: Pick<PullRequestListItem, "reviewState" | "status">;
}) {
  if (pr.status === "merged") return <ToneBadge tone="accent">Merged</ToneBadge>;
  const tone =
    pr.reviewState === "approved"
      ? "success"
      : pr.reviewState === "changes_requested"
        ? "danger"
        : "warning";
  return <ToneBadge tone={tone}>{REVIEW_STATE_LABEL[pr.reviewState]}</ToneBadge>;
}

export function RequiredChecks({ met, status }: { met: boolean; status: TestRunStatus }) {
  if (status === "running" || status === "queued")
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <CircleDashedIcon className="size-3.5 animate-spin" aria-hidden /> Pending
      </span>
    );
  return met ? (
    <span className="text-success-foreground inline-flex items-center gap-1 text-xs font-medium">
      <CheckCircle2Icon className="size-3.5" aria-hidden /> Met
    </span>
  ) : (
    <span className="text-danger-foreground inline-flex items-center gap-1 text-xs font-medium">
      <XCircleIcon className="size-3.5" aria-hidden /> Not met
    </span>
  );
}

export function prColumns(opts: { hideRepo?: boolean } = {}): Column<PullRequestListItem>[] {
  const cols: Column<PullRequestListItem>[] = [
    {
      id: "title",
      header: "Pull request",
      sortValue: (p) => p.number,
      className: "min-w-0 max-w-[26rem]",
      cell: (p) => (
        <div className="flex min-w-0 items-start gap-2">
          <PrStateIcon status={p.status} className="mt-0.5" />
          <div className="flex min-w-0 flex-col">
            <Link
              href={`/app/pull-requests/${p.id}`}
              className="hover:text-primary truncate font-medium hover:underline"
            >
              <span className="text-muted-foreground font-normal tabular-nums">#{p.number}</span>{" "}
              {p.title}
            </Link>
            <span className="text-muted-foreground truncate font-mono text-[11px]">{p.branch}</span>
          </div>
        </div>
      ),
    },
    {
      id: "repo",
      header: "Repository",
      sortValue: (p) => p.repositoryName,
      hideBelow: "xl",
      cell: (p) => <span className="text-muted-foreground text-xs">{p.repositoryName}</span>,
    },
    {
      id: "author",
      header: "Author",
      sortValue: (p) => p.authorResolved.name,
      cell: (p) => <ActorChip actor={p.authorResolved} showDetail={false} />,
    },
    {
      id: "shipsafe",
      header: "ShipSafe",
      sortValue: (p) => p.checkStatus,
      cell: (p) => <RunStatusBadge status={p.checkStatus} />,
    },
    {
      id: "checks",
      header: "Required checks",
      sortValue: (p) => (p.requiredChecksMet ? 1 : 0),
      hideBelow: "lg",
      cell: (p) => <RequiredChecks met={p.requiredChecksMet} status={p.checkStatus} />,
    },
    {
      id: "bugs",
      header: "Bugs",
      align: "right",
      sortValue: (p) => p.openBugs,
      hideBelow: "md",
      cell: (p) =>
        p.openBugs ? (
          <span className="text-danger-foreground font-medium">{p.openBugs}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      id: "ai",
      header: "AI-authored",
      sortValue: (p) => p.aiAuthoredPct,
      hideBelow: "xl",
      cell: (p) => <AiCodeFlag pct={p.aiAuthoredPct} compact />,
    },
    {
      id: "review",
      header: "Review",
      sortValue: (p) => p.reviewState,
      hideBelow: "lg",
      cell: (p) => <ReviewStateBadge pr={p} />,
    },
    {
      id: "opened",
      header: "Opened",
      sortValue: (p) => p.openedAt,
      hideBelow: "md",
      cell: (p) => <RelativeTime iso={p.openedAt} className="text-muted-foreground text-xs" />,
    },
  ];
  return opts.hideRepo ? cols.filter((c) => c.id !== "repo") : cols;
}

export function PullRequestTable({
  rows,
  hideRepo,
  empty,
  pageSize = 25,
}: {
  rows: PullRequestListItem[];
  hideRepo?: boolean;
  empty?: React.ReactNode;
  pageSize?: number;
}) {
  return (
    <DataTable
      rows={rows}
      columns={prColumns({ hideRepo })}
      getRowId={(p) => p.id}
      rowHref={(p) => `/app/pull-requests/${p.id}`}
      caption="Pull requests"
      pageSize={pageSize}
      empty={
        empty ?? (
          <EmptyState
            icon={GitPullRequestIcon}
            title="No pull requests"
            description="Agent and human PRs appear here as soon as they're opened in GitHub."
          />
        )
      }
    />
  );
}

// ---------------------------------------------------------------- runs

export function RunList({ runs, limit = 8 }: { runs: TestRunListItem[]; limit?: number }) {
  if (!runs.length)
    return (
      <EmptyState
        title="No verification runs yet"
        description="ShipSafe runs on every pull request, or start one manually from ShipSafe."
      />
    );
  return (
    <ul className="divide-y rounded-lg border">
      {runs.slice(0, limit).map((r) => {
        const classes = Object.entries(r.failureClasses).filter(([, n]) => n > 0);
        return (
          <li key={r.id}>
            <Link
              href={`/app/shipsafe/runs/${r.id}`}
              className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
            >
              <RunStatusBadge status={r.status} />
              <span className="min-w-0 flex-1 truncate">
                {r.pullRequestNumber ? (
                  <>
                    <span className="text-muted-foreground tabular-nums">
                      #{r.pullRequestNumber}
                    </span>{" "}
                    {r.pullRequestTitle}
                  </>
                ) : (
                  <span>
                    {r.trigger} on <span className="font-mono text-xs">{r.branch}</span>
                  </span>
                )}
              </span>
              {r.retestOf && (
                <Badge variant="outline" className="text-[11px]">
                  Retest
                </Badge>
              )}
              {classes.map(([c, n]) => (
                <span key={c} className="inline-flex items-center gap-1">
                  <FailureClassBadge classification={c as FailureClass} />
                  <span className="text-muted-foreground text-xs tabular-nums">×{n}</span>
                </span>
              ))}
              <span className="text-muted-foreground text-xs tabular-nums">
                {r.totals.passed}✓ {r.totals.failed ? `${r.totals.failed}✗` : ""}
              </span>
              <CommitSha sha={r.headSha} className="text-muted-foreground hidden sm:inline-flex" />
              <span className="text-muted-foreground w-24 text-right text-xs">
                {r.durationSec ? formatDuration(r.durationSec) : "running…"}
                {" · "}
                <RelativeTime iso={r.startedAt} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- findings

export function FindingList({
  findings,
  limit = 8,
  showRepo = false,
}: {
  findings: (Finding & { repositoryName?: string })[];
  limit?: number;
  showRepo?: boolean;
}) {
  if (!findings.length)
    return (
      <EmptyState
        icon={MessageSquareWarningIcon}
        title="No open findings"
        description="CodeKeeper found nothing that needs attention on the last scan."
      />
    );
  return (
    <ul className="divide-y rounded-lg border">
      {findings.slice(0, limit).map((f) => (
        <li key={f.id}>
          <Link
            href={`/app/codekeeper/findings?finding=${f.id}`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
          >
            <SeverityBadge severity={f.severity} />
            <span className="min-w-0 flex-1 truncate font-medium">{f.title}</span>
            <span className="text-muted-foreground text-xs">
              {FINDING_CATEGORY_LABEL[f.category]}
              {showRepo && f.repositoryName ? ` · ${f.repositoryName}` : ""}
            </span>
            {f.status === "task_created" && <ToneBadge tone="info">Task created</ToneBadge>}
            {f.status === "suppressed" && <ToneBadge tone="neutral">Suppressed</ToneBadge>}
            <RelativeTime iso={f.detectedAt} className="text-muted-foreground text-xs" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- tasks

export function TaskList({ tasks, limit = 10 }: { tasks: TaskListItem[]; limit?: number }) {
  if (!tasks.length)
    return (
      <EmptyState
        title="No tasks yet"
        description="Delegate a change to an agent. It will open a PR that ShipSafe verifies."
      />
    );
  return (
    <ul className="divide-y rounded-lg border">
      {tasks.slice(0, limit).map((t) => (
        <li key={t.id}>
          <Link
            href={`/app/devpilot/tasks/${t.id}`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
          >
            <TaskStatusBadge status={t.status} />
            <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
            {t.agent && (
              <ActorChip
                actor={{ type: "agent", id: t.agent.id, name: t.agent.name, detail: t.agent.model }}
                className="text-xs"
              />
            )}
            {t.verified && <ToneBadge tone="success">Verified</ToneBadge>}
            <RelativeTime iso={t.createdAt} className="text-muted-foreground text-xs" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- repositories

export function IndexStatusBadge({ status }: { status: RepositorySummary["indexStatus"] }) {
  if (status === "ready") return <ToneBadge tone="success">Indexed</ToneBadge>;
  if (status === "indexing")
    return (
      <ToneBadge tone="accent" pulse>
        Indexing…
      </ToneBadge>
    );
  if (status === "error") return <ToneBadge tone="danger">Index failed</ToneBadge>;
  return <ToneBadge tone="neutral">Pending</ToneBadge>;
}

export function RepositoryTable({
  rows,
  hideProject,
  empty,
}: {
  rows: RepositorySummary[];
  hideProject?: boolean;
  empty?: React.ReactNode;
}) {
  const cols: Column<RepositorySummary>[] = [
    {
      id: "name",
      header: "Repository",
      sortValue: (r) => r.fullName,
      cell: (r) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/app/repositories/${r.id}`}
            className="hover:text-primary truncate font-medium hover:underline"
          >
            {r.fullName}
          </Link>
          <span className="text-muted-foreground truncate text-xs">
            {r.languages.join(", ")}
            {r.frameworks.length ? ` · ${r.frameworks.join(", ")}` : ""}
          </span>
        </div>
      ),
    },
    {
      id: "project",
      header: "Project",
      sortValue: (r) => r.projectName,
      hideBelow: "lg",
      cell: (r) => <span className="text-muted-foreground text-xs">{r.projectName}</span>,
    },
    {
      id: "health",
      header: "Health",
      sortValue: (r) => r.health.score,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <HealthPill score={r.health.score} />
          {r.healthDelta !== 0 && (
            <span
              className={cn(
                "text-xs tabular-nums",
                r.healthDelta > 0 ? "text-success-foreground" : "text-danger-foreground",
              )}
            >
              {r.healthDelta > 0 ? "+" : ""}
              {r.healthDelta}
            </span>
          )}
          {r.scanRunning && (
            <ToneBadge tone="accent" pulse>
              Scanning
            </ToneBadge>
          )}
        </span>
      ),
    },
    {
      id: "index",
      header: "Index",
      sortValue: (r) => r.indexStatus,
      hideBelow: "xl",
      cell: (r) => <IndexStatusBadge status={r.indexStatus} />,
    },
    {
      id: "lastRun",
      header: "Last run",
      sortValue: (r) => r.lastRunAt,
      hideBelow: "md",
      cell: (r) => {
        const st = asRunStatus(r.lastRunStatus);
        return st ? (
          <span className="inline-flex items-center gap-1.5">
            <RunStatusBadge status={st} />
            {r.lastRunAt && (
              <RelativeTime iso={r.lastRunAt} className="text-muted-foreground text-xs" />
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Never</span>
        );
      },
    },
    {
      id: "prs",
      header: "Open PRs",
      align: "right",
      sortValue: (r) => r.openPrs,
      cell: (r) => r.openPrs,
    },
    {
      id: "findings",
      header: "Findings",
      align: "right",
      sortValue: (r) => r.openFindings,
      cell: (r) => (
        <span>
          {r.openFindings}
          {r.criticalFindings > 0 && (
            <span className="text-danger-foreground ml-1 text-xs">
              ({r.criticalFindings} critical)
            </span>
          )}
        </span>
      ),
    },
    {
      id: "suites",
      header: "Suites",
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.suites,
      cell: (r) => r.suites,
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={hideProject ? cols.filter((c) => c.id !== "project") : cols}
      getRowId={(r) => r.id}
      rowHref={(r) => `/app/repositories/${r.id}`}
      caption="Repositories"
      empty={
        empty ?? (
          <EmptyState
            title="No repositories connected"
            description="Install the GitHub App on the repositories you choose. ForgePilot reads code, opens PRs and posts Check Runs."
          />
        )
      }
    />
  );
}
