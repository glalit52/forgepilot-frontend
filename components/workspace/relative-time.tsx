import { formatDateTime, formatRelative } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/** "3 hours ago" with the exact timestamp (and time zone) on hover and for screen readers. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={cn("whitespace-nowrap", className)}>
      {formatRelative(iso)}
    </time>
  );
}
