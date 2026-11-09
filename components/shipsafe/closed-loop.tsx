import {
  ArrowRightIcon,
  CheckIcon,
  CircleDashedIcon,
  Loader2Icon,
  MinusIcon,
  XIcon,
} from "lucide-react";
import type { BugDetail } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type State = "done" | "current" | "upcoming" | "failed" | "skipped";
interface Step {
  key: string;
  label: string;
  detail: string;
}

const STEPS: Step[] = [
  { key: "pr", label: "PR updated", detail: "New commit pushed" },
  { key: "test", label: "ShipSafe tests", detail: "Targeted suites fail" },
  { key: "defect", label: "Linked defect", detail: "This bug, with evidence" },
  { key: "task", label: "DevPilot fix task", detail: "Commit, logs and context kept" },
  { key: "agent", label: "Isolated agent fix", detail: "Separate workspace" },
  { key: "commit", label: "New commit", detail: "Pushed to the PR branch" },
  { key: "retest", label: "ShipSafe retest", detail: "Compared with this run" },
  { key: "review", label: "Human review", detail: "Merge decision in GitHub" },
];

/** Where is this bug in the closed loop (PRD §6.5)? Returns the index of the current step and an optional outcome note. */
export function loopPosition(d: BugDetail): {
  current: number;
  states: State[];
  note: string | null;
  noteTone: "info" | "warning" | "success" | "neutral";
} {
  const t = d.task?.status;
  const states = (cur: number, failedAt?: number): State[] =>
    STEPS.map((_, i) =>
      failedAt === i ? "failed" : i < cur ? "done" : i === cur ? "current" : "upcoming",
    );
  const status = d.bug.status;
  if (status === "wont_fix")
    return {
      current: 2,
      states: STEPS.map((_, i) => (i < 2 ? "done" : i === 2 ? "done" : "skipped")),
      note: "Closed as won't fix. The loop stopped here by a person's decision.",
      noteTone: "neutral",
    };
  if (status === "resolved")
    return {
      current: 7,
      states: STEPS.map((_, i) => (!d.task && i >= 3 && i <= 6 ? "skipped" : "done")),
      note: d.task
        ? "Retest passed. The fix is ready for human review; ShipSafe never merges."
        : "Marked resolved without a fix task.",
      noteTone: "success",
    };
  if (!t)
    return {
      current: 2,
      states: states(2),
      note: "Next step: create a fix task, or resolve it if it's already fixed.",
      noteTone: "info",
    };
  if (t === "draft" || t === "queued")
    return {
      current: 3,
      states: states(3),
      note: "The fix task is queued for an agent.",
      noteTone: "info",
    };
  if (t === "running" || t === "waiting_input")
    return {
      current: 4,
      states: states(4),
      note:
        t === "waiting_input"
          ? "The agent is waiting for a person (approval or clarification)."
          : "An agent is working on the fix in an isolated workspace.",
      noteTone: t === "waiting_input" ? "warning" : "info",
    };
  if (t === "verifying")
    return {
      current: 6,
      states: states(6),
      note: "ShipSafe is retesting the new commit.",
      noteTone: "info",
    };
  if (t === "review_ready" || t === "completed")
    return {
      current: 7,
      states: states(7),
      note:
        t === "completed"
          ? "The fix PR was merged in GitHub."
          : "Retest passed. Waiting for a person to review and merge in GitHub.",
      noteTone: "success",
    };
  if (t === "failed")
    return {
      current: 6,
      states: states(6, 6),
      note: "The retest failed. Retry (capped by policy) or hand it to a person to investigate.",
      noteTone: "warning",
    };
  return {
    current: 3,
    states: states(3, 3),
    note: "The fix task was cancelled.",
    noteTone: "neutral",
  };
}

const ICON: Record<State, typeof CheckIcon> = {
  done: CheckIcon,
  current: Loader2Icon,
  upcoming: CircleDashedIcon,
  failed: XIcon,
  skipped: MinusIcon,
};

export function ClosedLoopDiagram({ detail }: { detail: BugDetail }) {
  const pos = loopPosition(detail);
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-stretch gap-y-2" aria-label="Closed-loop fix workflow">
        {STEPS.map((s, i) => {
          const st = pos.states[i];
          const Icon = ICON[st];
          return (
            <li
              key={s.key}
              className="flex items-center"
              aria-current={st === "current" ? "step" : undefined}
            >
              <div
                className={cn(
                  "flex w-36 flex-col gap-0.5 rounded-md border px-2.5 py-2",
                  st === "current" && "border-primary/60 bg-accent/50 ring-primary/20 ring-2",
                  st === "failed" && "border-danger/40 bg-danger-soft/40",
                  (st === "upcoming" || st === "skipped") && "opacity-70",
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full",
                      st === "done" && "bg-success text-white",
                      st === "current" && "bg-primary text-primary-foreground",
                      st === "failed" && "bg-danger text-white",
                      (st === "upcoming" || st === "skipped") && "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    <Icon
                      className={cn(
                        "size-2.5",
                        st === "current" && "animate-spin [animation-duration:2.5s]",
                      )}
                    />
                  </span>
                  {s.label}
                  <span className="sr-only">({st === "current" ? "current step" : st})</span>
                </span>
                <span className="text-muted-foreground text-[11px] leading-tight">{s.detail}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRightIcon
                  className="text-muted-foreground mx-1 size-3.5 shrink-0"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span>
          <span className="text-success-foreground font-medium">Retest passes</span> → human review
        </span>
        <span>
          <span className="text-danger-foreground font-medium">Retest fails</span> → capped retry,
          then human investigation
        </span>
      </div>
      {pos.note && (
        <p
          role="status"
          className={cn(
            "rounded-md p-2.5 text-xs",
            pos.noteTone === "info" && "bg-info-soft text-info-foreground",
            pos.noteTone === "warning" && "bg-warning-soft text-warning-foreground",
            pos.noteTone === "success" && "bg-success-soft text-success-foreground",
            pos.noteTone === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          {pos.note}
        </p>
      )}
    </div>
  );
}
