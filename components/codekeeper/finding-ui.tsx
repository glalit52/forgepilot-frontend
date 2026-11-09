"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToneBadge } from "@/components/shared/status-badge";
import type { FindingListItem, FindingStatus } from "@/lib/schemas";
import type { Tone } from "@/lib/domain/status";

export type RiskBand = FindingListItem["riskBand"];

export const RISK_BAND_RANK: Record<RiskBand, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};
const RISK_BAND_TONE: Record<RiskBand, Tone> = {
  urgent: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};
export const RISK_BAND_HELP =
  "Risk band ranks findings by advisory severity, confidence, exposure (direct vs transitive) and your workspace policy. It decides queue order.";

export function RiskBandBadge({ band }: { band: RiskBand }) {
  return (
    <ToneBadge tone={RISK_BAND_TONE[band]} title={RISK_BAND_HELP}>
      {RISK_BAND_LABEL[band]} risk
    </ToneBadge>
  );
}

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Open",
  task_created: "Task created",
  suppressed: "Suppressed",
  resolved: "Resolved",
};
const FINDING_STATUS_TONE: Record<FindingStatus, Tone> = {
  open: "warning",
  task_created: "info",
  suppressed: "neutral",
  resolved: "success",
};
const FINDING_STATUS_HELP: Record<FindingStatus, string> = {
  open: "Detected on the latest scan and not yet acted on.",
  task_created: "A maintenance task is working on it. It closes when a rescan no longer sees it.",
  suppressed: "Hidden from the queue by an admin until the suppression expires.",
  resolved: "The latest scan no longer detects it.",
};

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return (
    <ToneBadge tone={FINDING_STATUS_TONE[status]} title={FINDING_STATUS_HELP[status]}>
      {FINDING_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

export const CONFIDENCE_LABEL: Record<FindingListItem["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function findingHref(id: string) {
  return `/app/codekeeper/findings?finding=${encodeURIComponent(id)}`;
}

/** A button that stays focusable and explains why it is disabled. */
export function GuardedButton({
  reason,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { reason?: string | null }) {
  if (!reason) return <Button {...props}>{children}</Button>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md">
          <Button {...props} disabled aria-describedby={undefined}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
