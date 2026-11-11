"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  HeartPulseIcon,
  PlugIcon,
  ShieldAlertIcon,
  WrenchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthScore } from "@/components/shared/health-score";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { CommitSha, MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ToneBadge } from "@/components/shared/status-badge";
import { CountBarChart, HealthTrendChart } from "@/components/codekeeper/charts";
import { findingHref, RiskBandBadge } from "@/components/codekeeper/finding-ui";
import { HealthExplainer } from "@/components/codekeeper/health-explainer";
import { RepoHealthCard } from "@/components/codekeeper/repo-health-card";
import { ScanProgress } from "@/components/codekeeper/scan-button";
import { useCodeKeeperOverview } from "@/lib/api/hooks";
import type { CodeKeeperOverview, FindingCategory, Scan, Severity } from "@/lib/schemas";
import { HEALTH_SCORE_VERSION } from "@/lib/domain/health";
import { formatPct, formatRelative } from "@/lib/domain/format";
import { FINDING_CATEGORY_LABEL } from "@/lib/domain/labels";
import { CHART, shortDate } from "@/components/shared/chart";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const SEVERITY_COLOR: Record<Severity, string> = {
  critical: CHART.danger,
  high: "color-mix(in oklch, var(--danger) 60%, var(--card))",
  medium: CHART.warning,
  low: "var(--neutral)",
};
const CATEGORIES: FindingCategory[] = ["vulnerability", "outdated", "build", "tests", "docs"];
const TRIGGER_LABEL: Record<Scan["trigger"], string> = {
  schedule: "Scheduled",
  push: "Push to default branch",
  manual: "Manual",
  onboarding: "Onboarding",
};

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function trendTakeaway(trend: CodeKeeperOverview["healthTrend"]) {
  if (trend.length < 2) return "Not enough scan history for a trend yet.";
  const first = trend[0];
  const last = trend[trend.length - 1];
  const d = last.value - first.value;
  const low = trend.reduce((m, p) => (p.value < m.value ? p : m), trend[0]);
  const dir = d > 0 ? `up ${d} points` : d < 0 ? `down ${Math.abs(d)} points` : "flat";
  return `Average health is ${dir} over ${trend.length} weeks (${first.value} → ${last.value}); the low point was ${low.value} in the week of ${shortDate(low.date)}.`;
}

export default function CodeKeeperHealthPage() {
  const q = useCodeKeeperOverview();
  const data = q.data;
  const anyRunning = !!data?.repositories.some((r) => r.scanRunning);
  const { refetch } = q;

  // Follow running scans closely so the progress bar and score update live.
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => refetch(), 1500);
    return () => clearInterval(t);
  }, [anyRunning, refetch]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repository health"
        description="Dependency, security, build, test and documentation signals for every connected repository, and the maintenance work that improves them."
        meta={<MockDataBadge />}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/codekeeper/dependencies">Dependencies</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app/codekeeper/findings">
                <ShieldAlertIcon /> Review findings
              </Link>
            </Button>
          </>
        }
      />
      {q.isPending ? (
        <OverviewSkeleton />
      ) : q.error || !data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : data.repositories.length === 0 ? (
        <EmptyState
          icon={PlugIcon}
          title="No repositories connected"
          description="Connect a GitHub repository and CodeKeeper will inventory its dependencies, match advisories and score its health."
          action={
            <Button asChild>
              <Link href="/onboarding">Connect a repository</Link>
            </Button>
          }
        />
      ) : (
        <OverviewBody data={data} />
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading repository health">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

function OverviewBody({ data }: { data: CodeKeeperOverview }) {
  const scansByRepo = useMemo(() => {
    const last = new Map<string, Scan>();
    const running = new Map<string, Scan>();
    data.recentScans.forEach((s) => {
      if (s.status === "running" || s.status === "queued") {
        if (!running.has(s.repositoryId)) running.set(s.repositoryId, s);
      } else if (s.status === "completed" && !last.has(s.repositoryId)) last.set(s.repositoryId, s);
    });
    return { last, running };
  }, [data.recentScans]);

  const openTotal = Object.values(data.findingsBySeverity).reduce((s, n) => s + n, 0);
  const sevData = SEVERITIES.map((s) => ({
    key: s,
    label: s[0].toUpperCase() + s.slice(1),
    count: data.findingsBySeverity[s] ?? 0,
    color: SEVERITY_COLOR[s],
  }));
  const catData = CATEGORIES.map((c) => ({
    key: c,
    label: FINDING_CATEGORY_LABEL[c],
    count: data.findingsByCategory[c] ?? 0,
    color: CHART.series[0],
  })).filter((d) => d.count > 0 || ["vulnerability", "outdated"].includes(d.key));
  const topCat = [...catData].sort((a, b) => b.count - a.count)[0];
  const severe = (data.findingsBySeverity.critical ?? 0) + (data.findingsBySeverity.high ?? 0);
  const m = data.maintenance;
  const weakest = [...data.repositories].sort((a, b) => a.health.score - b.health.score)[0];
  const unknownRepos = data.repositories.filter((r) =>
    (["dependencies", "security", "buildStability", "tests", "docs"] as const).some(
      (d) => r.health[d] === null,
    ),
  ).length;
  const version = data.repositories[0]?.health.scoreVersion ?? HEALTH_SCORE_VERSION;
  const repos = [...data.repositories].sort((a, b) => a.health.score - b.health.score);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Workspace health</CardTitle>
              <CardDescription>
                Average across {plural(data.repositories.length, "repository", "repositories")},
                last 12 weeks
              </CardDescription>
            </div>
            <HealthScore score={data.avgHealth} size={64} showLabel />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.healthTrend.length > 1 ? (
              <HealthTrendChart
                data={data.healthTrend}
                label={`Line chart of average health score per week. ${trendTakeaway(data.healthTrend)}`}
              />
            ) : (
              <EmptyState title="Trend appears after a few weekly scans" className="py-8" />
            )}
            <p className="text-muted-foreground text-xs">{trendTakeaway(data.healthTrend)}</p>
            {weakest && (
              <p className="text-muted-foreground text-xs">
                Lowest: <span className="text-foreground font-medium">{weakest.fullName}</span> at{" "}
                {weakest.health.score}.{" "}
                {unknownRepos > 0 &&
                  `${plural(unknownRepos, "repository", "repositories")} ${unknownRepos === 1 ? "has" : "have"} at least one Unknown dimension, excluded from its score.`}
              </p>
            )}
          </CardContent>
        </Card>
        <HealthExplainer version={version} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Open findings"
          value={openTotal}
          icon={ShieldAlertIcon}
          hint={severe ? `${severe} critical or high` : "None critical or high"}
          tone={severe ? "danger" : undefined}
        />
        <KpiCard
          label="Maintenance PRs created"
          value={m.prsCreated}
          icon={GitPullRequestIcon}
          hint="from CodeKeeper findings"
        />
        <KpiCard
          label="Maintenance PR acceptance"
          value={m.prsCreated ? formatPct(m.acceptancePct) : "—"}
          icon={GitMergeIcon}
          hint={
            m.prsCreated
              ? `${m.prsMerged} of ${m.prsCreated} merged after human review`
              : "No maintenance PRs yet"
          }
        />
        <KpiCard
          label="Maintenance in progress"
          value={m.inProgress}
          icon={WrenchIcon}
          hint={
            <Link href="/app/codekeeper/maintenance" className="hover:underline">
              View maintenance tasks
            </Link>
          }
        />
      </div>

      <Section
        title="Repositories"
        description="Sorted by health, lowest first. Scores aren't directly comparable across languages, project types or scan coverage."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {repos.map((r) => (
            <RepoHealthCard
              key={r.id}
              repo={r}
              lastScan={scansByRepo.last.get(r.id) ?? null}
              runningScan={scansByRepo.running.get(r.id) ?? null}
            />
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open findings by severity</CardTitle>
            <CardDescription>Open and in-progress findings across the workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {openTotal ? (
              <>
                <CountBarChart
                  data={sevData}
                  label={`Bar chart of open findings by severity: ${sevData.map((d) => `${d.label} ${d.count}`).join(", ")}.`}
                />
                <p className="text-muted-foreground text-xs">
                  {severe
                    ? `${plural(severe, "finding")} ${severe === 1 ? "is" : "are"} critical or high (${Math.round((severe / openTotal) * 100)}% of open).`
                    : `None of the ${openTotal} open findings is critical or high.`}
                </p>
              </>
            ) : (
              <EmptyState
                title="No open findings"
                description="Every repository is clear on its latest scan."
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open findings by category</CardTitle>
            <CardDescription>What kind of maintenance work is waiting</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {openTotal ? (
              <>
                <CountBarChart
                  data={catData}
                  label={`Bar chart of open findings by category: ${catData.map((d) => `${d.label} ${d.count}`).join(", ")}.`}
                />
                {topCat && (
                  <p className="text-muted-foreground text-xs">
                    {topCat.label} is the largest category with{" "}
                    {plural(topCat.count, "open finding")}.
                  </p>
                )}
              </>
            ) : (
              <EmptyState title="No open findings" className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Section
          className="xl:col-span-3"
          title="Prioritised maintenance queue"
          description="Open findings ranked by risk band, highest first"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/codekeeper/findings">
                All findings <ArrowRightIcon />
              </Link>
            </Button>
          }
        >
          {data.queue.length ? (
            <ol className="divide-y rounded-lg border">
              {data.queue.map((f, i) => (
                <li key={f.id}>
                  <Link
                    href={findingHref(f.id)}
                    className="hover:bg-muted/50 focus-visible:bg-muted/50 flex items-start gap-3 px-3 py-2.5 outline-none"
                  >
                    <span
                      className="text-muted-foreground w-5 pt-0.5 text-right text-xs tabular-nums"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium">{f.title}</span>
                      <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="truncate">{f.repositoryName}</span>
                        {f.advisoryId && <span className="font-mono">{f.advisoryId}</span>}
                        {f.fixedVersion && <span>fix: {f.fixedVersion}</span>}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <RiskBandBadge band={f.riskBand} />
                      <span className="text-muted-foreground text-[11px]">
                        {f.severity[0].toUpperCase() + f.severity.slice(1)} severity
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={HeartPulseIcon}
              title="Queue is clear"
              description="No open findings need a maintenance task right now."
            />
          )}
        </Section>

        <Section
          className="xl:col-span-2"
          title="Recent scans"
          description="Each scan is pinned to a commit and records what changed the score"
        >
          {data.recentScans.length ? (
            <ul className="divide-y rounded-lg border">
              {data.recentScans.map((s) => (
                <li key={s.id} className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{s.repositoryName}</span>
                    {s.status === "running" || s.status === "queued" ? (
                      <ToneBadge tone="accent" pulse>
                        Scanning
                      </ToneBadge>
                    ) : s.status === "failed" ? (
                      <ToneBadge tone="danger">Failed</ToneBadge>
                    ) : s.scoreDelta === null ? (
                      <ToneBadge tone="neutral">No score change</ToneBadge>
                    ) : (
                      <ToneBadge
                        tone={
                          s.scoreDelta > 0 ? "success" : s.scoreDelta < 0 ? "danger" : "neutral"
                        }
                        title={`Score after scan: ${s.scoreAfter}`}
                      >
                        {s.scoreDelta === 0
                          ? `No change · ${s.scoreAfter}`
                          : `${s.scoreDelta > 0 ? "+" : ""}${s.scoreDelta} → ${s.scoreAfter}`}
                      </ToneBadge>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <CommitSha sha={s.commitSha} />
                    <span>{TRIGGER_LABEL[s.trigger]}</span>
                    <span title={s.startedAt}>{formatRelative(s.finishedAt ?? s.startedAt)}</span>
                    {s.findingsCount !== null && <span>{plural(s.findingsCount, "finding")}</span>}
                  </div>
                  {s.status === "running" || s.status === "queued" ? (
                    <ScanProgress scan={s} />
                  ) : (
                    s.changes.length > 0 && (
                      <ul className="text-muted-foreground list-disc pl-4 text-xs">
                        {s.changes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    )
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scans yet" description="Run a scan on any repository above." />
          )}
        </Section>
      </div>
    </>
  );
}
