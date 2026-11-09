import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { healthBand } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const RING: Record<string, string> = {
  healthy: "stroke-success",
  at_risk: "stroke-warning",
  poor: "stroke-danger",
};
const BAND_LABEL = { healthy: "Healthy", at_risk: "At risk", poor: "Poor" };

/** 0–100 ring with colour band (≥80 green, 60–79 amber, <60 red) and trend arrow. */
export function HealthScore({
  score,
  delta,
  size = 56,
  showLabel = false,
  className,
}: {
  score: number;
  delta?: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const band = healthBand(score);
  const stroke = Math.max(4, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const Trend = delta === undefined ? null : delta > 0 ? ArrowUpRightIcon : delta < 0 ? ArrowDownRightIcon : ArrowRightIcon;
  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`Health score ${score} of 100, ${BAND_LABEL[band]}${delta !== undefined ? `, ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)} in 4 weeks` : ""}`}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            className={RING[band]}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
          style={{ fontSize: Math.max(11, size / 3.4) }}
        >
          {score}
        </span>
      </span>
      {(showLabel || Trend) && (
        <span className="flex flex-col leading-tight">
          {showLabel && <span className="text-xs font-medium">{BAND_LABEL[band]}</span>}
          {Trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs tabular-nums",
                delta! > 0 ? "text-success-foreground" : delta! < 0 ? "text-danger-foreground" : "text-muted-foreground",
              )}
            >
              <Trend className="size-3" aria-hidden />
              {delta! > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/** Compact inline score pill for tables. */
export function HealthPill({ score }: { score: number }) {
  const band = healthBand(score);
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        band === "healthy" && "bg-success-soft text-success-foreground",
        band === "at_risk" && "bg-warning-soft text-warning-foreground",
        band === "poor" && "bg-danger-soft text-danger-foreground",
      )}
      aria-label={`Health ${score}, ${BAND_LABEL[band]}`}
    >
      {score}
    </span>
  );
}
