"use client";
import { useMemo } from "react";
import Link from "next/link";
import { GitPullRequestIcon, ShieldAlertIcon, WrenchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorChip } from "@/components/shared/actor-chip";
import { DataTable, type Column } from "@/components/shared/data-table";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { RunStatusBadge, TaskStatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { findingHref } from "@/components/codekeeper/finding-ui";
import {
  MiniPipeline,
  PIPELINE_STAGES,
  PipelineFunnel,
  taskStages,
  type StageKey,
  type StageState,
} from "@/components/codekeeper/maintenance-pipeline";
import { useCodeKeeperOverview, useFindings, useTasks } from "@/lib/api/hooks";
import type { FindingListItem, TaskListItem, TestRunStatus } from "@/lib/schemas";
import { formatRelative, formatUsd } from "@/lib/domain/format";

const RUN_STATUSES = new Set(["queued", "running", "passed", "failed", "errored"]);
type Row = TaskListItem & { finding: FindingListItem | null; stages: Record<StageKey, StageState> };

export default function MaintenancePage() {
  const tasks = useTasks({ source: "codekeeper_finding" });
  const findings = useFindings();
  const overview = useCodeKeeperOverview();

  const rows: Row[] = useMemo(() => {
    const byTask = new Map<string, FindingListItem>();
    const byId = new Map<string, FindingListItem>();
    (findings.data ?? []).forEach((f) => {
      byId.set(f.id, f);
      if (f.taskId) byTask.set(f.taskId, f);
    });
    const scans = overview.data?.recentScans ?? [];
    return (tasks.data ?? []).map((t) => {
      const finding = (t.findingId ? byId.get(t.findingId) : undefined) ?? byTask.get(t.id) ?? null;
      return { ...t, finding, stages: taskStages(t, finding, scans) };
    });
  }, [tasks.data, findings.data, overview.data]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(PIPELINE_STAGES.map((p) => [p.key, 0])) as Record<
      StageKey,
      number
    >;
    rows.forEach((r) =>
      PIPELINE_STAGES.forEach(
        (p) => r.stages[p.key] === "done" && p.key !== "detected" && c[p.key]++,
      ),
    );
    c.detected = Math.max(
      rows.length,
      (findings.data ?? []).filter((f) => f.status !== "suppressed").length,
    );
    return c;
  }, [rows, findings.data]);

  const columns: Column<Row>[] = [
    {
      id: "title",
      header: "Task",
      cell: (t) => (
        <span className="flex max-w-md min-w-0 flex-col gap-0.5">
          <Link
            href={`/app/devpilot/tasks/${t.id}`}
            className="line-clamp-2 font-medium hover:underline"
          >
            {t.title}
          </Link>
          <span className="text-muted-foreground truncate text-xs">
            {t.repositoryName} · {formatRelative(t.createdAt)}
          </span>
        </span>
      ),
      sortValue: (t) => t.title,
    },
    {
      id: "status",
      header: "Status",
      cell: (t) => <TaskStatusBadge status={t.status} />,
      sortValue: (t) => t.status,
    },
    {
      id: "pipeline",
      header: "Pipeline",
      cell: (t) => <MiniPipeline stages={t.stages} />,
      hideBelow: "md",
    },
    {
      id: "agent",
      header: "Agent",
      cell: (t) =>
        t.agent ? (
          <ActorChip
            actor={{ type: "agent", id: t.agent.id, name: t.agent.name, detail: t.agent.model }}
          />
        ) : (
          <span className="text-muted-foreground text-xs">Unassigned</span>
        ),
      hideBelow: "xl",
    },
    {
      id: "pr",
      header: "PR · ShipSafe",
      cell: (t) =>
        t.pullRequest ? (
          <span className="flex flex-col items-start gap-1">
            <Link
              href={`/app/pull-requests/${t.pullRequest.id}`}
              className="inline-flex items-center gap-1 text-sm hover:underline"
            >
              <GitPullRequestIcon className="size-3.5" aria-hidden />#{t.pullRequest.number}
              <span className="text-muted-foreground text-xs">
                {t.pullRequest.status === "merged" ? "merged" : t.pullRequest.status}
              </span>
            </Link>
            {t.latestRunStatus && RUN_STATUSES.has(t.latestRunStatus) ? (
              <RunStatusBadge status={t.latestRunStatus as TestRunStatus} />
            ) : (
              <ToneBadge tone="neutral">Not verified</ToneBadge>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">No PR yet</span>
        ),
      sortValue: (t) => t.pullRequest?.number ?? null,
    },
    {
      id: "finding",
      header: "Finding",
      cell: (t) =>
        t.finding ? (
          <Link
            href={findingHref(t.finding.id)}
            className="inline-flex max-w-48 items-center gap-1 text-xs hover:underline"
          >
            <ShieldAlertIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {t.finding.advisoryId ?? t.finding.package ?? t.finding.title}
            </span>
          </Link>
        ) : (
          <span
            className="text-muted-foreground text-xs"
            title="The originating finding is no longer in this workspace's records"
          >
            Not linked
          </span>
        ),
      hideBelow: "lg",
    },
    {
      id: "cost",
      header: "Cost",
      cell: (t) => <span className="text-xs">{formatUsd(t.costUsd, true)}</span>,
      sortValue: (t) => t.costUsd,
      align: "right",
      hideBelow: "xl",
    },
  ];

  const loading = tasks.isPending || findings.isPending;
  const mergedCount = counts.merged;
  const prCount = counts.pr;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Maintenance tasks"
        description="DevPilot tasks created from CodeKeeper findings. Each one goes through an agent PR, ShipSafe verification and human review before merge in GitHub."
        meta={<MockDataBadge />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/app/codekeeper/findings">
              <ShieldAlertIcon /> Findings
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-28 w-full" />
          <TableSkeleton rows={6} cols={5} />
        </div>
      ) : tasks.error ? (
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={WrenchIcon}
          title="No maintenance tasks yet"
          description="Open a finding and choose “Create maintenance task”. An agent proposes the fix in an isolated workspace and ShipSafe verifies it before anyone reviews."
          action={
            <Button asChild size="sm">
              <Link href="/app/codekeeper/findings">Review findings</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Section
            title="Pipeline"
            description={`${rows.length} maintenance ${rows.length === 1 ? "task" : "tasks"}; ${prCount} reached a PR and ${mergedCount} ${mergedCount === 1 ? "was" : "were"} merged by a human. Nothing merges automatically.`}
          >
            <PipelineFunnel counts={counts} />
          </Section>
          <Section title="Tasks" description="Newest first">
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(t) => t.id}
              rowHref={(t) => `/app/devpilot/tasks/${t.id}`}
              caption="Maintenance tasks from CodeKeeper findings"
            />
          </Section>
        </>
      )}
    </div>
  );
}
