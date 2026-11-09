import { CheckCircle2Icon, CircleDashedIcon, TriangleAlertIcon } from "lucide-react";
import { ToneBadge } from "@/components/shared/status-badge";
import type { Integration } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** Neutral monogram tile — we never show third-party logos. */
export function Monogram({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold",
        className,
      )}
      aria-hidden
    >
      {text}
    </span>
  );
}

export function IntegrationStatusBadge({
  connection,
}: {
  connection: Integration | null | undefined;
}) {
  if (!connection || connection.status === "disconnected")
    return <ToneBadge tone="neutral">Not connected</ToneBadge>;
  if (connection.status === "error") return <ToneBadge tone="danger">Error</ToneBadge>;
  return <ToneBadge tone="success">Connected</ToneBadge>;
}

/** Compact icon form for dense matrices; text stays available to screen readers and on hover. */
export function IntegrationStatusIcon({
  connection,
  providerName,
}: {
  connection: Integration | null | undefined;
  providerName: string;
}) {
  const status = connection?.status ?? "disconnected";
  const label =
    status === "connected"
      ? `${providerName}: connected${connection?.account ? ` (${connection.account})` : ""}`
      : status === "error"
        ? `${providerName}: error${connection?.error ? ` — ${connection.error}` : ""}`
        : `${providerName}: not connected`;
  const Icon =
    status === "connected"
      ? CheckCircle2Icon
      : status === "error"
        ? TriangleAlertIcon
        : CircleDashedIcon;
  return (
    <span title={label} className="inline-flex items-center justify-center">
      <Icon
        className={cn(
          "size-4",
          status === "connected" && "text-success",
          status === "error" && "text-danger",
          status === "disconnected" && "text-muted-foreground/60",
        )}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
