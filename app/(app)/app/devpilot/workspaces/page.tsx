"use client";
import Link from "next/link";
import {
  BoxesIcon,
  ClockIcon,
  GitBranchIcon,
  KeyRoundIcon,
  LockIcon,
  NetworkIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { CommitSha, MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { SessionStatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { NewTaskButton } from "@/components/devpilot/new-task-button";
import {
  NETWORK_LABEL,
  WORKSPACE_STATE_LABEL,
  WORKSPACE_STATE_TONE,
} from "@/components/devpilot/session-panels";
import { useUrlFilters } from "@/components/devpilot/use-url-filters";
import { useExecutionWorkspaces, type WorkspaceRow } from "@/lib/api/hooks";
import { formatDateTime, formatRelative } from "@/lib/domain/format";
import type { Workspace } from "@/lib/schemas";

const KEYS = ["state"] as const;

/** PRD §9.5, in plain words. */
const ISOLATION = [
  {
    icon: BoxesIcon,
    title: "One workspace per attempt",
    body: "Every agent session gets a fresh container. Nothing is shared between tasks or tenants.",
  },
  {
    icon: GitBranchIcon,
    title: "Pinned to a base commit",
    body: "Checked out at an immutable SHA on its own branch. Unrelated repositories are never mounted.",
  },
  {
    icon: ClockIcon,
    title: "Hard limits",
    body: "CPU, memory, disk and wall-clock limits. Hitting the timeout or budget stops the agent.",
  },
  {
    icon: NetworkIcon,
    title: "Restricted network",
    body: "Outbound traffic goes only to allowlisted hosts. Anything else pauses for approval.",
  },
  {
    icon: KeyRoundIcon,
    title: "Short-lived credentials",
    body: "Repo-scoped tokens that expire within the hour. No production secrets by default.",
  },
  {
    icon: LockIcon,
    title: "Cleaned up afterwards",
    body: "Workspaces are deleted after the session ends, per your retention policy. Logs and diffs stay as evidence.",
  },
];

const columns: Column<WorkspaceRow>[] = [
  {
    id: "workspace",
    header: "Workspace",
    sortValue: (w) => w.id,
    className: "max-w-[20rem]",
    cell: (w) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-xs font-medium">{w.id}</span>
        <Link
          href={`/app/devpilot/sessions/${w.sessionId}`}
          className="hover:text-primary truncate text-sm hover:underline"
          title={w.taskTitle}
        >
          {w.taskTitle}
        </Link>
        <span className="text-muted-foreground truncate font-mono text-[11px]">
          {w.repositoryName}
        </span>
      </div>
    ),
  },
  {
    id: "state",
    header: "State",
    sortValue: (w) => w.state,
    cell: (w) => (
      <ToneBadge tone={WORKSPACE_STATE_TONE[w.state]} pulse={w.state === "active"}>
        {WORKSPACE_STATE_LABEL[w.state]}
      </ToneBadge>
    ),
  },
  {
    id: "session",
    header: "Session",
    hideBelow: "md",
    sortValue: (w) => w.sessionStatus,
    cell: (w) => (
      <span className="flex flex-col items-start gap-1">
        <Link
          href={`/app/devpilot/sessions/${w.sessionId}`}
          className="hover:text-primary font-mono text-xs hover:underline"
        >
          {w.sessionId}
        </Link>
        <SessionStatusBadge status={w.sessionStatus} />
      </span>
    ),
  },
  {
    id: "resources",
    header: "Resources",
    hideBelow: "lg",
    sortValue: (w) => w.cpu,
    cell: (w) => (
      <span className="flex flex-col text-xs">
        <span className="font-mono">{w.image}</span>
        <span className="text-muted-foreground">
          {w.cpu} vCPU · {w.memoryGb} GB · {w.diskGb} GB disk
        </span>
      </span>
    ),
  },
  {
    id: "network",
    header: "Network",
    hideBelow: "xl",
    sortValue: (w) => w.networkPolicy,
    cell: (w) => <span className="text-xs">{NETWORK_LABEL[w.networkPolicy]}</span>,
  },
  {
    id: "creds",
    header: "Credentials",
    hideBelow: "xl",
    cell: (w) => <span className="text-muted-foreground text-xs">{w.credentials}</span>,
    className: "max-w-[14rem]",
  },
  { id: "base", header: "Base", hideBelow: "xl", cell: (w) => <CommitSha sha={w.baseSha} /> },
  {
    id: "cleanup",
    header: "Cleanup",
    sortValue: (w) => w.cleanupAt,
    cell: (w) => (
      <time
        dateTime={w.cleanupAt}
        title={formatDateTime(w.cleanupAt)}
        className="text-muted-foreground text-xs whitespace-nowrap"
        suppressHydrationWarning
      >
        {w.state === "cleaned" ? "Done" : formatRelative(w.cleanupAt)}
      </time>
    ),
  },
];

export default function WorkspacesPage() {
  const [f, setF] = useUrlFilters(KEYS);
  const q = useExecutionWorkspaces();
  const rows = (q.data ?? []).filter((w) => !f.state || w.state === f.state);
  const activeCount = (q.data ?? []).filter((w) => w.state !== "cleaned").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Workspaces"
        description="Isolated execution environments where agents do their work. One per session, cleaned up when it ends."
        meta={
          <>
            <MockDataBadge />
            {q.data && (
              <span className="text-muted-foreground text-xs">{activeCount} active now</span>
            )}
          </>
        }
      />

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <ShieldCheckIcon className="text-success size-4" aria-hidden /> How isolation works
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ISOLATION.map((i) => (
            <li key={i.title} className="flex items-start gap-2.5">
              <span
                className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md"
                aria-hidden
              >
                <i.icon className="size-3.5" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{i.title}</span>
                <span className="text-muted-foreground text-xs">{i.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <FilterBar>
        <FilterSelect
          label="State"
          value={f.state}
          onChange={(v) => setF({ state: v || null })}
          options={(Object.keys(WORKSPACE_STATE_LABEL) as Workspace["state"][]).map((s) => ({
            value: s,
            label: WORKSPACE_STATE_LABEL[s],
          }))}
        />
        {f.state && (
          <Button variant="ghost" size="sm" onClick={() => setF({ state: null })}>
            <XIcon /> Clear filter
          </Button>
        )}
      </FilterBar>

      {q.isPending ? (
        <TableSkeleton rows={6} cols={5} />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(w) => w.id}
          rowHref={(w) => `/app/devpilot/sessions/${w.sessionId}`}
          caption="Execution workspaces"
          empty={
            f.state ? (
              <EmptyState
                icon={BoxesIcon}
                title={`No ${WORKSPACE_STATE_LABEL[f.state as Workspace["state"]]?.toLowerCase() ?? ""} workspaces`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setF({ state: null })}>
                    Show all
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BoxesIcon}
                title="No workspaces yet"
                description="A workspace is created each time an agent starts a session."
                action={<NewTaskButton size="sm" />}
              />
            )
          }
        />
      )}
    </div>
  );
}
