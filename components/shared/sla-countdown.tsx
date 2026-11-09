"use client";
import { useEffect, useState } from "react";
import { ClockIcon } from "lucide-react";
import type { TaskSlaRisk } from "@/lib/schemas";
import { formatDateTime, formatDuration } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Live countdown to SLA due time, coloured by risk. */
export function SlaCountdown({ dueAt, risk, className }: { dueAt: string; risk: TaskSlaRisk; className?: string }) {
  const now = useNow();
  const diff = (Date.parse(dueAt) - now) / 1000;
  const text =
    risk === "met"
      ? "SLA met"
      : risk === "missed"
        ? "SLA missed"
        : diff < 0
          ? `${formatDuration(diff)} overdue`
          : `${formatDuration(diff)} left`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        (risk === "breached" || risk === "missed") && "text-danger-foreground",
        risk === "at_risk" && "text-warning-foreground",
        risk === "ok" && "text-muted-foreground",
        risk === "met" && "text-success-foreground",
        className,
      )}
      title={`Due ${formatDateTime(dueAt)}`}
    >
      <ClockIcon className="size-3" aria-hidden />
      {text}
    </span>
  );
}
