import {
  CheckCircle2Icon,
  CircleDotIcon,
  GitPullRequestIcon,
  PlayIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  StampIcon,
  UserCheckIcon,
  XCircleIcon,
} from "lucide-react";
import type { EvidenceItem } from "@/lib/schemas";
import { EVIDENCE_EVENT_LABEL } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { ActorChip } from "./actor-chip";
import { EmptyState } from "./states";

const ICON: Partial<Record<EvidenceItem["event"], React.ComponentType<{ className?: string }>>> = {
  agent_run_started: PlayIcon,
  verification_passed: CheckCircle2Icon,
  verification_failed: XCircleIcon,
  engineer_signed_off: StampIcon,
  pr_opened: GitPullRequestIcon,
  client_approved: UserCheckIcon,
  client_requested_changes: ShieldAlertIcon,
  escalated: ShieldAlertIcon,
};

const TONE: Partial<Record<EvidenceItem["event"], string>> = {
  verification_passed: "text-success-foreground bg-success-soft",
  engineer_signed_off: "text-success-foreground bg-success-soft",
  client_approved: "text-success-foreground bg-success-soft",
  verification_failed: "text-danger-foreground bg-danger-soft",
  escalated: "text-danger-foreground bg-danger-soft",
  client_requested_changes: "text-warning-foreground bg-warning-soft",
};

function payloadSummary(p: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof p.testsPassed === "number") parts.push(`${p.testsPassed} tests passed`);
  if (typeof p.testsFailed === "number" && p.testsFailed > 0) parts.push(`${p.testsFailed} failed`);
  if (typeof p.riskScore === "number") parts.push(`risk ${p.riskScore}`);
  if (typeof p.attempt === "number") parts.push(`attempt #${p.attempt}`);
  if (typeof p.number === "number") parts.push(`PR #${p.number}`);
  if (p.reviewedDiff === true) parts.push("diff reviewed");
  if (typeof p.source === "string") parts.push(`from ${p.source}`);
  ["runId", "verificationId", "prId"].forEach(
    (k) => typeof p[k] === "string" && parts.push(String(p[k])),
  );
  if (typeof p.notes === "string" && p.notes) parts.push(`“${p.notes}”`);
  if (typeof p.comment === "string" && p.comment) parts.push(`“${p.comment}”`);
  return parts.join(" · ");
}

/** Ordered EvidenceRecords with actor, time, artifacts and a hash-verified icon. */
export function EvidenceTimeline({
  records,
  chainValid,
  className,
}: {
  records: EvidenceItem[];
  chainValid?: boolean;
  className?: string;
}) {
  if (!records.length)
    return (
      <EmptyState
        title="No evidence yet"
        description="Evidence appears as soon as work starts on this task."
      />
    );
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {chainValid !== undefined && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
            chainValid
              ? "bg-success-soft text-success-foreground"
              : "bg-danger-soft text-danger-foreground",
          )}
        >
          {chainValid ? (
            <ShieldCheckIcon className="size-4" aria-hidden />
          ) : (
            <ShieldXIcon className="size-4" aria-hidden />
          )}
          {chainValid
            ? `Hash chain intact · ${records.length} records, each linked to the one before`
            : "Hash chain broken — a record does not link to its predecessor"}
        </div>
      )}
      <ol className="relative flex flex-col" aria-label="Evidence timeline">
        {records.map((r, i) => {
          const Icon = ICON[r.event] ?? CircleDotIcon;
          const summary = payloadSummary(r.payload);
          return (
            <li key={r.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < records.length - 1 && (
                <span
                  className="bg-border absolute top-7 left-3.5 h-[calc(100%-1.25rem)] w-px"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                  TONE[r.event] ?? "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                <Icon className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">{EVIDENCE_EVENT_LABEL[r.event]}</span>
                  <ActorChip actor={r.actorResolved} />
                </div>
                {summary && <p className="text-muted-foreground text-xs break-words">{summary}</p>}
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                  <time dateTime={r.at}>{formatDateTime(r.at)}</time>
                  <span
                    className="inline-flex items-center gap-1 font-mono"
                    title={`prev ${r.prevHash ?? "∅"}`}
                  >
                    {r.hashValid ? (
                      <ShieldCheckIcon className="text-success size-3" aria-label="hash verified" />
                    ) : (
                      <ShieldXIcon className="text-danger size-3" aria-label="hash mismatch" />
                    )}
                    {r.hash.slice(0, 12)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
