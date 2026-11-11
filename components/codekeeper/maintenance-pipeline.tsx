import { CheckIcon, ChevronRightIcon, CircleDashedIcon, Loader2Icon, XIcon } from "lucide-react";
import type { FindingListItem, Scan, TaskListItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  { key: "detected", label: "Detected", help: "A scan found the issue" },
  { key: "task", label: "Task created", help: "A maintenance task was created from the finding" },
  { key: "pr", label: "Agent PR", help: "The agent opened a pull request" },
  { key: "verified", label: "Verified", help: "ShipSafe checks passed on the PR head" },
  { key: "merged", label: "Merged", help: "A human merged it in GitHub" },
  { key: "rescanned", label: "Rescanned", help: "A later scan confirmed the finding is gone" },
] as const;
export type StageKey = (typeof PIPELINE_STAGES)[number]["key"];
export type StageState = "done" | "current" | "failed" | "upcoming";

/** Where one maintenance task sits in Detected → … → Rescanned. */
export function taskStages(
  t: TaskListItem,
  finding: FindingListItem | null,
  scans: Pick<Scan, "repositoryId" | "status" | "finishedAt">[],
): Record<StageKey, StageState> {
  const pr = t.pullRequest;
  const run = t.latestRunStatus;
  const merged = pr?.status === "merged";
  const rescanned =
    finding?.status === "resolved" ||
    (merged &&
      !!pr?.mergedAt &&
      scans.some(
        (s) =>
          s.repositoryId === t.repositoryId &&
          s.status === "completed" &&
          !!s.finishedAt &&
          s.finishedAt > pr.mergedAt!,
      ));
  const failedTask = t.status === "failed" || t.status === "cancelled";
  const s: Record<StageKey, StageState> = {
    detected: "done",
    task: "done",
    pr: "upcoming",
    verified: "upcoming",
    merged: "upcoming",
    rescanned: "upcoming",
  };
  if (pr) s.pr = "done";
  else s.pr = failedTask ? "failed" : "current";
  if (pr) {
    if (run === "passed") s.verified = "done";
    else if (run === "failed") s.verified = "failed";
    else s.verified = pr.status === "closed" ? "failed" : "current";
  }
  if (s.verified === "done")
    s.merged = merged ? "done" : pr?.status === "closed" ? "failed" : "current";
  if (merged) s.rescanned = rescanned ? "done" : "current";
  return s;
}

const ICON = { done: CheckIcon, current: Loader2Icon, failed: XIcon, upcoming: CircleDashedIcon };

/** Compact six-dot stepper for a table row. */
export function MiniPipeline({ stages }: { stages: Record<StageKey, StageState> }) {
  const current = PIPELINE_STAGES.find(
    (p) => stages[p.key] === "current" || stages[p.key] === "failed",
  );
  return (
    <span
      className="flex items-center gap-1"
      role="img"
      aria-label={`Pipeline: ${PIPELINE_STAGES.map((p) => `${p.label} ${stages[p.key]}`).join(", ")}`}
    >
      {PIPELINE_STAGES.map((p) => {
        const st = stages[p.key];
        const Icon = ICON[st];
        return (
          <span
            key={p.key}
            title={`${p.label}: ${st}`}
            className={cn(
              "flex size-4 items-center justify-center rounded-full",
              st === "done" && "bg-success text-white",
              st === "current" && "bg-primary text-primary-foreground",
              st === "failed" && "bg-danger text-white",
              st === "upcoming" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className={cn("size-2.5", st === "current" && "animate-spin")} aria-hidden />
          </span>
        );
      })}
      {current && (
        <span className="text-muted-foreground ml-1 hidden text-xs xl:inline">{current.label}</span>
      )}
    </span>
  );
}

/** Funnel: how many maintenance items reached each stage. */
export function PipelineFunnel({ counts }: { counts: Record<StageKey, number> }) {
  const max = Math.max(1, counts.detected);
  return (
    <ol
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      aria-label="Maintenance pipeline"
    >
      {PIPELINE_STAGES.map((p, i) => (
        <li
          key={p.key}
          className="relative flex flex-col gap-1.5 rounded-lg border p-3"
          title={p.help}
        >
          <span className="text-muted-foreground flex items-center justify-between text-xs font-medium">
            {p.label}
            {i < PIPELINE_STAGES.length - 1 && (
              <ChevronRightIcon className="hidden size-3.5 lg:block" aria-hidden />
            )}
          </span>
          <span className="text-xl font-semibold tabular-nums">{counts[p.key]}</span>
          <span className="bg-muted h-1 overflow-hidden rounded-full" aria-hidden>
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${(counts[p.key] / max) * 100}%` }}
            />
          </span>
          <span className="text-muted-foreground text-[11px] leading-tight">{p.help}</span>
        </li>
      ))}
    </ol>
  );
}
