import { BotIcon, CpuIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ResolvedActor } from "@/lib/schemas";
import { initials } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/**
 * Who acted. Rule 4: human vs agent is always visible.
 * Agent → bot icon + "Claude Code · claude-sonnet"; person → avatar + name.
 */
export function ActorChip({
  actor,
  size = "sm",
  showDetail = true,
  className,
}: {
  actor: ResolvedActor;
  size?: "sm" | "md";
  showDetail?: boolean;
  className?: string;
}) {
  const box = size === "sm" ? "size-5" : "size-7";
  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm", className)}
      data-actor-type={actor.type}
    >
      {actor.type === "person" ? (
        <Avatar className={box}>
          <AvatarFallback className="text-[10px]">{initials(actor.name)}</AvatarFallback>
        </Avatar>
      ) : (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md",
            box,
            actor.type === "agent"
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {actor.type === "agent" ? (
            <BotIcon className="size-3.5" />
          ) : (
            <CpuIcon className="size-3.5" />
          )}
        </span>
      )}
      <span className="truncate font-medium">{actor.name}</span>
      {showDetail && actor.detail && (
        <span className="text-muted-foreground truncate text-xs">
          {actor.type === "agent" ? `· ${actor.detail}` : `· ${actor.detail}`}
        </span>
      )}
      <span className="sr-only">
        {actor.type === "agent" ? "(AI agent)" : actor.type === "person" ? "(person)" : "(system)"}
      </span>
    </span>
  );
}
