"use client";
import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToneBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/states";
import type { LiveLog as LiveLogData, LogLine } from "@/lib/schemas";
import { formatTime } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<LogLine["level"], string> = {
  info: "text-foreground/85",
  tool: "text-info-foreground",
  warn: "text-warning-foreground",
  error: "text-danger-foreground",
  success: "text-success-foreground",
};

const LEVEL_TAG: Record<LogLine["level"], string> = {
  info: "info",
  tool: "tool",
  warn: "warn",
  error: "err ",
  success: " ok ",
};

const STATUS: Record<
  LiveLogData["status"],
  { label: string; tone: "neutral" | "accent" | "success" }
> = {
  idle: { label: "No run yet", tone: "neutral" },
  running: { label: "Agent running", tone: "accent" },
  verifying: { label: "Verifying", tone: "accent" },
  done: { label: "Run finished", tone: "success" },
};

/** Terminal-style streaming log for the latest run (polled while live). */
export function LiveLog({
  query,
  actorLabel,
}: {
  query: {
    data: LiveLogData | undefined;
    isPending: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  /** "Claude Code · claude-sonnet" or "Arjun Rao (manual)". */
  actorLabel: string | null;
}) {
  const [follow, setFollow] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const lines = query.data?.lines ?? [];
  const lastSeq = lines.at(-1)?.seq;

  useEffect(() => {
    const el = scroller.current;
    if (follow && el) el.scrollTop = el.scrollHeight;
  }, [lastSeq, follow]);

  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const log = query.data;
  if (log.status === "idle" && !lines.length) {
    return (
      <EmptyState
        icon={TerminalIcon}
        title="No agent run yet"
        description="Approve the plan, then launch an agent. Its output streams here live."
      />
    );
  }
  const status = STATUS[log.status];
  const live = log.status === "running" || log.status === "verifying";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs" aria-live="polite">
          <ToneBadge tone={status.tone} pulse={live}>
            {status.label}
          </ToneBadge>
          {actorLabel && <span className="text-muted-foreground truncate">{actorLabel}</span>}
          <span className="text-muted-foreground tabular-nums">{log.progressPct}%</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={!follow}
          onClick={() => setFollow((f) => !f)}
          title={follow ? "Stop following new output" : "Follow new output"}
        >
          {follow ? <PauseIcon /> : <PlayIcon />}
          {follow ? "Pause auto-scroll" : "Resume auto-scroll"}
        </Button>
      </div>
      <Progress value={log.progressPct} aria-label="Run progress" className="h-1.5" />
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-label="Agent log"
        tabIndex={0}
        className="bg-muted/40 focus-visible:ring-ring/50 h-[28rem] overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-[3px]"
      >
        {lines.map((l) => (
          <div key={l.seq} className="flex gap-3 whitespace-pre-wrap">
            <time dateTime={l.at} className="text-muted-foreground shrink-0 select-none">
              {formatTime(l.at)}
            </time>
            <span className={cn("shrink-0 uppercase opacity-70 select-none", LEVEL_CLASS[l.level])}>
              {LEVEL_TAG[l.level]}
            </span>
            <span className={cn("min-w-0 break-words", LEVEL_CLASS[l.level])}>{l.text}</span>
          </div>
        ))}
        {live && (
          <div className="text-muted-foreground mt-1 flex items-center gap-2" aria-hidden>
            <span className="bg-primary inline-block h-3 w-1.5 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
