"use client";
import Link from "next/link";
import { TerminalSquareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActorChip } from "@/components/shared/actor-chip";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import { NeedsAnswerChip, NeedsApprovalChip } from "@/components/devpilot/bits";
import { MultiFilter } from "@/components/devpilot/multi-filter";
import { NewTaskButton } from "@/components/devpilot/new-task-button";
import { useUrlFilters } from "@/components/devpilot/use-url-filters";
import {
  agentActor,
  formatCost,
  formatTokens,
  sessionSeconds,
  useNow,
} from "@/components/devpilot/utils";
import { useSessions } from "@/lib/api/hooks";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";
import { SESSION_STATUS_LABEL } from "@/lib/domain/status";
import { SessionStatusSchema, type SessionListItem } from "@/lib/schemas";

const KEYS = ["status"] as const;
const STATUSES = SessionStatusSchema.options;

export default function SessionsPage() {
  const [f, setF] = useUrlFilters(KEYS);
  const q = useSessions(f.status || undefined);
  const live = q.data?.some((s) => s.status === "running") ?? false;
  const now = useNow(1000, live);

  const columns: Column<SessionListItem>[] = [
    {
      id: "task",
      header: "Task",
      className: "max-w-[22rem]",
      sortValue: (s) => s.taskTitle.toLowerCase(),
      cell: (s) => (
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/app/devpilot/sessions/${s.id}`}
            className="hover:text-primary truncate font-medium hover:underline"
            title={s.taskTitle}
          >
            {s.taskTitle}
          </Link>
          <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-mono">{s.id}</span>· attempt {s.attempt}
            {s.status === "waiting" && s.waitingFor?.kind === "approval" && <NeedsApprovalChip />}
            {s.status === "waiting" && s.waitingFor?.kind === "clarification" && (
              <NeedsAnswerChip href={`/app/devpilot/sessions/${s.id}`} />
            )}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (s) => STATUSES.indexOf(s.status),
      cell: (s) => <SessionStatusBadge status={s.status} />,
    },
    {
      id: "agent",
      header: "Agent",
      hideBelow: "lg",
      sortValue: (s) => s.agent.name,
      cell: (s) => <ActorChip actor={agentActor(s.agent)} className="text-xs" />,
    },
    {
      id: "repo",
      header: "Repository",
      hideBelow: "xl",
      sortValue: (s) => s.repositoryName,
      cell: (s) => <span className="font-mono text-xs">{s.repositoryName}</span>,
    },
    {
      id: "duration",
      header: "Duration",
      align: "right",
      hideBelow: "md",
      sortValue: (s) => sessionSeconds(s, now),
      cell: (s) => (
        <span suppressHydrationWarning>
          {formatDuration(s.durationSec ?? sessionSeconds(s, now))}
        </span>
      ),
    },
    {
      id: "tokens",
      header: "Tokens",
      align: "right",
      hideBelow: "xl",
      sortValue: (s) => s.tokensIn + s.tokensOut,
      cell: (s) => formatTokens(s.tokensIn + s.tokensOut),
    },
    {
      id: "cost",
      header: "Cost",
      align: "right",
      sortValue: (s) => s.costUsd,
      cell: (s) => formatCost(s.costUsd),
    },
    {
      id: "workspace",
      header: "Workspace",
      hideBelow: "xl",
      sortValue: (s) => s.workspaceState,
      cell: (s) => <span className="text-muted-foreground text-xs">{s.workspaceState ?? "—"}</span>,
    },
    {
      id: "started",
      header: "Started",
      hideBelow: "lg",
      sortValue: (s) => s.startedAt,
      cell: (s) => (
        <time
          dateTime={s.startedAt}
          title={formatDateTime(s.startedAt)}
          className="text-muted-foreground text-xs whitespace-nowrap"
          suppressHydrationWarning
        >
          {formatRelative(s.startedAt)}
        </time>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sessions"
        description="Each time an agent works on a task it runs a session: one isolated workspace, one attempt, a full log and a cost."
        meta={<MockDataBadge />}
      />
      <FilterBar>
        <MultiFilter
          label="Status"
          value={f.status}
          onChange={(v) => setF({ status: v || null })}
          options={STATUSES.map((s) => ({ value: s, label: SESSION_STATUS_LABEL[s] }))}
        />
        {f.status && (
          <Button variant="ghost" size="sm" onClick={() => setF({ status: null })}>
            <XIcon /> Clear filter
          </Button>
        )}
      </FilterBar>
      {q.isPending ? (
        <TableSkeleton rows={8} cols={6} />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          rows={q.data}
          columns={columns}
          getRowId={(s) => s.id}
          rowHref={(s) => `/app/devpilot/sessions/${s.id}`}
          caption="Agent sessions"
          empty={
            f.status ? (
              <EmptyState
                icon={TerminalSquareIcon}
                title="No sessions with this status"
                action={
                  <Button variant="outline" size="sm" onClick={() => setF({ status: null })}>
                    Show all sessions
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={TerminalSquareIcon}
                title="No sessions yet"
                description="Launch a task and the agent's session appears here with a live log."
                action={<NewTaskButton size="sm" />}
              />
            )
          }
        />
      )}
    </div>
  );
}
