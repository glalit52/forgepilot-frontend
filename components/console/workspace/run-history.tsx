import { HistoryIcon } from "lucide-react";
import { ActorChip } from "@/components/shared/actor-chip";
import { ToneBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import type { AgentRun } from "@/lib/schemas";
import type { Tone } from "@/lib/domain/status";
import { formatDateTime, formatDuration, formatNumber, formatRelative } from "@/lib/domain/format";
import { isManualRun, runActor } from "../run-actor";

const OUTCOME: Record<AgentRun["outcome"], { label: string; tone: Tone }> = {
  running: { label: "Running", tone: "accent" },
  success: { label: "Passed", tone: "success" },
  verification_failed: { label: "Verification failed", tone: "danger" },
  stopped: { label: "Stopped", tone: "neutral" },
  error: { label: "Error", tone: "danger" },
};

function usd(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Right column: every attempt, agent or person, with cost and outcome. */
export function RunHistory({ runs, now }: { runs: AgentRun[]; now: number }) {
  if (!runs.length) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="No runs yet"
        description="Each agent attempt or manual change is recorded here."
        className="py-6"
      />
    );
  }
  const sorted = [...runs].sort((a, b) => b.attempt - a.attempt);
  const totalCost = runs.reduce((s, r) => s + r.costUsd, 0);
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2" aria-label="Agent run history">
        {sorted.map((r) => {
          const o = OUTCOME[r.outcome];
          const manual = isManualRun(r);
          return (
            <li key={r.id} className="bg-card flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">Attempt #{r.attempt}</span>
                <ToneBadge tone={o.tone} pulse={r.outcome === "running"}>
                  {o.label}
                </ToneBadge>
              </div>
              <ActorChip actor={runActor(r)} />
              <dl className="text-muted-foreground grid grid-cols-3 gap-x-2 text-xs">
                <div>
                  <dt>Tokens</dt>
                  <dd className="text-foreground tabular-nums">
                    {manual ? "—" : formatNumber(r.tokens)}
                  </dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd className="text-foreground tabular-nums">{manual ? "—" : usd(r.costUsd)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd className="text-foreground tabular-nums">
                    {r.durationSec !== null
                      ? formatDuration(r.durationSec)
                      : r.outcome === "running"
                        ? "In progress"
                        : "—"}
                  </dd>
                </div>
              </dl>
              {r.notes && (
                <p className="bg-muted/50 rounded px-2 py-1 text-xs">
                  <span className="text-muted-foreground">Notes: </span>
                  {r.notes}
                </p>
              )}
              <time
                dateTime={r.startedAt}
                title={formatDateTime(r.startedAt)}
                className="text-muted-foreground text-xs"
              >
                Started {formatRelative(r.startedAt, now)}
              </time>
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground text-right text-xs tabular-nums">
        {runs.length} {runs.length === 1 ? "attempt" : "attempts"} · {usd(totalCost)} total
      </p>
    </div>
  );
}
