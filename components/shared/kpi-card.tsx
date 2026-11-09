import { ArrowDownRightIcon, ArrowUpRightIcon, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

/** Label, value, delta, sparkline. */
export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  goodWhen = "up",
  spark,
  icon: Icon,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  goodWhen?: "up" | "down";
  spark?: number[];
  icon?: LucideIcon;
  tone?: "success" | "warning" | "danger";
  className?: string;
}) {
  const good =
    delta === undefined || delta === null || delta === 0 ? null : delta > 0 === (goodWhen === "up");
  return (
    <Card className={cn("flex flex-col gap-2 p-4", className)}>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs font-medium">
        <span>{label}</span>
        {Icon && <Icon className="size-4" aria-hidden />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            tone === "success" && "text-success-foreground",
            tone === "warning" && "text-warning-foreground",
            tone === "danger" && "text-danger-foreground",
          )}
        >
          {value}
        </div>
        {spark && spark.length > 1 && <Sparkline values={spark} />}
      </div>
      <div className="flex min-h-4 flex-wrap items-center gap-x-2 text-xs">
        {delta !== undefined && delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium tabular-nums",
              good === true && "text-success-foreground",
              good === false && "text-danger-foreground",
              good === null && "text-muted-foreground",
            )}
          >
            {delta > 0 ? (
              <ArrowUpRightIcon className="size-3" aria-hidden />
            ) : delta < 0 ? (
              <ArrowDownRightIcon className="size-3" aria-hidden />
            ) : null}
            {delta > 0 ? "+" : ""}
            {deltaLabel ?? delta}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}
