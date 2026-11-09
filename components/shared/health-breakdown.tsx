import type { Health, HealthDimension } from "@/lib/schemas";
import { HEALTH_DIMENSION_LABEL, HEALTH_WEIGHTS, healthBand } from "@/lib/domain/health";
import { cn } from "@/lib/utils";

const DIMS: HealthDimension[] = ["security", "dependencies", "buildStability", "tests", "docs"];

/** Explainable score: each dimension, its weight, and "unknown" when data is missing (PRD §8.5). */
export function HealthBreakdown({ health, className }: { health: Health; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-3", className)}>
      {DIMS.map((d) => {
        const v = health[d];
        const band = v === null ? null : healthBand(v);
        return (
          <div key={d} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm">
            <dt className="text-muted-foreground">
              {HEALTH_DIMENSION_LABEL[d]}
              <span className="text-muted-foreground/80 ml-1 text-xs">{Math.round(HEALTH_WEIGHTS[d] * 100)}%</span>
            </dt>
            <dd className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
              {v !== null && <div className={cn("h-full rounded-full", band === "healthy" ? "bg-success" : band === "at_risk" ? "bg-warning" : "bg-danger")} style={{ width: `${v}%` }} />}
            </dd>
            <dd className={cn("text-right tabular-nums", v === null ? "text-muted-foreground text-xs" : "font-medium")} aria-label={`${HEALTH_DIMENSION_LABEL[d]} ${v === null ? "unknown" : `${v} of 100`}`}>
              {v ?? "Unknown"}
            </dd>
          </div>
        );
      })}
      <p className="text-muted-foreground text-xs">
        Score {health.score} · model {health.scoreVersion}. Unknown dimensions are excluded, never counted as healthy. This is a maintenance summary, not a security certification.
      </p>
    </dl>
  );
}
