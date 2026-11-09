"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  BotIcon,
  ClockIcon,
  DollarSignIcon,
  ShieldCheckIcon,
  TargetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/data-table";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { CHART, shortDate } from "@/components/shared/chart";
import { CompareBars, NorthStarChart, SpendChart } from "@/components/analytics/charts";
import { useAnalytics } from "@/lib/api/hooks";
import type { Analytics } from "@/lib/schemas";
import { formatNumber, formatPct, formatUsd } from "@/lib/domain/format";
import { PROVIDER_LABEL } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";

type Category = Analytics["taskSuccessByType"][number];
type ProviderRow = Analytics["providers"][number];

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const plural = (n: number, one: string, many = `${one}s`) =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

function Takeaway({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-xs">{children}</p>;
}

// ---------------------------------------------------------------- takeaways (computed, never hardcoded)
function northStarTakeaway(d: Analytics) {
  const total = sum(d.northStar.map((p) => p.value));
  if (!total) return "No verified tasks in this range yet.";
  const last = d.northStar[d.northStar.length - 1];
  const prev = d.northStar[d.northStar.length - 2];
  const best = d.northStar.reduce((m, p) => (p.value > m.value ? p : m), d.northStar[0]);
  const change = prev
    ? last.value > prev.value
      ? `up from ${prev.value}`
      : last.value < prev.value
        ? `down from ${prev.value}`
        : "level with the week before"
    : "";
  return `${plural(total, "verified task")} over ${d.northStar.length} weeks. Latest week: ${last.value}${change ? `, ${change}` : ""}. Best week ended ${shortDate(best.date)} with ${best.value}.`;
}

function successTakeaway(cats: Category[]) {
  const withTasks = cats.filter((c) => c.tasks > 0);
  if (!withTasks.length) return "No tasks in this range.";
  const best = [...withTasks].sort((a, b) => b.successPct - a.successPct || b.tasks - a.tasks)[0];
  const rework = [...withTasks].sort((a, b) => b.reworkPct - a.reworkPct)[0];
  return `${best.category} tasks have the highest success rate (${formatPct(best.successPct)} of ${best.tasks}).${rework.reworkPct > 0 ? ` ${rework.category} needs the most rework (${formatPct(rework.reworkPct)}).` : " No category needed rework."}`;
}

function providerTakeaway(ps: ProviderRow[]) {
  const total = sum(ps.map((p) => p.sessions));
  if (!total) return "No agent sessions in this range.";
  const top = [...ps].sort((a, b) => b.sessions - a.sessions)[0];
  return `${PROVIDER_LABEL[top.provider]} ran ${top.sessions} of ${total} sessions (${Math.round((top.sessions / total) * 100)}%). Volumes this uneven usually mean different task mixes.`;
}

function acceptanceTakeaway(a: Analytics["prAcceptance"]) {
  if (!a.agentMerged && !a.humanMerged && !a.agentPct && !a.humanPct)
    return "No closed pull requests in this range.";
  const diff = Math.round(a.agentPct - a.humanPct);
  const rel =
    diff === 0
      ? "the same rate as"
      : diff > 0
        ? `${diff} points above`
        : `${Math.abs(diff)} points below`;
  return `Agent-authored PRs were merged at ${formatPct(a.agentPct)}, ${rel} human-authored PRs (${formatPct(a.humanPct)}), counting PRs closed in this range.`;
}

function usefulnessTakeaway(t: Analytics["testUsefulness"]) {
  if (!t.reported) return "ShipSafe reported no classified failures in this range.";
  return `${formatPct(t.actionablePct)} of ${plural(t.reported, "reported failure")} led to an actionable defect; ${formatNumber(t.falsePositive)} ${t.falsePositive === 1 ? "was" : "were"} closed as won't fix (false positive). Flaky retries are excluded.`;
}

function spendTakeaway(d: Analytics["spendByDay"]) {
  const agent = sum(d.map((x) => x.agentUsd));
  const browser = sum(d.map((x) => x.browserUsd));
  const total = agent + browser;
  if (!total) return "No metered spend in this range.";
  const peak = d.reduce(
    (m, x) => (x.agentUsd + x.browserUsd > m.agentUsd + m.browserUsd ? x : m),
    d[0],
  );
  return `${formatUsd(total)} total; agent runtime is ${Math.round((agent / total) * 100)}% of it. Peak day was ${shortDate(peak.date)} at ${formatUsd(peak.agentUsd + peak.browserUsd, true)}.`;
}

// ---------------------------------------------------------------- page
export default function AnalyticsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const range: 30 | 90 = sp.get("range") === "90" ? 90 : 30;
  const q = useAnalytics(range);

  const setRange = (r: 30 | 90) =>
    router.replace(r === 30 ? pathname : `${pathname}?range=90`, { scroll: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Is AI-assisted work producing verified outcomes? Task success, PR acceptance, test usefulness and cost, segmented so providers aren't judged on raw numbers."
        meta={<MockDataBadge />}
        actions={
          <div
            role="group"
            aria-label="Date range"
            className="bg-muted inline-flex rounded-md p-0.5"
          >
            {([30, 90] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  "focus-visible:ring-ring/50 rounded px-3 py-1 text-xs font-medium outline-none focus-visible:ring-[3px]",
                  range === r
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Last {r} days
              </button>
            ))}
          </div>
        }
      />
      {q.isPending ? (
        <AnalyticsSkeleton />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : isEmpty(q.data) ? (
        <EmptyState
          icon={BarChart3Icon}
          title={`No activity in the last ${range} days`}
          description="Analytics fill in once agents run tasks and ShipSafe verifies pull requests."
          action={
            <Button asChild size="sm">
              <Link href="/app/devpilot/tasks">Create a task</Link>
            </Button>
          }
        />
      ) : (
        <AnalyticsBody d={q.data} />
      )}
    </div>
  );
}

function isEmpty(d: Analytics) {
  return (
    !sum(d.northStar.map((p) => p.value)) &&
    !d.taskSuccessByType.length &&
    !sum(d.providers.map((p) => p.sessions)) &&
    !sum(d.spendByDay.map((x) => x.agentUsd + x.browserUsd))
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function AnalyticsBody({ d }: { d: Analytics }) {
  const verified = sum(d.northStar.map((p) => p.value));
  const nsLast = d.northStar[d.northStar.length - 1]?.value ?? 0;
  const nsPrev = d.northStar[d.northStar.length - 2]?.value;
  const spendTotal = sum(d.spendByDay.map((x) => x.agentUsd + x.browserUsd));

  const catColumns: Column<Category>[] = [
    {
      id: "category",
      header: "Task type",
      cell: (c) => <span className="font-medium">{c.category}</span>,
      sortValue: (c) => c.category,
    },
    {
      id: "tasks",
      header: "Tasks",
      cell: (c) => formatNumber(c.tasks),
      sortValue: (c) => c.tasks,
      align: "right",
    },
    {
      id: "success",
      header: "Success",
      cell: (c) => (
        <span
          className={cn(
            c.successPct >= 80
              ? "text-success-foreground"
              : c.successPct >= 60
                ? "text-warning-foreground"
                : "text-danger-foreground",
            "font-medium",
          )}
        >
          {formatPct(c.successPct)}
        </span>
      ),
      sortValue: (c) => c.successPct,
      align: "right",
    },
    {
      id: "cost",
      header: "Avg cost",
      cell: (c) => formatUsd(c.avgCostUsd, true),
      sortValue: (c) => c.avgCostUsd,
      align: "right",
    },
    {
      id: "rework",
      header: "Rework",
      cell: (c) => formatPct(c.reworkPct),
      sortValue: (c) => c.reworkPct,
      align: "right",
    },
  ];

  const totalSessions = sum(d.providers.map((p) => p.sessions));
  const providerColumns: Column<ProviderRow>[] = [
    {
      id: "provider",
      header: "Provider",
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <BotIcon className="text-muted-foreground size-3.5" aria-hidden />
          {PROVIDER_LABEL[p.provider]}
        </span>
      ),
      sortValue: (p) => PROVIDER_LABEL[p.provider],
    },
    {
      id: "sessions",
      header: "Sessions",
      cell: (p) => (
        <span>
          {formatNumber(p.sessions)}{" "}
          <span className="text-muted-foreground text-xs">
            ({totalSessions ? Math.round((p.sessions / totalSessions) * 100) : 0}%)
          </span>
        </span>
      ),
      sortValue: (p) => p.sessions,
      align: "right",
    },
    { id: "success", header: "Completed", cell: (p) => formatPct(p.successPct), align: "right" },
    {
      id: "minutes",
      header: "Avg duration",
      cell: (p) => `${formatNumber(p.avgMinutes)} min`,
      sortValue: (p) => p.avgMinutes,
      align: "right",
      hideBelow: "md",
    },
    {
      id: "cost",
      header: "Cost",
      cell: (p) => formatUsd(p.costUsd, true),
      sortValue: (p) => p.costUsd,
      align: "right",
    },
    {
      id: "human",
      header: "Human interventions",
      cell: (p) => formatNumber(p.humanInterventions),
      sortValue: (p) => p.humanInterventions,
      align: "right",
      hideBelow: "lg",
    },
  ];

  const tu = d.testUsefulness;
  const a = d.prAcceptance;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Verified tasks"
          value={formatNumber(verified)}
          icon={TargetIcon}
          delta={nsPrev === undefined ? undefined : nsLast - nsPrev}
          deltaLabel={nsPrev === undefined ? undefined : `${nsLast - nsPrev} vs prior week`}
          spark={d.northStar.map((p) => p.value)}
          hint={`last ${d.rangeDays} days`}
        />
        <KpiCard
          label="Time to verify (p50)"
          value={d.timeToVerifyMinP50 ? `${formatNumber(d.timeToVerifyMinP50, 1)} min` : "—"}
          icon={ClockIcon}
          hint="PR opened → ShipSafe result"
        />
        <KpiCard
          label="Cost per verified task"
          value={d.costPerVerifiedTaskUsd ? formatUsd(d.costPerVerifiedTaskUsd, true) : "—"}
          icon={DollarSignIcon}
          hint="agent + browser + compute spend"
        />
        <KpiCard
          label="Test usefulness"
          value={tu.reported ? formatPct(tu.actionablePct) : "—"}
          icon={ShieldCheckIcon}
          hint={
            tu.reported
              ? `${tu.reported} reported · ${tu.falsePositive} false positive`
              : "No reported failures"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>North Star: verified tasks per week</CardTitle>
            <CardDescription>
              Tasks with a defined acceptance outcome and supporting evidence (passing verification
              or an approved maintenance change)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <NorthStarChart
              data={d.northStar}
              label={`Bar chart of verified tasks per week. ${northStarTakeaway(d)}`}
            />
            <Takeaway>{northStarTakeaway(d)}</Takeaway>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>PR acceptance</CardTitle>
            <CardDescription>Merged after human review, as a share of closed PRs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CompareBars
              label={acceptanceTakeaway(a)}
              items={[
                {
                  label: "Agent-authored",
                  pct: a.agentPct,
                  detail: `${a.agentMerged} merged`,
                  color: CHART.series[0],
                },
                {
                  label: "Human-authored",
                  pct: a.humanPct,
                  detail: `${a.humanMerged} merged`,
                  color: CHART.series[1],
                },
              ]}
            />
            <Takeaway>{acceptanceTakeaway(a)}</Takeaway>
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Test usefulness</h3>
              <dl className="grid grid-cols-3 gap-2 text-center" aria-label="Test usefulness">
                <div className="rounded-md border p-2">
                  <dt className="text-muted-foreground text-[11px]">Reported</dt>
                  <dd className="text-lg font-semibold tabular-nums">{tu.reported}</dd>
                </div>
                <div className="rounded-md border p-2">
                  <dt className="text-muted-foreground text-[11px]">Actionable</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {tu.reported ? formatPct(tu.actionablePct) : "—"}
                  </dd>
                </div>
                <div className="rounded-md border p-2">
                  <dt className="text-muted-foreground text-[11px]">False positives</dt>
                  <dd className="text-lg font-semibold tabular-nums">{tu.falsePositive}</dd>
                </div>
              </dl>
              <p className="text-muted-foreground mt-2 text-xs">
                {usefulnessTakeaway(tu)} We track precision, not test count (PRD §3.4).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task success by type</CardTitle>
          <CardDescription>
            Success = met acceptance criteria without being failed; rework = needed another attempt
            or a fix task
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DataTable
            rows={d.taskSuccessByType}
            columns={catColumns}
            getRowId={(c) => c.category}
            initialSort={{ id: "tasks", dir: "desc" }}
            caption="Task success by type"
            empty={<EmptyState title="No tasks in this range" />}
          />
          <Takeaway>{successTakeaway(d.taskSuccessByType)}</Takeaway>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent providers</CardTitle>
          <CardDescription>
            Volume, completion, duration, cost and how often a human had to step in
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            role="note"
            className="border-warning/40 bg-warning-soft/50 flex gap-2 rounded-lg border px-3 py-2 text-xs"
          >
            <AlertTriangleIcon
              className="text-warning-foreground mt-0.5 size-3.5 shrink-0"
              aria-hidden
            />
            <p>
              <span className="font-medium">Don&apos;t rank providers on these numbers.</span> Each
              provider gets a different mix of task types, repositories and difficulty, so raw
              completion rates aren&apos;t comparable. Compare within the same task type above
              before changing routing.
            </p>
          </div>
          <DataTable
            rows={d.providers}
            columns={providerColumns}
            getRowId={(p) => p.provider}
            caption="Agent providers (not ranked)"
            empty={<EmptyState title="No agent sessions in this range" />}
          />
          <Takeaway>{providerTakeaway(d.providers)}</Takeaway>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily spend</CardTitle>
          <CardDescription>
            Metered agent runtime and browser test minutes, {formatUsd(spendTotal)} over{" "}
            {d.rangeDays} days
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <SpendChart
            data={d.spendByDay}
            label={`Stacked bar chart of daily spend, agent runtime and browser tests. ${spendTakeaway(d.spendByDay)}`}
          />
          <Takeaway>
            {spendTakeaway(d.spendByDay)}{" "}
            <Link
              href="/app/billing"
              className="hover:text-foreground underline underline-offset-2"
            >
              Budgets and usage
            </Link>
          </Takeaway>
        </CardContent>
      </Card>
    </>
  );
}
