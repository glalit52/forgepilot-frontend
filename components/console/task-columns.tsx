import Link from "next/link";
import { BotIcon, UserIcon } from "lucide-react";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import type { Column } from "@/components/shared/data-table";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { StatusBadge } from "@/components/shared/status-badge";
import type { TaskListItem } from "@/lib/schemas";
import { AGENT_LABEL, TASK_STATE_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { isManualRun } from "./run-actor";

/** Agent + model, or the engineer when the latest run is a manual takeover (rule 4). */
export function TaskAgentCell({ task }: { task: TaskListItem }) {
  const run = task.latestRun;
  if (run && isManualRun(run)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <UserIcon className="text-muted-foreground size-3.5" aria-hidden />
        {run.model.slice("manual:".length)}
        <span className="text-muted-foreground text-xs">manual</span>
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
      <BotIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{AGENT_LABEL[task.agent]}</span>
      {run && <span className="text-muted-foreground truncate font-mono text-xs">{run.model}</span>}
    </span>
  );
}

const SLA_SORT = { breached: 0, at_risk: 1, ok: 2, missed: 3, met: 4 } as const;

export function taskColumns(
  opts: { client?: boolean; assignee?: boolean } = {},
): Column<TaskListItem>[] {
  const cols: (Column<TaskListItem> | false)[] = [
    {
      id: "title",
      header: "Task",
      sortValue: (t) => t.title,
      className: "max-w-[22rem]",
      cell: (t) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href={`/console/tasks/${t.id}`} className="truncate font-medium hover:underline">
            {t.title}
          </Link>
          <span className="text-muted-foreground truncate text-xs">
            <span className="font-mono">{t.source.ref}</span> · {TASK_TYPE_LABEL[t.type]}
          </span>
        </div>
      ),
    },
    opts.client !== false && {
      id: "client",
      header: "Client",
      sortValue: (t) => t.organizationName,
      cell: (t) => <span className="text-sm">{t.organizationName}</span>,
      hideBelow: "lg",
    },
    {
      id: "app",
      header: "Application",
      sortValue: (t) => t.applicationName,
      cell: (t) => <span className="text-sm">{t.applicationName}</span>,
      hideBelow: "md",
    },
    {
      id: "state",
      header: "State",
      sortValue: (t) => TASK_STATE_LABEL[t.state],
      cell: (t) => <StatusBadge state={t.state} />,
    },
    {
      id: "sla",
      header: "SLA",
      sortValue: (t) => SLA_SORT[t.slaRisk] * 1e13 + Date.parse(t.slaDueAt),
      cell: (t) => <SlaCountdown dueAt={t.slaDueAt} risk={t.slaRisk} />,
    },
    opts.assignee !== false && {
      id: "assignee",
      header: "Assignee",
      sortValue: (t) => t.assignee?.name ?? "",
      cell: (t) => (
        <span className="text-sm">
          {t.assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>}
        </span>
      ),
      hideBelow: "xl",
    },
    {
      id: "agent",
      header: "Agent",
      sortValue: (t) => t.agent,
      cell: (t) => <TaskAgentCell task={t} />,
      hideBelow: "lg",
    },
    {
      id: "attempts",
      header: "Attempts",
      align: "right",
      sortValue: (t) => t.attempts,
      cell: (t) => t.attempts,
      hideBelow: "xl",
    },
    {
      id: "ai",
      header: "AI %",
      align: "right",
      sortValue: (t) => t.aiAuthoredPct,
      cell: (t) =>
        t.attempts > 0 || t.aiAuthoredPct > 0 ? (
          <AiCodeFlag pct={t.aiAuthoredPct} compact />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];
  return cols.filter((c): c is Column<TaskListItem> => !!c);
}
