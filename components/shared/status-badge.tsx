import { Badge } from "@/components/ui/badge";
import type { FailureClass, SessionStatus, Severity, TaskStatus, TestRunStatus } from "@/lib/schemas";
import {
  FAILURE_CLASS_HELP,
  FAILURE_CLASS_LABEL,
  FAILURE_CLASS_TONE,
  RUN_STATUS_LABEL,
  RUN_STATUS_TONE,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_TONE,
  SEVERITY_TONE,
  TASK_STATUS_TONE,
  type Tone,
} from "@/lib/domain/status";
import { TASK_STATUS_LABEL } from "@/lib/domain/workflow";
import { cn } from "@/lib/utils";

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-neutral",
  info: "bg-info",
  accent: "bg-primary",
};

/** Tone badge with a coloured dot. Colour is never the only signal — the label carries meaning. */
export function ToneBadge({ tone, children, className, pulse, title }: { tone: Tone; children: React.ReactNode; className?: string; pulse?: boolean; title?: string }) {
  return (
    <Badge variant={tone === "accent" ? "accent" : tone} className={className} title={title}>
      <span className="relative flex size-1.5" aria-hidden>
        {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", DOT[tone])} />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", DOT[tone])} />
      </span>
      {children}
    </Badge>
  );
}

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <ToneBadge tone={TASK_STATUS_TONE[status]} className={className} pulse={status === "running" || status === "verifying"}>
      {TASK_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

export function SessionStatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  return (
    <ToneBadge tone={SESSION_STATUS_TONE[status]} className={className} pulse={status === "running"}>
      {SESSION_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

export function RunStatusBadge({ status, className, prefix }: { status: TestRunStatus; className?: string; prefix?: string }) {
  return (
    <ToneBadge tone={RUN_STATUS_TONE[status]} className={className} pulse={status === "running"}>
      {prefix ? `${prefix} ` : ""}
      {RUN_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

export function FailureClassBadge({ classification }: { classification: FailureClass }) {
  return (
    <ToneBadge tone={FAILURE_CLASS_TONE[classification]} title={FAILURE_CLASS_HELP[classification]}>
      {FAILURE_CLASS_LABEL[classification]}
    </ToneBadge>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <ToneBadge tone={SEVERITY_TONE[severity]}>{severity[0].toUpperCase() + severity.slice(1)}</ToneBadge>;
}
