"use client";
import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";
import { ActorChip } from "@/components/shared/actor-chip";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import type { TaskListItem } from "@/lib/schemas";
import { PRIORITY_LABEL } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";
import { NeedsAnswerChip, NeedsApprovalChip, PrCell, SourceChip } from "./bits";
import { agentActor, formatCost } from "./utils";

/** One task on the command-centre board. The title is the link; chips link elsewhere. */
export function TaskCard({ task }: { task: TaskListItem }) {
  const waiting = task.status === "waiting_input" ? task.latestSession?.waitingFor : null;
  return (
    <article
      className={cn(
        "bg-card hover:border-primary/40 relative flex flex-col gap-2 rounded-lg border p-3 text-sm shadow-xs transition-colors",
        task.status === "running" && "border-primary/30",
        task.status === "waiting_input" && "border-warning/50",
      )}
      aria-label={task.title}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/app/devpilot/tasks/${task.id}`}
          className="hover:text-primary line-clamp-2 leading-snug font-medium hover:underline"
        >
          {task.title}
        </Link>
        {(task.priority === "urgent" || task.priority === "high") && (
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium",
              task.priority === "urgent" ? "text-danger-foreground" : "text-warning-foreground",
            )}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        )}
      </div>
      <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
        <span className="truncate font-mono">{task.repositoryName}</span>
        {task.source !== "manual" && <SourceChip source={task.source} className="ml-auto" />}
      </div>
      {task.agent ? (
        <ActorChip actor={agentActor(task.agent)} className="text-xs" />
      ) : (
        <span className="text-muted-foreground text-xs">No agent assigned</span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <TaskStatusBadge status={task.status} />
        {waiting?.kind === "approval" && <NeedsApprovalChip />}
        {waiting?.kind === "clarification" && task.latestSession && (
          <NeedsAnswerChip href={`/app/devpilot/sessions/${task.latestSession.id}`} />
        )}
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-2 text-xs">
        <span className="inline-flex items-center gap-2 tabular-nums">
          <span title="Agent attempts">
            <RotateCcwIcon className="mr-0.5 inline size-3" aria-hidden />
            {task.attempts} {task.attempts === 1 ? "attempt" : "attempts"}
          </span>
          <span title="Agent cost so far">{formatCost(task.costUsd)}</span>
        </span>
        {task.pullRequest ? (
          <PrCell pr={task.pullRequest} showStatus={false} />
        ) : (
          <span>No PR yet</span>
        )}
      </div>
    </article>
  );
}
