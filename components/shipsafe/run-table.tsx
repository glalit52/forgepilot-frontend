"use client";
import Link from "next/link";
import type { Column } from "@/components/shared/data-table";
import { DataTable } from "@/components/shared/data-table";
import { CommitSha } from "@/components/shared/misc";
import { FailureClassBadge, RunStatusBadge } from "@/components/shared/status-badge";
import type { FailureClass, TestRunListItem } from "@/lib/schemas";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";
import { TriggerLabel } from "./helpers";

export function FailureClassList({ classes }: { classes: Record<string, number> }) {
  const entries = Object.entries(classes).filter(([, n]) => n > 0);
  if (!entries.length) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map(([c, n]) => (
        <span key={c} className="inline-flex items-center gap-0.5">
          <FailureClassBadge classification={c as FailureClass} />
          {n > 1 && <span className="text-muted-foreground text-xs tabular-nums">×{n}</span>}
        </span>
      ))}
    </span>
  );
}

export function runColumns({
  showRepo = true,
}: { showRepo?: boolean } = {}): Column<TestRunListItem>[] {
  const cols: Column<TestRunListItem>[] = [
    {
      id: "status",
      header: "Status",
      cell: (r) => <RunStatusBadge status={r.status} />,
      sortValue: (r) => r.status,
    },
    {
      id: "run",
      header: "Run",
      cell: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/app/shipsafe/runs/${r.id}`}
            className="truncate font-medium hover:underline"
          >
            {r.pullRequestNumber ? (
              <>
                <span className="text-muted-foreground">#{r.pullRequestNumber}</span>{" "}
                {r.pullRequestTitle}
              </>
            ) : (
              <span className="font-mono text-[13px]">{r.branch}</span>
            )}
          </Link>
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
            {showRepo && <span className="truncate">{r.repositoryName}</span>}
            <CommitSha sha={r.headSha} />
          </span>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    {
      id: "trigger",
      header: "Trigger",
      cell: (r) => <TriggerLabel trigger={r.trigger} />,
      sortValue: (r) => r.trigger,
      hideBelow: "md",
    },
    {
      id: "tests",
      header: "Tests",
      cell: (r) =>
        r.status === "running" || r.status === "queued" ? (
          <span className="text-muted-foreground text-xs">in progress</span>
        ) : (
          <span className="text-xs tabular-nums">
            <span className="text-success-foreground">{r.totals.passed}</span>
            {" · "}
            <span
              className={
                r.totals.failed ? "text-danger-foreground font-medium" : "text-muted-foreground"
              }
            >
              {r.totals.failed} failed
            </span>
            {r.totals.flaky ? (
              <span className="text-warning-foreground"> · {r.totals.flaky} flaky</span>
            ) : null}
          </span>
        ),
      hideBelow: "lg",
    },
    {
      id: "classes",
      header: "Failure classes",
      cell: (r) => <FailureClassList classes={r.failureClasses} />,
      hideBelow: "xl",
    },
    {
      id: "duration",
      header: "Duration",
      align: "right",
      cell: (r) =>
        r.durationSec ? (
          formatDuration(r.durationSec)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (r) => r.durationSec,
      hideBelow: "md",
    },
    {
      id: "started",
      header: "Started",
      align: "right",
      cell: (r) => (
        <span
          className="text-muted-foreground text-xs whitespace-nowrap"
          title={formatDateTime(r.startedAt)}
          suppressHydrationWarning
        >
          {formatRelative(r.startedAt)}
        </span>
      ),
      sortValue: (r) => r.startedAt,
    },
  ];
  return cols;
}

export function RunTable({
  runs,
  showRepo = true,
  pageSize = 25,
  empty,
  caption = "Verification runs",
}: {
  runs: TestRunListItem[];
  showRepo?: boolean;
  pageSize?: number;
  empty?: React.ReactNode;
  caption?: string;
}) {
  return (
    <DataTable
      rows={runs}
      columns={runColumns({ showRepo })}
      getRowId={(r) => r.id}
      rowHref={(r) => `/app/shipsafe/runs/${r.id}`}
      pageSize={pageSize}
      empty={empty}
      caption={caption}
    />
  );
}
