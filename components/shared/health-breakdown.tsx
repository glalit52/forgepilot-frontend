import type { HealthBreakdown as HB, HealthDimension } from "@/lib/schemas";
import { HEALTH_DIMENSION_LABEL } from "@/lib/domain/labels";
import { healthBand } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const DIMS: HealthDimension[] = ["dependencies", "security", "buildStability", "tests", "docs"];

/** Five health dimensions as labelled bars. */
export function HealthBreakdown({ health, className }: { health: HB; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-3", className)}>
      {DIMS.map((d) => {
        const v = health[d];
        const band = healthBand(v);
        return (
          <div key={d} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
            <dt className="text-muted-foreground">{HEALTH_DIMENSION_LABEL[d]}</dt>
            <dd className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
              <div
                className={cn(
                  "h-full rounded-full",
                  band === "healthy"
                    ? "bg-success"
                    : band === "at_risk"
                      ? "bg-warning"
                      : "bg-danger",
                )}
                style={{ width: `${v}%` }}
              />
            </dd>
            <dd
              className="text-right font-medium tabular-nums"
              aria-label={`${HEALTH_DIMENSION_LABEL[d]} ${v} of 100`}
            >
              {v}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
