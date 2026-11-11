"use client";
import { useEffect, useState } from "react";
import {
  CalendarClockIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  HandIcon,
  RotateCwIcon,
} from "lucide-react";
import { useMembers, useSession } from "@/lib/api/hooks";
import { can, type Permission } from "@/lib/domain/permissions";
import { ROLE_LABEL } from "@/lib/domain/permissions";

/** Human label + icon for a run trigger (webhook event, schedule, manual, rerun). */
export function triggerInfo(trigger: string) {
  if (trigger === "pull_request.opened") return { label: "PR opened", icon: GitPullRequestIcon };
  if (trigger === "pull_request.synchronize")
    return { label: "PR updated", icon: GitPullRequestIcon };
  if (trigger === "pull_request.reopened")
    return { label: "PR reopened", icon: GitPullRequestIcon };
  if (trigger.startsWith("pull_request"))
    return { label: "Pull request", icon: GitPullRequestIcon };
  if (trigger === "schedule") return { label: "Scheduled", icon: CalendarClockIcon };
  if (trigger === "manual") return { label: "Manual", icon: HandIcon };
  if (trigger === "rerun") return { label: "Rerun", icon: RotateCwIcon };
  if (trigger === "push") return { label: "Push", icon: GitBranchIcon };
  return { label: trigger, icon: GitBranchIcon };
}

export function TriggerLabel({ trigger }: { trigger: string }) {
  const { label, icon: Icon } = triggerInfo(trigger);
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1 text-xs whitespace-nowrap"
      title={trigger}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/** Role-aware permission check with a ready-made explanation for disabled controls. */
export function usePermission(permission: Permission) {
  const session = useSession();
  const role = session.data?.role;
  const allowed = can(role, permission);
  const reason = role
    ? `Your role (${ROLE_LABEL[role]}) can't do this. Ask a workspace admin.`
    : "Loading your permissions…";
  return { allowed, reason, role, loading: session.isPending };
}

/** userId → name, from the members list (falls back to the id). */
export function useMemberNames() {
  const members = useMembers();
  const map = new Map((members.data?.members ?? []).map((m) => [m.id, m.name]));
  return (id: string | null | undefined) => (id ? (map.get(id) ?? id) : "—");
}

/** A ticking clock for progress bars and relative times on live screens. */
export function useNow(intervalMs = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, active]);
  return now;
}

export function passRateTone(
  pct: number,
  runs: number,
): "success" | "warning" | "danger" | undefined {
  if (!runs) return undefined;
  if (pct >= 90) return "success";
  if (pct >= 75) return "warning";
  return "danger";
}
