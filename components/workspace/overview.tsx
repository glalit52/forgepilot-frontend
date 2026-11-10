"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  BotIcon,
  BugIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleIcon,
  GaugeIcon,
  GitPullRequestIcon,
  HeartPulseIcon,
  InfoIcon,
  PlusIcon,
  RadarIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import type { AttentionItem, Overview, SessionListItem } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorChip } from "@/components/shared/actor-chip";
import { KpiCard } from "@/components/shared/kpi-card";
import { InfoTip, ModuleDot } from "@/components/shared/misc";
import { EmptyState } from "@/components/shared/states";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import { formatDuration, formatPct, formatUsd } from "@/lib/domain/format";
import { healthBand } from "@/lib/domain/health";
import type { Module } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { NorthStarBars } from "./charts";
import { GatedButton } from "./gated-button";

// ---------------------------------------------------------------- greeting

export function greeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------- north star

export function NorthStarCard({ data }: { data: Overview["northStar"] }) {
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthLabel = new Intl.DateTimeFormat(undefined, { month: "long" }).format(lastMonth);
  const best = data.weekly.reduce(
    (b, w) => (w.value > b.value ? w : b),
    data.weekly[0] ?? { date: "", value: 0 },
  );
  const total8w = data.weekly.reduce((s, w) => s + w.value, 0);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheckIcon className="size-3.5" aria-hidden /> North Star
          </span>
          <h2 className="text-sm font-semibold">
            <InfoTip content="PRD §3.3: verified engineering tasks completed per workspace per month.">
              Verified tasks this month
            </InfoTip>
          </h2>
        </div>
        <Link
          href="/app/analytics"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-xs"
        >
          Analytics <ChevronRightIcon className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="flex items-baseline gap-3">
        <span
          className="text-4xl font-semibold tracking-tight tabular-nums"
          data-testid="north-star-value"
        >
          {data.value}
        </span>
        <span className="text-muted-foreground text-sm">
          month to date · <span className="tabular-nums">{data.previous}</span> in {lastMonthLabel}
        </span>
      </div>
      <NorthStarBars
        data={data.weekly}
        label={`Verified tasks per week for the last ${data.weekly.length} weeks: ${data.weekly.map((w) => w.value).join(", ")}`}
      />
      <p className="text-muted-foreground text-xs">
        {total8w} verified in the last {data.weekly.length} weeks
        {best.value > 0 ? `, best week ${best.value}` : ""}. The current week (lighter bar) is still
        in progress.
      </p>
      <p className="bg-muted/60 text-muted-foreground rounded-md px-3 py-2 text-xs leading-relaxed">
        A <span className="text-foreground font-medium">verified task</span> met its acceptance
        criteria with supporting evidence — passing ShipSafe checks or an approved maintenance
        change. Agent activity on its own never counts.
      </p>
    </Card>
  );
}

export function NorthStarSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-10 w-full" />
    </Card>
  );
}

// ---------------------------------------------------------------- KPIs

function KpiLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group focus-visible:ring-ring/50 [&>div]:group-hover:border-primary/40 rounded-lg outline-none focus-visible:ring-[3px] [&>div]:h-full [&>div]:transition-colors"
    >
      {children}
    </Link>
  );
}

export function KpiGrid({ kpis }: { kpis: Overview["kpis"] }) {
  const health = kpis.avgHealth;
  const band = health === null ? null : healthBand(health);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Key metrics" role="group">
      <KpiLink href="/app/devpilot/sessions">
        <KpiCard
          label="Active agent sessions"
          icon={TerminalSquareIcon}
          value={kpis.activeSessions}
          hint="running or waiting for input"
        />
      </KpiLink>
      <KpiLink href="/app/pull-requests?filter=review">
        <KpiCard
          label="PRs awaiting review"
          icon={GitPullRequestIcon}
          value={kpis.prsAwaitingReview}
          tone={kpis.prsAwaitingReview > 0 ? "warning" : undefined}
          hint="open, no review decision yet"
        />
      </KpiLink>
      <KpiLink href="/app/shipsafe">
        <KpiCard
          label="Verification coverage"
          icon={ShieldCheckIcon}
          value={formatPct(kpis.verificationCoveragePct)}
          tone={
            kpis.verificationCoveragePct >= 90
              ? "success"
              : kpis.verificationCoveragePct >= 60
                ? "warning"
                : "danger"
          }
          hint="of PRs opened in 30 days"
        />
      </KpiLink>
      <KpiLink href="/app/shipsafe/runs">
        <KpiCard
          label="Pass rate"
          icon={RadarIcon}
          value={formatPct(kpis.passRatePct)}
          tone={kpis.passRatePct >= 90 ? "success" : kpis.passRatePct >= 70 ? "warning" : "danger"}
          hint="ShipSafe runs, last 7 days"
        />
      </KpiLink>
      <KpiLink href="/app/shipsafe/bugs">
        <KpiCard
          label="Open bugs"
          icon={BugIcon}
          value={kpis.openBugs}
          tone={kpis.openBugs > 0 ? "danger" : "success"}
          hint="product defects found by ShipSafe"
        />
      </KpiLink>
      <KpiLink href="/app/codekeeper">
        <KpiCard
          label="Avg repository health"
          icon={HeartPulseIcon}
          value={health ?? "Unknown"}
          tone={
            band === "healthy"
              ? "success"
              : band === "at_risk"
                ? "warning"
                : band === "poor"
                  ? "danger"
                  : undefined
          }
          hint={health === null ? "no repositories scanned" : "out of 100, across repositories"}
        />
      </KpiLink>
    </div>
  );
}

export function SpendCard({ spendUsd, budgetUsd }: { spendUsd: number; budgetUsd: number }) {
  const pct = budgetUsd > 0 ? (spendUsd / budgetUsd) * 100 : 0;
  const tone = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <Link
      href="/app/billing"
      className="group focus-visible:ring-ring/50 rounded-lg outline-none focus-visible:ring-[3px]"
    >
      <Card className="group-hover:border-primary/40 flex flex-col gap-2 p-4 transition-colors">
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs font-medium">
          <span>Execution spend this month</span>
          <WalletIcon className="size-4" aria-hidden />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatUsd(spendUsd)}
            <span className="text-muted-foreground text-sm font-normal">
              {" "}
              of {budgetUsd > 0 ? formatUsd(budgetUsd) : "no budget set"}
            </span>
          </span>
          {budgetUsd > 0 && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                pct >= 100
                  ? "text-danger-foreground"
                  : pct >= 80
                    ? "text-warning-foreground"
                    : "text-muted-foreground",
              )}
            >
              {formatPct(pct)} of budget
            </span>
          )}
        </div>
        {budgetUsd > 0 && (
          <Progress
            value={Math.min(100, pct)}
            indicatorClassName={tone}
            aria-label={`Spend ${formatUsd(spendUsd)} of ${formatUsd(budgetUsd)} budget`}
          />
        )}
        <span className="text-muted-foreground text-xs">
          Agent runtime and browser minutes. Subscription not included.
        </span>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------- lifecycle funnel

export function LifecycleStrip({ stages }: { stages: Overview["lifecycle"] }) {
  return (
    <nav aria-label="Work by lifecycle stage">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stages.map((s, i) => (
          <li key={s.key} className="relative">
            <Link
              href={s.href}
              className="group bg-card hover:border-primary/40 focus-visible:ring-ring/50 flex h-full items-center justify-between gap-2 rounded-lg border px-4 py-3 outline-none focus-visible:ring-[3px]"
            >
              <span className="flex flex-col">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  {i + 1}. {s.label}
                </span>
                <span className="text-xl font-semibold tabular-nums">{s.count}</span>
              </span>
              <ArrowRightIcon
                className="text-muted-foreground group-hover:text-primary size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------- attention

const SEVERITY_STYLE: Record<
  AttentionItem["severity"],
  { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }
> = {
  danger: { icon: AlertOctagonIcon, cls: "text-danger-foreground bg-danger-soft", label: "Urgent" },
  warning: {
    icon: AlertTriangleIcon,
    cls: "text-warning-foreground bg-warning-soft",
    label: "Needs a decision",
  },
  info: { icon: InfoIcon, cls: "text-info-foreground bg-info-soft", label: "For your information" },
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length)
    return (
      <EmptyState
        icon={CheckCircle2Icon}
        title="All clear"
        description="No failed checks, pending approvals or critical findings right now."
      />
    );
  return (
    <ul className="divide-y" aria-label="Needs your attention">
      {items.map((a) => {
        const s = SEVERITY_STYLE[a.severity];
        const Icon = s.icon;
        return (
          <li key={`${a.kind}-${a.id}`}>
            <Link
              href={a.href}
              className="group hover:bg-muted/50 focus-visible:bg-muted/50 flex items-start gap-3 px-5 py-3 outline-none"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                  s.cls,
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="sr-only">{s.label}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium group-hover:underline">
                  {a.title}
                </span>
                <span className="text-muted-foreground truncate text-xs">{a.detail}</span>
              </span>
              <ChevronRightIcon
                className="text-muted-foreground mt-1.5 size-4 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- live sessions

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{formatDuration((now - Date.parse(since)) / 1000)}</span>;
}

export function LiveSessions({
  sessions,
  onNewTask,
  newTaskDisabledReason,
}: {
  sessions: SessionListItem[];
  onNewTask: () => void;
  newTaskDisabledReason?: string | null;
}) {
  if (!sessions.length)
    return (
      <EmptyState
        icon={BotIcon}
        title="No agents running"
        description="Delegate a task and watch the agent work here, live."
        action={
          <GatedButton
            size="sm"
            variant="outline"
            onClick={onNewTask}
            disabledReason={newTaskDisabledReason}
          >
            <PlusIcon /> New task
          </GatedButton>
        }
        className="m-5"
      />
    );
  return (
    <ul className="divide-y" aria-label="Live agent sessions" aria-live="polite">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/app/devpilot/sessions/${s.id}`}
            className="group hover:bg-muted/50 focus-visible:bg-muted/50 flex flex-col gap-1.5 px-5 py-3 outline-none"
          >
            <span className="flex items-center justify-between gap-2">
              <SessionStatusBadge status={s.status} />
              <span className="text-muted-foreground text-xs">
                <Elapsed since={s.startedAt} /> · {formatUsd(s.costUsd, true)}
              </span>
            </span>
            <span className="truncate text-sm font-medium group-hover:underline">
              {s.taskTitle}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <ActorChip
                actor={{ type: "agent", id: s.agent.id, name: s.agent.name, detail: s.agent.model }}
                className="text-xs"
              />
              <span className="text-muted-foreground truncate">{s.repositoryName}</span>
            </span>
            {s.status === "waiting" && s.waitingFor && (
              <span className="text-warning-foreground text-xs">
                {s.waitingFor.kind === "approval"
                  ? "Paused — waiting for an approval"
                  : `Asking: ${s.waitingFor.question ?? "needs your input"}`}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- modules

const MODULE_META: Record<
  Module,
  {
    label: string;
    tagline: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  devpilot: { label: "DevPilot", tagline: "Coding agents", href: "/app/devpilot", icon: BotIcon },
  shipsafe: {
    label: "ShipSafe",
    tagline: "PR verification",
    href: "/app/shipsafe",
    icon: RadarIcon,
  },
  codekeeper: {
    label: "CodeKeeper",
    tagline: "Repository maintenance",
    href: "/app/codekeeper",
    icon: HeartPulseIcon,
  },
};

function ModuleCard({
  module,
  stats,
}: {
  module: Module;
  stats: { label: string; value: React.ReactNode; tone?: "success" | "warning" | "danger" }[];
}) {
  const m = MODULE_META[module];
  const Icon = m.icon;
  return (
    <Link
      href={m.href}
      className="group focus-visible:ring-ring/50 rounded-lg outline-none focus-visible:ring-[3px]"
    >
      <Card className="group-hover:border-primary/40 flex h-full flex-col gap-4 p-4 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ModuleDot module={module} className="size-2.5" />
            <span className="font-semibold">{m.label}</span>
            <span className="text-muted-foreground text-xs">{m.tagline}</span>
          </span>
          <Icon className="text-muted-foreground group-hover:text-primary size-4" aria-hidden />
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-[11px] leading-tight">{s.label}</dt>
              <dd
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  s.tone === "success" && "text-success-foreground",
                  s.tone === "warning" && "text-warning-foreground",
                  s.tone === "danger" && "text-danger-foreground",
                )}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </Link>
  );
}

export function ModuleCards({ modules }: { modules: Overview["modules"] }) {
  const { devpilot, shipsafe, codekeeper } = modules;
  const hb = codekeeper.avgHealth === null ? null : healthBand(codekeeper.avgHealth);
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <ModuleCard
        module="devpilot"
        stats={[
          { label: "Running", value: devpilot.running },
          {
            label: "Ready for review",
            value: devpilot.reviewReady,
            tone: devpilot.reviewReady ? "warning" : undefined,
          },
          { label: "Task success", value: formatPct(devpilot.successRatePct) },
        ]}
      />
      <ModuleCard
        module="shipsafe"
        stats={[
          { label: "Runs today", value: shipsafe.runsToday },
          {
            label: "Pass rate (7d)",
            value: formatPct(shipsafe.passRatePct),
            tone: shipsafe.passRatePct >= 90 ? "success" : "warning",
          },
          {
            label: "Open bugs",
            value: shipsafe.openBugs,
            tone: shipsafe.openBugs ? "danger" : undefined,
          },
        ]}
      />
      <ModuleCard
        module="codekeeper"
        stats={[
          {
            label: "Avg health",
            value: codekeeper.avgHealth ?? "—",
            tone:
              hb === "healthy"
                ? "success"
                : hb === "at_risk"
                  ? "warning"
                  : hb === "poor"
                    ? "danger"
                    : undefined,
          },
          { label: "Open findings", value: codekeeper.openFindings },
          {
            label: "Critical",
            value: codekeeper.critical,
            tone: codekeeper.critical ? "danger" : undefined,
          },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------- setup checklist

function storageKey(workspaceId: string) {
  return `fp:setup-dismissed:${workspaceId}`;
}
function readDismissed(workspaceId: string) {
  try {
    return window.localStorage.getItem(storageKey(workspaceId)) === "1";
  } catch {
    return false;
  }
}

export function SetupChecklist({
  items,
  workspaceId,
}: {
  items: Overview["setup"];
  workspaceId: string;
}) {
  // Start hidden-until-known so a dismissed checklist never flashes on load.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed(workspaceId));
  }, [workspaceId]);
  const done = items.filter((i) => i.done).length;
  if (dismissed !== false || done === items.length) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey(workspaceId), "1");
    } catch {
      /* storage unavailable: dismiss for this visit only */
    }
    setDismissed(true);
  };
  return (
    <Card aria-labelledby="setup-title" className="border-primary/30 bg-accent/30">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle id="setup-title" className="flex items-center gap-2">
            <GaugeIcon className="text-primary size-4" aria-hidden /> Get set up
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {done} of {items.length} done. Finish these to get the full closed loop: agent → PR →
            verification → review.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          aria-label="Dismiss setup checklist"
        >
          <XIcon />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress
          value={(done / items.length) * 100}
          aria-label={`Setup ${done} of ${items.length} complete`}
        />
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((i) => (
            <li key={i.key}>
              <Link
                href={i.href}
                className={cn(
                  "hover:bg-background flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  i.done && "text-muted-foreground",
                )}
              >
                {i.done ? (
                  <CheckCircle2Icon
                    className="text-success-foreground size-4 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <CircleIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                )}
                <span className={cn(i.done && "line-through")}>{i.label}</span>
                <span className="sr-only">{i.done ? "(done)" : "(to do)"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
