import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/domain/format";

/** % met vs target, with breach count. */
export function SlaMeter({
  metPct,
  targetPct,
  breaches,
  label = "SLA met",
  className,
}: {
  metPct: number;
  targetPct: number;
  breaches?: number;
  label?: string;
  className?: string;
}) {
  const ok = metPct >= targetPct;
  const near = !ok && metPct >= targetPct - 10;
  const bar = ok ? "bg-success" : near ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {formatPct(metPct, 1)}
          <span className="text-muted-foreground font-normal"> / {formatPct(targetPct)} target</span>
        </span>
      </div>
      <div
        className="bg-muted relative h-2 w-full overflow-visible rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={metPct}
        aria-label={`${label}: ${metPct}% against ${targetPct}% target`}
      >
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(100, metPct)}%` }} />
        <div
          className="bg-foreground absolute -top-1 h-4 w-0.5 rounded"
          style={{ left: `${targetPct}%` }}
          aria-hidden
        />
      </div>
      {breaches !== undefined && (
        <span className={cn("text-xs", breaches ? "text-danger-foreground" : "text-muted-foreground")}>
          {breaches === 0 ? "No breaches" : `${breaches} breach${breaches === 1 ? "" : "es"}`}
        </span>
      )}
    </div>
  );
}
