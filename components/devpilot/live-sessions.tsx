"use client";
import Link from "next/link";
import { RadioIcon } from "lucide-react";
import { ActorChip } from "@/components/shared/actor-chip";
import { EmptyState } from "@/components/shared/states";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import type { SessionListItem } from "@/lib/schemas";
import { formatDuration } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { NeedsAnswerChip, NeedsApprovalChip } from "./bits";
import { agentActor, formatCost, formatTokens, sessionSeconds, useNow } from "./utils";

/** Sessions that are running or paused for a human, with a live pulse. */
export function LiveSessions({ sessions }: { sessions: SessionListItem[] }) {
  const now = useNow(1000, sessions.length > 0);
  if (!sessions.length)
    return (
      <EmptyState
        icon={RadioIcon}
        title="No agents running"
        description="Launch a task and its session streams here in real time."
        className="py-8"
      />
    );
  return (
    <ul className="flex flex-col divide-y rounded-lg border" aria-label="Live sessions">
      {sessions.map((s) => {
        const waiting = s.status === "waiting";
        return (
          <li key={s.id} className="flex flex-col gap-1.5 p-3">
            <div className="flex items-start gap-2.5">
              <span className="relative mt-1.5 flex size-2.5 shrink-0" aria-hidden>
                <span
                  className={cn(
                    "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                    waiting ? "bg-warning" : "bg-primary",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex size-2.5 rounded-full",
                    waiting ? "bg-warning" : "bg-primary",
                  )}
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/app/devpilot/sessions/${s.id}`}
                    className="hover:text-primary truncate text-sm font-medium hover:underline"
                  >
                    {s.taskTitle}
                  </Link>
                  <SessionStatusBadge status={s.status} />
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <ActorChip actor={agentActor(s.agent)} className="text-xs" />
                  <span className="font-mono">{s.repositoryName}</span>
                  <span>Attempt {s.attempt}</span>
                  <span className="tabular-nums" suppressHydrationWarning>
                    {formatDuration(sessionSeconds(s, now))}
                  </span>
                  <span className="tabular-nums">
                    {formatTokens(s.tokensIn + s.tokensOut)} tokens
                  </span>
                  <span className="tabular-nums">{formatCost(s.costUsd)}</span>
                </div>
                {waiting && s.waitingFor?.kind === "approval" && <NeedsApprovalChip />}
                {waiting && s.waitingFor?.kind === "clarification" && (
                  <NeedsAnswerChip href={`/app/devpilot/sessions/${s.id}`} />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
