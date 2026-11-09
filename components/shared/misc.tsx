import { FlaskConicalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Severity, TaskType, Criticality } from "@/lib/schemas";
import { CRITICALITY_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import type { SlaStatus } from "@/lib/schemas";
import { ToneBadge } from "./status-badge";

/** Rule 5: mock data is always clearly marked. */
export function MockDataBadge() {
  return (
    <Badge variant="warning" title="All numbers on this page are computed from mock data">
      <FlaskConicalIcon aria-hidden /> Demo data
    </Badge>
  );
}

export function TaskTypeBadge({ type }: { type: TaskType }) {
  return <Badge variant="outline">{TASK_TYPE_LABEL[type]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone =
    severity === "critical" || severity === "high"
      ? "danger"
      : severity === "medium"
        ? "warning"
        : "neutral";
  return <ToneBadge tone={tone}>{severity[0].toUpperCase() + severity.slice(1)}</ToneBadge>;
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  const v = criticality === "critical" ? "danger" : criticality === "high" ? "warning" : "neutral";
  return <Badge variant={v}>{CRITICALITY_LABEL[criticality]}</Badge>;
}

export function SlaStatusBadge({ status }: { status: SlaStatus }) {
  return status === "on_track" ? (
    <ToneBadge tone="success">On track</ToneBadge>
  ) : status === "at_risk" ? (
    <ToneBadge tone="warning">At risk</ToneBadge>
  ) : (
    <ToneBadge tone="danger">Breached</ToneBadge>
  );
}
