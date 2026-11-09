import { formatNumber } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/** Quota/usage bar: used vs included, with projected marker. */
export function UsageMeter({ label, used, limit, projected, unit, className }: { label: string; used: number; limit: number | null; projected?: number; unit?: string; className?: string }) {
  const pctUsed = limit ? Math.min(100, (used / limit) * 100) : 0;
  const pctProj = limit && projected ? Math.min(100, (projected / limit) * 100) : 0;
  const tone = !limit ? "bg-primary" : pctUsed >= 100 ? "bg-danger" : pctUsed >= 80 || pctProj >= 100 ? "bg-warning" : "bg-primary";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <span className="font-medium">{formatNumber(used, 1)}</span>
          <span className="text-muted-foreground">
            {" "}
            / {limit === null ? "Unlimited" : `${formatNumber(limit)}${unit ? ` ${unit}` : ""}`}
          </span>
        </span>
      </div>
      <div
        className="bg-muted relative h-2 w-full overflow-hidden rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit ?? used}
        aria-valuenow={used}
        aria-label={`${label}: ${formatNumber(used)} of ${limit === null ? "unlimited" : formatNumber(limit)}`}
      >
        {limit !== null && pctProj > pctUsed && <div className="bg-warning/30 absolute inset-y-0 left-0" style={{ width: `${pctProj}%` }} aria-hidden />}
        <div className={cn("relative h-full rounded-full", tone)} style={{ width: `${limit ? pctUsed : 100}%`, opacity: limit ? 1 : 0.35 }} />
      </div>
      {limit !== null && projected !== undefined && (
        <span className={cn("text-xs", projected > limit ? "text-warning-foreground" : "text-muted-foreground")}>
          Projected {formatNumber(projected)} by period end{projected > limit ? " — over the included amount" : ""}
        </span>
      )}
    </div>
  );
}
