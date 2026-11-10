"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CopyIcon,
  FlaskConicalIcon,
  GitCommitHorizontalIcon,
  LockIcon,
  SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Module, PlanId } from "@/lib/schemas";
import { FEATURE_MIN_PLAN, hasFeature, planById } from "@/lib/domain/plans";
import { cn } from "@/lib/utils";

/** Mock data is always clearly marked. */
export function MockDataBadge() {
  return (
    <Badge variant="warning" title="All numbers are computed from fictional demo data">
      <FlaskConicalIcon aria-hidden /> Demo data
    </Badge>
  );
}

export function PlanBadge({ plan, className }: { plan: PlanId; className?: string }) {
  return (
    <Badge variant={plan === "free" ? "neutral" : "accent"} className={cn("uppercase", className)}>
      {planById(plan).name}
    </Badge>
  );
}

const MODULE_STYLE: Record<Module, { label: string; cls: string }> = {
  devpilot: { label: "DevPilot", cls: "bg-[var(--chart-1)]" },
  shipsafe: { label: "ShipSafe", cls: "bg-[var(--chart-2)]" },
  codekeeper: { label: "CodeKeeper", cls: "bg-[var(--chart-5)]" },
};
export function ModuleDot({ module, className }: { module: Module; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        MODULE_STYLE[module].cls,
        className,
      )}
      aria-hidden
    />
  );
}
export function ModuleBadge({ module }: { module: Module }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <ModuleDot module={module} />
      {MODULE_STYLE[module].label}
    </Badge>
  );
}

/** Copy a value to the clipboard with feedback. */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={done ? "Copied" : label}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

/** Commit SHA pin, monospace, copyable. */
export function CommitSha({
  sha,
  className,
}: {
  sha: string | null | undefined;
  className?: string;
}) {
  if (!sha) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs", className)} title={sha}>
      <GitCommitHorizontalIcon className="text-muted-foreground size-3.5" aria-hidden />
      {sha.slice(0, 7)}
      <span className="sr-only">full SHA {sha}</span>
    </span>
  );
}

/** Neutral monogram tile used instead of third-party logos. */
export function Monogram({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold tracking-wide",
        className,
      )}
      aria-hidden
    >
      {text}
    </span>
  );
}

/** Wrap a plan-gated feature: shows an upgrade nudge instead of the feature below the required plan. */
export function PlanGate({
  plan,
  feature,
  children,
  title,
}: {
  plan: PlanId;
  feature: keyof typeof FEATURE_MIN_PLAN;
  children: React.ReactNode;
  title: string;
}) {
  if (hasFeature(plan, feature)) return <>{children}</>;
  const need = planById(FEATURE_MIN_PLAN[feature]);
  return (
    <div className="bg-accent/40 flex flex-col items-start gap-2 rounded-lg border border-dashed p-5">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <LockIcon className="size-4" aria-hidden /> {title} is available on {need.name} and above
      </span>
      <p className="text-muted-foreground text-sm">
        Upgrade to unlock it for everyone in this workspace.
      </p>
      <Button asChild size="sm">
        <Link href="/app/billing?upgrade=1">
          <SparklesIcon /> Upgrade to {need.name}
        </Link>
      </Button>
    </div>
  );
}

export function InfoTip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-4">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
