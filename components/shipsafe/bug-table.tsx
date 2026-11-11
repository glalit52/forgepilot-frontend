"use client";
import Link from "next/link";
import type { Column } from "@/components/shared/data-table";
import { DataTable } from "@/components/shared/data-table";
import { CommitSha } from "@/components/shared/misc";
import { SeverityBadge, TaskStatusBadge, ToneBadge } from "@/components/shared/status-badge";
import type { BugListItem, Severity } from "@/lib/schemas";
import type { Tone } from "@/lib/domain/status";
import { formatDateTime, formatRelative } from "@/lib/domain/format";

export const BUG_STATUS: Record<
  BugListItem["status"],
  { label: string; tone: Tone; help: string }
> = {
  open: {
    label: "Open",
    tone: "danger",
    help: "Confirmed product defect with no fix in progress yet.",
  },
  fix_in_progress: {
    label: "Fix in progress",
    tone: "accent",
    help: "A DevPilot fix task is working on it. ShipSafe retests the new commit automatically.",
  },
  resolved: {
    label: "Resolved",
    tone: "success",
    help: "The failing test passes again on a newer commit, or someone marked it resolved.",
  },
  wont_fix: { label: "Won't fix", tone: "neutral", help: "Closed deliberately without a fix." },
};

export function BugStatusBadge({ status }: { status: BugListItem["status"] }) {
  const s = BUG_STATUS[status];
  return (
    <ToneBadge tone={s.tone} pulse={status === "fix_in_progress"} title={s.help}>
      {s.label}
    </ToneBadge>
  );
}

const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function bugColumns(): Column<BugListItem>[] {
  return [
    {
      id: "severity",
      header: "Severity",
      cell: (b) => <SeverityBadge severity={b.severity} />,
      sortValue: (b) => SEV_RANK[b.severity],
    },
    {
      id: "bug",
      header: "Bug",
      cell: (b) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/app/shipsafe/bugs/${b.id}`}
            className="truncate font-medium hover:underline"
          >
            {b.title}
          </Link>
          <span className="text-muted-foreground truncate font-mono text-xs" title={b.testName}>
            {b.testName || "—"}
          </span>
        </div>
      ),
      className: "max-w-[24rem]",
      sortValue: (b) => b.title,
    },
    {
      id: "status",
      header: "Status",
      cell: (b) => <BugStatusBadge status={b.status} />,
      sortValue: (b) => b.status,
    },
    {
      id: "pr",
      header: "PR",
      cell: (b) =>
        b.pullRequestId && b.pullRequestNumber ? (
          <Link href={`/app/pull-requests/${b.pullRequestId}`} className="text-xs hover:underline">
            #{b.pullRequestNumber}
          </Link>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      hideBelow: "md",
    },
    {
      id: "repo",
      header: "Repository · commit",
      cell: (b) => (
        <span className="flex flex-col gap-0.5 text-xs">
          <span className="truncate">{b.repositoryName}</span>
          <CommitSha sha={b.commitSha} />
        </span>
      ),
      hideBelow: "lg",
    },
    {
      id: "fix",
      header: "Fix task",
      cell: (b) =>
        b.taskId && b.taskStatus ? (
          <Link
            href={`/app/devpilot/tasks/${b.taskId}`}
            className="inline-flex"
            aria-label={`Fix task ${b.taskId}`}
          >
            <TaskStatusBadge status={b.taskStatus} />
          </Link>
        ) : (
          <span className="text-muted-foreground text-xs">None yet</span>
        ),
      hideBelow: "md",
    },
    {
      id: "created",
      header: "Found",
      align: "right",
      cell: (b) => (
        <span
          className="text-muted-foreground text-xs whitespace-nowrap"
          title={formatDateTime(b.createdAt)}
          suppressHydrationWarning
        >
          {formatRelative(b.createdAt)}
        </span>
      ),
      sortValue: (b) => b.createdAt,
    },
  ];
}

export function BugTable({
  bugs,
  empty,
  pageSize = 25,
}: {
  bugs: BugListItem[];
  empty?: React.ReactNode;
  pageSize?: number;
}) {
  return (
    <DataTable
      rows={bugs}
      columns={bugColumns()}
      getRowId={(b) => b.id}
      rowHref={(b) => `/app/shipsafe/bugs/${b.id}`}
      empty={empty}
      pageSize={pageSize}
      caption="Bugs found by ShipSafe"
    />
  );
}
