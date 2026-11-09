import { BugIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Flaky tests count; amber when any exist. */
export function FlakyBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-muted-foreground text-xs">None</span>;
  return (
    <Badge variant="warning">
      <BugIcon aria-hidden /> {count} flaky
    </Badge>
  );
}

/** Failure rate of a single flaky test: ≥15% red, ≥8% amber, otherwise neutral. */
export function FailureRateBadge({ pct }: { pct: number }) {
  const variant = pct >= 15 ? "danger" : pct >= 8 ? "warning" : "neutral";
  return (
    <Badge variant={variant} className="tabular-nums">
      fails {pct}% of runs
    </Badge>
  );
}

export function CoverageBar({ pct }: { pct: number }) {
  const tone = pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="bg-muted h-1.5 w-16 overflow-hidden rounded-full" aria-hidden>
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums">{pct}%</span>
    </span>
  );
}
