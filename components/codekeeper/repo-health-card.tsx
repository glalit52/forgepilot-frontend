"use client";
import Link from "next/link";
import { CalendarClockIcon, ShieldAlertIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HealthScore } from "@/components/shared/health-score";
import type { HealthDimension, RepositorySummary, Scan } from "@/lib/schemas";
import { HEALTH_DIMENSION_LABEL, HEALTH_WEIGHTS, healthBand } from "@/lib/domain/health";
import { formatRelative } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { RunScanButton } from "./scan-button";

const DIMS: HealthDimension[] = ["security", "dependencies", "buildStability", "tests", "docs"];
const SHORT: Record<HealthDimension, string> = {
  security: "Security",
  dependencies: "Deps",
  buildStability: "Build",
  tests: "Tests",
  docs: "Docs",
};
const SCHEDULE: Record<RepositorySummary["scanSchedule"], string> = {
  daily: "Daily scans",
  weekly: "Weekly scans",
  on_push: "Scans on push",
  off: "Scheduled scans off",
};

/** One repository: score, delta, every dimension, findings, last scan, Run scan. */
export function RepoHealthCard({
  repo,
  lastScan,
  runningScan,
}: {
  repo: RepositorySummary;
  lastScan: Scan | null;
  runningScan: Scan | null;
}) {
  const h = repo.health;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/app/repositories/${repo.id}`}
            className="block truncate font-medium hover:underline"
          >
            {repo.fullName}
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {repo.projectName} ·{" "}
            {repo.ecosystems.map((e) => (e === "npm" ? "npm" : "PyPI")).join(", ") ||
              "no supported ecosystem"}
          </p>
        </div>
        <HealthScore score={h.score} delta={repo.healthDelta} size={48} />
      </div>

      <ul
        className="grid grid-cols-5 gap-1.5"
        aria-label={`Health dimensions for ${repo.fullName}`}
      >
        {DIMS.map((d) => {
          const v = h[d];
          const band = v === null ? null : healthBand(v);
          return (
            <li
              key={d}
              className="flex flex-col gap-1"
              title={`${HEALTH_DIMENSION_LABEL[d]} (weight ${Math.round(HEALTH_WEIGHTS[d] * 100)}%): ${v ?? "Unknown"}`}
            >
              <span className="text-muted-foreground truncate text-[11px]">{SHORT[d]}</span>
              <span className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                {v !== null && (
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      band === "healthy"
                        ? "bg-success"
                        : band === "at_risk"
                          ? "bg-warning"
                          : "bg-danger",
                    )}
                    style={{ width: `${v}%` }}
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  v === null ? "text-muted-foreground" : "font-medium",
                )}
              >
                {v ?? "Unknown"}
                <span className="sr-only"> {HEALTH_DIMENSION_LABEL[d]}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Link
          href={`/app/codekeeper/findings?repo=${repo.id}`}
          className="hover:text-foreground inline-flex items-center gap-1 hover:underline"
        >
          <ShieldAlertIcon className="size-3.5" aria-hidden />
          <span className="text-foreground font-medium tabular-nums">{repo.openFindings}</span> open
          {repo.criticalFindings > 0 && (
            <span className="text-danger-foreground font-medium">
              · {repo.criticalFindings} critical
            </span>
          )}
        </Link>
        <span className="inline-flex items-center gap-1" title={SCHEDULE[repo.scanSchedule]}>
          <CalendarClockIcon className="size-3.5" aria-hidden />
          {lastScan?.finishedAt
            ? `Scanned ${formatRelative(lastScan.finishedAt)}`
            : SCHEDULE[repo.scanSchedule]}
        </span>
        <span className="text-muted-foreground/80">model {h.scoreVersion}</span>
      </div>

      <div className="mt-auto flex items-center justify-end border-t pt-3">
        <RunScanButton
          repositoryId={repo.id}
          fullName={repo.fullName}
          running={repo.scanRunning}
          runningScan={runningScan}
        />
      </div>
    </Card>
  );
}
