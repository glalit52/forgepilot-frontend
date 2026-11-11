"use client";
import { useEffect, useState } from "react";
import { ClockIcon } from "lucide-react";
import { formatDateTime, formatDuration } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/** Live "expires in 2h 14m" countdown. Turns amber under an hour, red once expired. */
export function ExpiryCountdown({
  expiresAt,
  className,
}: {
  expiresAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const left = (Date.parse(expiresAt) - now) / 1000;
  const expired = left <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs tabular-nums",
        expired
          ? "text-danger-foreground"
          : left < 3600
            ? "text-warning-foreground"
            : "text-muted-foreground",
        className,
      )}
      title={`Expires ${formatDateTime(expiresAt)}`}
    >
      <ClockIcon className="size-3.5" aria-hidden />
      {expired ? "Expired" : `Expires in ${formatDuration(left)}`}
    </span>
  );
}
