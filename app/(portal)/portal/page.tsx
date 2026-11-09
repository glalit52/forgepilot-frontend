"use client";
import Link from "next/link";
import {
  AlertOctagonIcon,
  AppWindowIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  ClockIcon,
  GitPullRequestIcon,
  PiggyBankIcon,
  PlugZapIcon,
  ShieldAlertIcon,
  SirenIcon,
  TargetIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ActorChip } from "@/components/shared/actor-chip";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { HealthTrendChart } from "@/components/portal/charts";
import { usePortalOverview } from "@/lib/api/hooks";
import { EVIDENCE_EVENT_LABEL } from "@/lib/domain/labels";
import {
  formatDateTime,
  formatNumber,
  formatPct,
  formatRelative,
  formatUsd,
} from "@/lib/domain/format";
import type { AttentionItem, PortalOverview } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const ATTENTION_ICON: Record<AttentionItem["kind"], React.ComponentType<{ className?: string }>> = {
  approval: GitPullRequestIcon,
  sla_risk: ClockIcon,
  critical_cve: ShieldAlertIcon,
  escalation: SirenIcon,
  integration_error: PlugZapIcon,
};

const SEVERITY_CLASS: Record<AttentionItem["severity"], string> = {
  danger: "bg-danger-soft text-danger-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  info: "bg-info-soft text-info-foreground",
};

function pctDelta(value: number, previous: number | null) {
  if (previous === null) return null;
  return Math.round((value - previous) * 10) / 10;
}

function Kpis({ kpis }: { kpis: PortalOverview["kpis"] }) {
  const sla = kpis.slaMetPct;
  const changes = kpis.changesDelivered;
  const saving = kpis.estimatedSavingUsd;
  const slaDelta = pctDelta(sla.value, sla.previous);
  const changesDelta = changes.previous === null ? null : changes.value - changes.previous;
  const savingDelta = saving.previous === null ? null : saving.value - saving.previous;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Applications covered"
        value={formatNumber(kpis.applicationsCovered.value)}
        icon={AppWindowIcon}
        hint="under one SLA"
      />
      <KpiCard
        label="SLA met"
        value={formatPct(sla.value, 1)}
        icon={TargetIcon}
        tone={
          sla.value >= sla.target ? "success" : sla.value >= sla.target - 10 ? "warning" : "danger"
        }
        delta={slaDelta}
        deltaLabel={slaDelta !== null ? `${formatNumber(slaDelta, 1)} pts` : undefined}
        hint={`target ${formatPct(sla.target)}`}
      />
      <KpiCard
        label="Changes delivered · 30 days"
        value={formatNumber(changes.value)}
        icon={GitPullRequestIcon}
        spark={changes.spark}
        delta={changesDelta}
        hint="vs previous 30 days"
      />
      <KpiCard
        label="Estimated saving vs prior vendor"
        value={formatUsd(saving.value, true)}
        icon={PiggyBankIcon}
        delta={savingDelta}
        deltaLabel={savingDelta !== null ? formatUsd(Math.abs(savingDelta), true) : undefined}
        hint={`${formatPct(saving.pct, 1)} saving · last 30 days vs previous 30`}
      />
      <KpiCard
        label="Open approvals"
        value={formatNumber(kpis.openApprovals.value)}
        icon={CheckSquareIcon}
        tone={kpis.openApprovals.value > 0 ? "warning" : undefined}
        hint={
          kpis.openApprovals.value > 0 ? (
            <Link href="/portal/approvals" className="text-primary hover:underline">
              Review now
            </Link>
          ) : (
            "nothing waiting"
          )
        }
      />
    </div>
  );
}

function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length)
    return (
      <EmptyState
        icon={CheckSquareIcon}
        title="Nothing needs your attention"
        description="No approvals waiting, no SLA risks and no critical CVEs open."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/work">See all work</Link>
          </Button>
        }
      />
    );
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((it) => {
        const Icon = ATTENTION_ICON[it.kind];
        return (
          <li key={it.id}>
            <Link
              href={it.href}
              className="hover:bg-accent/60 focus-visible:ring-ring/50 flex items-center gap-3 rounded-md px-2 py-2 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                  SEVERITY_CLASS[it.severity],
                )}
                aria-hidden
              >
                <Icon className="size-3.5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{it.title}</span>
                <span className="text-muted-foreground truncate text-xs">{it.detail}</span>
              </span>
              <span className="sr-only">
                {it.severity === "danger"
                  ? "Urgent"
                  : it.severity === "warning"
                    ? "Needs attention"
                    : "For information"}
              </span>
              <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActivityFeed({ items }: { items: PortalOverview["activity"] }) {
  if (!items.length)
    return (
      <EmptyState
        title="No activity yet"
        description="Events appear here as soon as ForgePilot starts work on your applications."
      />
    );
  return (
    <ol className="flex flex-col divide-y" aria-label="Recent activity">
      {items.map((a) => (
        <li key={a.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{EVIDENCE_EVENT_LABEL[a.event]}</span>
            <ActorChip actor={a.actorResolved} />
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
            <Link href={a.href} className="text-foreground hover:underline">
              {a.taskTitle}
            </Link>
            <span aria-hidden>·</span>
            <span>{a.applicationName}</span>
            <span aria-hidden>·</span>
            <time dateTime={a.at} title={formatDateTime(a.at)}>
              {formatRelative(a.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading overview">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function PortalOverviewPage() {
  const q = usePortalOverview();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Is everything OK, and are we saving money? Every number below is computed from your tasks and evidence."
        meta={<MockDataBadge />}
      />
      {q.isPending ? (
        <OverviewSkeleton />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.kpis.applicationsCovered.value === 0 ? (
        <EmptyState
          icon={AppWindowIcon}
          title="No applications covered yet"
          description="Connect your Git provider and map repositories to applications to start your first health scan."
          action={
            <Button asChild>
              <Link href="/portal/onboarding">Start onboarding</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Kpis kpis={q.data.kpis} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 lg:col-span-2">
              <CardHeader>
                <CardTitle>Health trend</CardTitle>
                <CardDescription>
                  Average health score across your applications, per week, last 12 weeks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {q.data.healthTrend.length ? (
                  <HealthTrendChart data={q.data.healthTrend} height={300} />
                ) : (
                  <EmptyState
                    title="No health history yet"
                    description="The trend appears after the first weekly scan."
                  />
                )}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertOctagonIcon className="text-warning-foreground size-4" aria-hidden />
                  Needs your attention
                </CardTitle>
                <CardDescription>Approvals waiting, SLA risks and critical CVEs</CardDescription>
              </CardHeader>
              <CardContent>
                <AttentionList items={q.data.attention} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Last 10 events — every action shows whether an AI agent or a named person did it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={q.data.activity} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
