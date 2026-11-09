import Link from "next/link";
import { ArrowRightIcon, UserIcon } from "lucide-react";
import { ActorChip } from "@/components/shared/actor-chip";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { StatusBadge } from "@/components/shared/status-badge";
import type { TaskListItem } from "@/lib/schemas";
import { EVIDENCE_EVENT_LABEL, PRIORITY_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { formatRelative } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/** C-01 card: client, app, task, state, SLA countdown, last agent/person event. */
export function QueueCard({
  task,
  showAssignee,
  now,
}: {
  task: TaskListItem;
  showAssignee?: boolean;
  now: number;
}) {
  return (
    <Link
      href={`/console/tasks/${task.id}`}
      className={cn(
        "group bg-card flex flex-col gap-2.5 rounded-lg border p-3.5 shadow-xs transition-colors outline-none",
        "hover:border-primary/40 focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="truncate">
          <span className="text-foreground font-medium">{task.organizationName}</span> ·{" "}
          {task.applicationName}
        </span>
        <span className="shrink-0 font-mono">{task.source.ref}</span>
      </div>
      <p className="line-clamp-2 text-sm leading-snug font-medium">{task.title}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusBadge state={task.state} />
        <SlaCountdown dueAt={task.slaDueAt} risk={task.slaRisk} />
        <span className="text-muted-foreground text-xs">
          {TASK_TYPE_LABEL[task.type]} · {PRIORITY_LABEL[task.priority].split(" · ")[0]}
        </span>
      </div>
      <div className="flex min-h-5 items-center justify-between gap-2 border-t pt-2.5">
        {task.lastEvent ? (
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="text-muted-foreground shrink-0">
              {EVIDENCE_EVENT_LABEL[task.lastEvent.event]}
            </span>
            <ActorChip
              actor={task.lastEvent.actorResolved}
              showDetail={false}
              className="text-xs"
            />
            <time dateTime={task.lastEvent.at} className="text-muted-foreground shrink-0">
              {formatRelative(task.lastEvent.at, now)}
            </time>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No activity yet</span>
        )}
        <span className="text-muted-foreground group-hover:text-foreground flex shrink-0 items-center gap-1 text-xs">
          {showAssignee && (
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-3" aria-hidden />
              {task.assignee?.name ?? "Unassigned"}
            </span>
          )}
          <ArrowRightIcon className="size-3.5" aria-hidden />
          <span className="sr-only">Open workspace</span>
        </span>
      </div>
    </Link>
  );
}
