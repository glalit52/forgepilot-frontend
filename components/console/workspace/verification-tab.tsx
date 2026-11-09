import { ChevronRightIcon } from "lucide-react";
import { VerificationBadge } from "@/components/shared/status-badge";
import { VerificationSummary } from "@/components/shared/verification-summary";
import type { AgentRun, VerificationRun } from "@/lib/schemas";
import { formatDateTime } from "@/lib/domain/format";

/** Latest verification in full + every previous attempt (expandable). */
export function VerificationTab({
  latest,
  verifications,
  runs,
}: {
  latest: VerificationRun | null;
  verifications: VerificationRun[];
  runs: AgentRun[];
}) {
  const attemptOf = (v: VerificationRun) =>
    runs.find((r) => r.id === v.agentRunId)?.attempt ?? null;
  const previous = verifications
    .filter((v) => v.id !== latest?.id)
    .sort((a, b) => (attemptOf(b) ?? 0) - (attemptOf(a) ?? 0));
  const latestAttempt = latest ? attemptOf(latest) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {latest && (
          <h3 className="text-sm font-semibold">
            Latest verification{latestAttempt ? ` · attempt #${latestAttempt}` : ""}
            {latest.startedAt && (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                {formatDateTime(latest.startedAt)}
              </span>
            )}
          </h3>
        )}
        <VerificationSummary verification={latest} detailed />
      </div>
      {previous.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Previous attempts</h3>
          <ul className="flex flex-col gap-2">
            {previous.map((v) => (
              <li key={v.id}>
                <details className="group rounded-md border">
                  <summary className="hover:bg-muted/50 focus-visible:ring-ring/50 flex cursor-pointer list-none items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
                    <ChevronRightIcon
                      className="text-muted-foreground size-4 transition-transform group-open:rotate-90"
                      aria-hidden
                    />
                    <span className="font-medium">Attempt #{attemptOf(v) ?? "?"}</span>
                    <VerificationBadge status={v.status} />
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                      {v.testsPassed}/{v.testsRun} tests passed · risk {v.riskScore}
                    </span>
                  </summary>
                  <div className="border-t p-3">
                    <VerificationSummary verification={v} detailed />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
