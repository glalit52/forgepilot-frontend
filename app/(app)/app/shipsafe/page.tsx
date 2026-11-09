"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BugIcon,
  CheckCircle2Icon,
  FlaskConicalIcon,
  RadarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { InfoTip, MockDataBadge, ModuleBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { FailureBreakdown, PassRateTrend, RepoPassRates } from "@/components/shipsafe/charts";
import { BugTable } from "@/components/shipsafe/bug-table";
import { RunTable } from "@/components/shipsafe/run-table";
import {
  RunVerificationButton,
  RunVerificationDialog,
} from "@/components/shipsafe/run-verification-dialog";
import { passRateTone } from "@/components/shipsafe/helpers";
import { useShipSafeOverview } from "@/lib/api/hooks";
import { formatDuration, formatPct } from "@/lib/domain/format";

const KPI_HELP = {
  runs: "Verification runs started in the last 7 days: pull requests, scheduled runs, manual runs and reruns.",
  pass: "Share of runs completed in the last 7 days that passed every selected suite. Infrastructure errors are excluded: they are never blamed on your change.",
  duration:
    "Median wall-clock time from webhook to Check Run conclusion, across all completed runs.",
  flaky:
    "Average share of tests per suite that failed and then passed on retry. Flaky results are tracked but never filed as bugs.",
  bugs: "Confirmed product defects that are open or have a fix in progress.",
  coverage:
    "Pull requests opened in the last 30 days that received at least one ShipSafe verification run.",
  actionable:
    "Of the failures ShipSafe classified as real (excluding flaky), the share that became a bug someone kept. A high number means few false alarms.",
};

function Kpi({
  label,
  help,
  ...rest
}: { label: string; help: string } & Omit<React.ComponentProps<typeof KpiCard>, "label">) {
  return (
    <KpiCard
      label={<InfoTip content={<span className="block max-w-60">{help}</span>}>{label}</InfoTip>}
      {...rest}
    />
  );
}

export default function ShipSafeDashboardPage() {
  const q = useShipSafeOverview();
  const [open, setOpen] = useState(false);
  const d = q.data;

  const last7 = d?.passRateTrend.slice(-7) ?? [];
  const passSpark = d?.passRateTrend.filter((p) => p.runs > 0).map((p) => p.passRatePct) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Testing dashboard"
        description="Every pull request, from an agent or a person, verified against its exact commit with evidence you can open. Passing checks never merge anything: the merge decision stays in GitHub."
        meta={
          <>
            <ModuleBadge module="shipsafe" />
            <MockDataBadge />
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/app/shipsafe/suites">
                <FlaskConicalIcon /> Test suites
              </Link>
            </Button>
            <RunVerificationButton onClick={() => setOpen(true)} />
          </>
        }
      />

      {q.error && !d ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <section
            aria-label="Key metrics"
            className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7"
          >
            {!d ? (
              Array.from({ length: 7 }).map((_, i) => <KpiCardSkeleton key={i} />)
            ) : (
              <>
                <Kpi
                  label="Runs (7 days)"
                  help={KPI_HELP.runs}
                  value={d.kpis.runs7d}
                  spark={last7.map((p) => p.runs)}
                  hint="all triggers"
                />
                <Kpi
                  label="Pass rate"
                  help={KPI_HELP.pass}
                  value={formatPct(d.kpis.passRatePct, 1)}
                  tone={passRateTone(d.kpis.passRatePct, d.kpis.runs7d)}
                  spark={passSpark.slice(-14)}
                  hint="last 7 days"
                />
                <Kpi
                  label="Median duration"
                  help={KPI_HELP.duration}
                  value={d.kpis.medianDurationSec ? formatDuration(d.kpis.medianDurationSec) : "—"}
                  hint="webhook → conclusion"
                />
                <Kpi
                  label="Flaky rate"
                  help={KPI_HELP.flaky}
                  value={formatPct(d.kpis.flakyRatePct, 1)}
                  tone={d.kpis.flakyRatePct > 5 ? "warning" : undefined}
                  hint="avg per suite"
                />
                <Kpi
                  label="Open bugs"
                  help={KPI_HELP.bugs}
                  value={d.kpis.openBugs}
                  tone={d.kpis.openBugs ? "danger" : "success"}
                  hint="product defects"
                />
                <Kpi
                  label="Verification coverage"
                  help={KPI_HELP.coverage}
                  value={formatPct(d.kpis.verificationCoveragePct)}
                  tone={d.kpis.verificationCoveragePct < 80 ? "warning" : undefined}
                  hint="PRs, last 30 days"
                />
                <Kpi
                  label="Actionable defects"
                  help={KPI_HELP.actionable}
                  value={formatPct(d.kpis.actionableDefectPct)}
                  hint="signal, not noise"
                />
              </>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="flex flex-col gap-3 p-4 lg:col-span-2">
              <Section
                title="Pass rate, last 30 days"
                description="Daily share of completed runs that passed, with run volume underneath. Days without runs are skipped."
              >
                {d ? (
                  <PassRateTrend trend={d.passRateTrend} />
                ) : (
                  <Skeleton className="h-64 w-full" />
                )}
              </Section>
            </Card>
            <Card className="flex flex-col gap-3 p-4">
              <Section
                title="Why runs failed"
                description="Every failing test is classified before anyone is paged."
              >
                {d ? (
                  d.failureBreakdown.some((b) => b.count > 0) ? (
                    <FailureBreakdown breakdown={d.failureBreakdown} />
                  ) : (
                    <EmptyState
                      icon={CheckCircle2Icon}
                      title="No classified failures"
                      description="When a test fails, ShipSafe labels it as a product defect, test defect, environment, flaky or infrastructure problem."
                    />
                  )
                ) : (
                  <Skeleton className="h-64 w-full" />
                )}
              </Section>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Section
              className="lg:col-span-2"
              title="Recent runs"
              description="Each run is pinned to an exact head commit."
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/shipsafe/runs">
                    All runs <ArrowRightIcon />
                  </Link>
                </Button>
              }
            >
              {d ? (
                <RunTable
                  runs={d.recentRuns}
                  pageSize={12}
                  caption="Recent verification runs"
                  empty={
                    <EmptyState
                      icon={RadarIcon}
                      title="No runs yet"
                      description="Open a pull request on a connected repository, or start a run on a branch."
                      action={<RunVerificationButton size="sm" onClick={() => setOpen(true)} />}
                    />
                  }
                />
              ) : (
                <TableSkeleton rows={6} cols={5} />
              )}
            </Section>
            <Section
              title="Pass rate by repository"
              description="Completed runs. Lowest first, so problems surface."
            >
              {d ? (
                d.repositories.length ? (
                  <RepoPassRates repositories={d.repositories} />
                ) : (
                  <EmptyState
                    title="No repositories connected"
                    description="Connect a GitHub repository to start verifying pull requests."
                    action={
                      <Button size="sm" asChild>
                        <Link href="/onboarding">Connect GitHub</Link>
                      </Button>
                    }
                  />
                )
              ) : (
                <Skeleton className="h-64 w-full" />
              )}
            </Section>
          </div>

          <Section
            title="Open bugs"
            description="Product defects found by ShipSafe. Send one to DevPilot as a fix task from its detail page."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/shipsafe/bugs">
                  All bugs <ArrowRightIcon />
                </Link>
              </Button>
            }
          >
            {d ? (
              <BugTable
                bugs={d.openBugs}
                pageSize={10}
                empty={
                  <EmptyState
                    icon={BugIcon}
                    title="No open bugs"
                    description="Nothing is waiting on a fix. New product defects appear here as soon as a run classifies them."
                  />
                }
              />
            ) : (
              <TableSkeleton rows={3} cols={5} />
            )}
          </Section>
        </>
      )}

      <RunVerificationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
