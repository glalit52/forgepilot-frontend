"use client";
import { useEffect, useState } from "react";
import { Loader2Icon, ScanSearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useRunScan, useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import type { Scan } from "@/lib/schemas";
import { GuardedButton } from "./finding-ui";

/** Re-render on a short tick while something time-based is in flight. */
export function useNow(active: boolean, ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/** 0–100 estimate for a running scan. Uses the mock end time when present. */
export function scanProgress(
  scan: Pick<Scan, "startedAt" | "simulatedEndsAt" | "status">,
  now: number,
) {
  if (scan.status !== "running" && scan.status !== "queued") return 100;
  const start = Date.parse(scan.startedAt);
  const end = scan.simulatedEndsAt ?? start + 6000;
  return Math.max(4, Math.min(96, Math.round(((now - start) / Math.max(1, end - start)) * 100)));
}

export function ScanProgress({
  scan,
}: {
  scan: Pick<Scan, "startedAt" | "simulatedEndsAt" | "status">;
}) {
  const now = useNow(true);
  const pct = scanProgress(scan, now);
  return (
    <div className="flex min-w-28 flex-1 items-center gap-2" role="status" aria-live="polite">
      <Progress value={pct} aria-label={`Scan ${pct}% complete`} className="h-1.5" />
      <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

/** "Run scan" for one repository. Shows progress while the scan runs. */
export function RunScanButton({
  repositoryId,
  fullName,
  running,
  runningScan,
  size = "sm",
}: {
  repositoryId: string;
  fullName: string;
  running: boolean;
  runningScan?: Pick<Scan, "startedAt" | "simulatedEndsAt" | "status"> | null;
  size?: "sm" | "default";
}) {
  const session = useSession();
  const scan = useRunScan();
  const allowed = can(session.data?.role, "test.run");
  const busy = running || scan.isPending;
  return (
    <div className="flex min-w-0 items-center gap-2">
      {running && runningScan && <ScanProgress scan={runningScan} />}
      <GuardedButton
        variant="outline"
        size={size}
        aria-label={`Run scan for ${fullName}`}
        reason={allowed ? null : "Viewers can't start scans. Ask a member or admin."}
        disabled={busy}
        onClick={() =>
          scan.mutate(repositoryId, {
            onSuccess: () =>
              toast.success(`Scanning ${fullName}`, {
                description:
                  "Manifests, lockfiles, advisories, CI and docs. Results land in a few seconds.",
              }),
            onError: (e) => toast.error("Couldn't start the scan", { description: e.message }),
          })
        }
      >
        {busy ? <Loader2Icon className="animate-spin" /> : <ScanSearchIcon />}
        {busy ? "Scanning…" : "Run scan"}
      </GuardedButton>
    </div>
  );
}
