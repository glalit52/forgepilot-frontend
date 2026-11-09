import { Badge } from "@/components/ui/badge";
import type { TaskState } from "@/lib/schemas";
import { TASK_STATE_LABEL } from "@/lib/domain/labels";
import { TASK_STATE_TONE, type Tone } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-neutral",
  info: "bg-info",
  accent: "bg-primary",
};

/** Generic tone badge with a coloured dot. Colour is never the only signal: the label carries meaning. */
export function ToneBadge({
  tone,
  children,
  className,
  pulse,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <Badge variant={tone === "accent" ? "accent" : tone} className={className}>
      <span className="relative flex size-1.5" aria-hidden>
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              DOT[tone],
            )}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", DOT[tone])} />
      </span>
      {children}
    </Badge>
  );
}

/** Task / PR / verification state → colour + label. */
export function StatusBadge({ state, className }: { state: TaskState; className?: string }) {
  return (
    <ToneBadge
      tone={TASK_STATE_TONE[state]}
      className={className}
      pulse={state === "running" || state === "verifying"}
    >
      {TASK_STATE_LABEL[state]}
    </ToneBadge>
  );
}

export function VerificationBadge({
  status,
}: {
  status: "running" | "passed" | "failed" | null | undefined;
}) {
  if (!status) return <ToneBadge tone="neutral">Not run</ToneBadge>;
  if (status === "running")
    return (
      <ToneBadge tone="accent" pulse>
        Verifying
      </ToneBadge>
    );
  return status === "passed" ? (
    <ToneBadge tone="success">Verification passed</ToneBadge>
  ) : (
    <ToneBadge tone="danger">Verification failed</ToneBadge>
  );
}
