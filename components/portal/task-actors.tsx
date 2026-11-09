import { ActorChip } from "@/components/shared/actor-chip";
import { AGENT_LABEL, ROLE_LABEL } from "@/lib/domain/labels";
import type { ResolvedActor, TaskListItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function agentActor(task: Pick<TaskListItem, "agent" | "latestRun">): ResolvedActor {
  return {
    type: "agent",
    id: `${task.agent}:${task.latestRun?.model ?? ""}`,
    name: AGENT_LABEL[task.agent],
    detail: task.latestRun?.model ?? "no run yet",
  };
}

export function engineerActor(task: Pick<TaskListItem, "assignee">): ResolvedActor | null {
  if (!task.assignee) return null;
  return {
    type: "person",
    id: task.assignee.id,
    name: task.assignee.name,
    detail: task.assignee.title ?? ROLE_LABEL[task.assignee.role],
  };
}

/** Rule 4: show both the agent (with model) and the reviewing engineer. */
export function TaskActors({ task, className }: { task: TaskListItem; className?: string }) {
  const engineer = engineerActor(task);
  const agent = agentActor(task);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="flex min-w-0 flex-col">
        <ActorChip actor={agent} showDetail={false} />
        <span className="text-muted-foreground truncate pl-6.5 font-mono text-[11px]">
          {agent.detail}
        </span>
      </span>
      {engineer ? (
        <ActorChip actor={engineer} showDetail={false} />
      ) : (
        <span className="text-muted-foreground text-xs">No engineer assigned yet</span>
      )}
    </div>
  );
}
