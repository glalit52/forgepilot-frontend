import Link from "next/link";
import type { ActivityItem } from "@/lib/schemas";
import { formatRelative } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { ActorChip } from "./actor-chip";
import { EmptyState } from "./states";

/** Audit-backed timeline: every action with its actor (person, agent + model, or system). */
export function ActivityTimeline({
  items,
  className,
  compact = false,
}: {
  items: ActivityItem[];
  className?: string;
  compact?: boolean;
}) {
  if (!items.length)
    return (
      <EmptyState
        title="No activity yet"
        description="Actions by people, agents and the system appear here."
      />
    );
  return (
    <ol className={cn("flex flex-col", className)} aria-label="Activity">
      {items.map((a, i) => (
        <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && (
            <span
              className="bg-border absolute top-5 left-[5px] h-[calc(100%-0.75rem)] w-px"
              aria-hidden
            />
          )}
          <span
            className={cn(
              "z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-[var(--card)]",
              a.actor.type === "agent"
                ? "bg-primary"
                : a.actor.type === "system"
                  ? "bg-neutral"
                  : "bg-info",
            )}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
              <ActorChip actor={a.actorResolved} showDetail={!compact} />
              <span className="text-muted-foreground">{a.label}</span>
              {a.href ? (
                <Link
                  href={a.href}
                  className="hover:text-primary min-w-0 truncate font-medium hover:underline"
                >
                  {a.detail || a.resource}
                </Link>
              ) : (
                a.detail && <span className="min-w-0 truncate font-medium">{a.detail}</span>
              )}
            </div>
            <time
              dateTime={a.at}
              className="text-muted-foreground text-xs"
              suppressHydrationWarning
            >
              {formatRelative(a.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
