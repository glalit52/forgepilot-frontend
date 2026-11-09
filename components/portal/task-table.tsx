"use client";
import Link from "next/link";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DataTable, type Column } from "@/components/shared/data-table";
import { TaskTypeBadge } from "@/components/shared/misc";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { StatusBadge } from "@/components/shared/status-badge";
import { TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { TASK_STATES, type TaskListItem } from "@/lib/schemas";
import { TaskActors } from "./task-actors";

const STATE_ORDER = Object.fromEntries(TASK_STATES.map((s, i) => [s, i])) as Record<string, number>;

export function taskColumns({
  showApp = true,
}: { showApp?: boolean } = {}): Column<TaskListItem>[] {
  const cols: (Column<TaskListItem> | false)[] = [
    {
      id: "title",
      header: "Task",
      sortValue: (t) => t.title.toLowerCase(),
      className: "max-w-[13rem] xl:max-w-[15rem] 2xl:max-w-[22rem]",
      cell: (t) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/portal/work/${t.id}`}
            className="truncate font-medium hover:underline"
            title={t.title}
          >
            {t.title}
          </Link>
          <span className="text-muted-foreground truncate text-xs">
            {t.pullRequest ? `PR #${t.pullRequest.number} · ` : ""}
            {showApp ? <span className="xl:hidden">{t.applicationName} · </span> : null}
            <span className="xl:hidden">{TASK_TYPE_LABEL[t.type]} · </span>
            {t.repositoryName}
          </span>
        </div>
      ),
    },
    showApp && {
      id: "app",
      header: "Application",
      sortValue: (t) => t.applicationName,
      cell: (t) => <span className="text-sm">{t.applicationName}</span>,
      hideBelow: "xl",
      className: "max-w-[10rem]",
    },
    {
      id: "type",
      header: "Type",
      sortValue: (t) => t.type,
      cell: (t) => <TaskTypeBadge type={t.type} />,
      hideBelow: "xl",
    },
    {
      id: "state",
      header: "State",
      sortValue: (t) => STATE_ORDER[t.state],
      cell: (t) => <StatusBadge state={t.state} />,
    },
    {
      id: "sla",
      header: "SLA due",
      sortValue: (t) => t.slaDueAt,
      cell: (t) => (
        <SlaCountdown dueAt={t.slaDueAt} risk={t.slaRisk} className="whitespace-nowrap" />
      ),
    },
    {
      id: "actor",
      header: "Agent · engineer",
      className: "max-w-[11rem]",
      cell: (t) => <TaskActors task={t} />,
      hideBelow: "lg",
    },
    {
      id: "ai",
      header: "AI code",
      align: "right",
      sortValue: (t) => t.aiAuthoredPct,
      cell: (t) => <AiCodeFlag pct={t.aiAuthoredPct} compact />,
    },
  ];
  return cols.filter((c): c is Column<TaskListItem> => !!c);
}

export function TaskTable({
  tasks,
  showApp = true,
  empty,
  caption = "Tasks",
}: {
  tasks: TaskListItem[];
  showApp?: boolean;
  empty?: React.ReactNode;
  caption?: string;
}) {
  return (
    <DataTable
      caption={caption}
      rows={tasks}
      columns={taskColumns({ showApp })}
      getRowId={(t) => t.id}
      rowHref={(t) => `/portal/work/${t.id}`}
      initialSort={{ id: "sla", dir: "asc" }}
      empty={empty}
    />
  );
}
