"use client";
import Link from "next/link";
import {
  BugIcon,
  CircleDotIcon,
  GitPullRequestIcon,
  HandIcon,
  ShieldAlertIcon,
  SquareKanbanIcon,
  TicketIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RunStatusBadge } from "@/components/shared/status-badge";
import type { PullRequest, TaskSource } from "@/lib/schemas";
import { TASK_SOURCE_LABEL } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";
import { SOURCE_SHORT } from "./utils";

const SOURCE_ICON: Record<TaskSource, React.ComponentType<{ className?: string }>> = {
  manual: UserIcon,
  github_issue: CircleDotIcon,
  linear: SquareKanbanIcon,
  jira: TicketIcon,
  shipsafe_failure: BugIcon,
  codekeeper_finding: WrenchIcon,
};

/** Where the task came from (manual, issue tracker, or the closed loop). */
export function SourceChip({
  source,
  sourceRef,
  className,
}: {
  source: TaskSource;
  sourceRef?: string | null;
  className?: string;
}) {
  const Icon = SOURCE_ICON[source];
  return (
    <Badge
      variant={
        source === "shipsafe_failure"
          ? "danger"
          : source === "codekeeper_finding"
            ? "info"
            : "outline"
      }
      className={cn("font-normal", className)}
      title={`${TASK_SOURCE_LABEL[source]}${sourceRef ? ` · ${sourceRef}` : ""}`}
    >
      <Icon aria-hidden />
      {SOURCE_SHORT[source]}
      {sourceRef ? <span className="font-mono">{sourceRef}</span> : null}
    </Badge>
  );
}

/** "Needs approval" chip: the agent is paused on a protected action. */
export function NeedsApprovalChip({ className }: { className?: string }) {
  return (
    <Link
      href="/app/approvals"
      className={cn(
        "bg-warning-soft text-warning-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium outline-none hover:underline focus-visible:ring-[3px]",
        className,
      )}
    >
      <ShieldAlertIcon className="size-3" aria-hidden /> Needs approval
    </Link>
  );
}

export function NeedsAnswerChip({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-warning-soft text-warning-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium outline-none hover:underline focus-visible:ring-[3px]",
        className,
      )}
    >
      <HandIcon className="size-3" aria-hidden /> Needs an answer
    </Link>
  );
}

/** PR number link + ShipSafe check status. */
export function PrCell({
  pr,
  showStatus = true,
}: {
  pr: Pick<PullRequest, "id" | "number" | "checkStatus" | "status"> | null;
  showStatus?: boolean;
}) {
  if (!pr) return <span className="text-muted-foreground text-xs">No PR yet</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Link
        href={`/app/pull-requests/${pr.id}`}
        className="hover:text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        <GitPullRequestIcon className="text-muted-foreground size-3.5" aria-hidden />#{pr.number}
        {pr.status === "merged" && (
          <span className="text-muted-foreground text-xs font-normal">merged</span>
        )}
      </Link>
      {showStatus && <RunStatusBadge status={pr.checkStatus} prefix="ShipSafe" />}
    </span>
  );
}

/** Wrap a (possibly disabled) control so the disabled reason is reachable by hover and keyboard focus. */
export function ReasonTip({
  reason,
  children,
  className,
}: {
  reason?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "focus-visible:ring-ring/50 inline-flex rounded-md outline-none focus-visible:ring-[3px]",
            className,
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
    </Tooltip>
  );
}

/** Two-column definition list for metadata panels. */
export function MetaList({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; hint?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm", className)}>
      {items.map((i) => (
        <div key={i.label} className="contents">
          <dt className="text-muted-foreground" title={i.hint}>
            {i.label}
          </dt>
          <dd className="min-w-0 break-words">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
