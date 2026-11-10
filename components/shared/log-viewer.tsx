"use client";
import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LogLine } from "@/lib/schemas";
import { formatTime } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const LEVEL: Record<LogLine["level"], { label: string; cls: string }> = {
  info: { label: "INFO", cls: "text-muted-foreground" },
  tool: { label: "TOOL", cls: "text-info-foreground" },
  warn: { label: "WARN", cls: "text-warning-foreground" },
  error: { label: "ERR ", cls: "text-danger-foreground" },
  success: { label: " OK ", cls: "text-success-foreground" },
  approval: { label: "WAIT", cls: "text-warning-foreground" },
};

/** Terminal-style structured log with auto-scroll (pausable) and redaction notice. */
export function LogViewer({
  lines,
  live,
  redactions = 0,
  className,
  height = "h-96",
}: {
  lines: LogLine[];
  live?: boolean;
  redactions?: number;
  className?: string;
  height?: string;
}) {
  const [follow, setFollow] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (follow && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length, follow]);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <ShieldCheckIcon className="text-success size-3.5" aria-hidden />
          Secrets redacted before display
          {redactions ? ` · ${redactions} redaction${redactions === 1 ? "" : "s"}` : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFollow((f) => !f)}
          aria-pressed={!follow}
        >
          {follow ? <PauseIcon /> : <PlayIcon />}{" "}
          {follow ? "Pause auto-scroll" : "Resume auto-scroll"}
        </Button>
      </div>
      <div
        ref={ref}
        role="log"
        aria-live={live ? "polite" : "off"}
        aria-label="Session log"
        tabIndex={0}
        className={cn(
          "overflow-auto rounded-md border bg-[oklch(0.16_0.01_286)] p-3 font-mono text-xs leading-5 text-[oklch(0.92_0.005_286)]",
          height,
        )}
      >
        {lines.map((l) => (
          <div key={l.seq} className="flex gap-3 whitespace-pre-wrap">
            <span
              className="shrink-0 text-[oklch(0.65_0.01_286)] select-none"
              suppressHydrationWarning
            >
              {formatTime(l.at)}
            </span>
            <span
              className={cn("shrink-0 font-semibold", LEVEL[l.level].cls, "dark:brightness-110")}
            >
              {LEVEL[l.level].label}
            </span>
            <span className="min-w-0 break-words">{l.text}</span>
          </div>
        ))}
        {live && <div className="bg-primary mt-1 h-3.5 w-2 animate-pulse" aria-hidden />}
      </div>
    </div>
  );
}
