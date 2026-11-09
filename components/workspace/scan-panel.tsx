"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  RadarIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Scan } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CommitSha } from "@/components/shared/misc";
import { formatDuration } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const SCAN_STEPS = [
  "Reading manifests and lockfiles",
  "Matching advisories (OSV, GitHub)",
  "Checking CI and test stability",
  "Scoring health",
];

/** Progress for a running scan. Uses the mock end time when present; otherwise an indeterminate bar. */
export function ScanProgress({ scan }: { scan: Scan }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const start = Date.parse(scan.startedAt);
  const end = scan.simulatedEndsAt;
  const pct = end ? Math.min(97, Math.max(3, ((now - start) / (end - start)) * 100)) : null;
  const step =
    SCAN_STEPS[Math.min(SCAN_STEPS.length - 1, Math.floor(((pct ?? 0) / 100) * SCAN_STEPS.length))];
  return (
    <div
      className="border-primary/30 bg-accent/30 flex flex-col gap-2 rounded-lg border p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <RadarIcon className="text-primary size-4 animate-pulse" aria-hidden /> Scanning
          <CommitSha sha={scan.commitSha} className="text-muted-foreground" />
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDuration((now - start) / 1000)} elapsed
        </span>
      </div>
      <Progress
        value={pct ?? 50}
        aria-label="Scan progress"
        className={cn(pct === null && "animate-pulse")}
      />
      <span className="text-muted-foreground text-xs">{step}…</span>
    </div>
  );
}

/** Result of a scan the user just started: score delta and what changed. */
export function ScanResult({ scan, onDismiss }: { scan: Scan; onDismiss: () => void }) {
  const d = scan.scoreDelta ?? 0;
  const Icon = d > 0 ? ArrowUpRightIcon : d < 0 ? ArrowDownRightIcon : ArrowRightIcon;
  const failed = scan.status === "failed";
  return (
    <div
      role="status"
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border p-4",
        failed
          ? "border-danger/30 bg-danger-soft/40"
          : d < 0
            ? "border-warning/30 bg-warning-soft/40"
            : "border-success/30 bg-success-soft/40",
      )}
    >
      <div className="flex flex-col gap-1 text-sm">
        {failed ? (
          <span className="font-medium">The scan failed. Your previous score is unchanged.</span>
        ) : (
          <span className="flex flex-wrap items-center gap-2 font-medium">
            Scan complete · health {scan.scoreAfter ?? "—"}
            <span
              className={cn(
                "inline-flex items-center gap-0.5 tabular-nums",
                d > 0
                  ? "text-success-foreground"
                  : d < 0
                    ? "text-danger-foreground"
                    : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {d > 0 ? "+" : ""}
              {d} points
            </span>
            <span className="text-muted-foreground font-normal">
              · {scan.findingsCount ?? 0} open finding{scan.findingsCount === 1 ? "" : "s"}
            </span>
          </span>
        )}
        {scan.changes.length > 0 ? (
          <ul className="text-muted-foreground list-disc pl-5 text-xs">
            {scan.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : (
          !failed && (
            <span className="text-muted-foreground text-xs">
              No new changes since the last scan.
            </span>
          )
        )}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss scan result">
        <XIcon />
      </Button>
    </div>
  );
}

/** Watches a started scan and toasts once when it finishes. */
export function useScanWatcher(scans: Scan[] | undefined) {
  const [watching, setWatching] = useState<string | null>(null);
  const [finished, setFinished] = useState<Scan | null>(null);
  const toasted = useRef<string | null>(null);
  const current = watching ? scans?.find((s) => s.id === watching) : undefined;
  useEffect(() => {
    if (!current || current.status === "running" || current.status === "queued") return;
    if (toasted.current === current.id) return;
    toasted.current = current.id;
    const d = current.scoreDelta ?? 0;
    if (current.status === "failed") toast.error("Scan failed");
    else
      toast.success(`Scan complete: health ${current.scoreAfter}`, {
        description: `${d > 0 ? "+" : ""}${d} points since the last scan`,
      });
    // Show the result banner and stop watching.
    setFinished(current);
    setWatching(null);
  }, [current]);
  return { watch: setWatching, finished, dismiss: () => setFinished(null) };
}
