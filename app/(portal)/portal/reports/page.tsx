"use client";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart3Icon, DownloadIcon, PiggyBankIcon, TargetIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { SlaMeter } from "@/components/shared/sla-meter";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { ToneBadge } from "@/components/shared/status-badge";
import { SimpleBarChart } from "@/components/portal/charts";
import { StubLabel, useUrlParams } from "@/components/portal/portal-utils";
import { useSavingsReport, useSlaReport } from "@/lib/api/hooks";
import {
  formatDateTime,
  formatMonth,
  formatNumber,
  formatPct,
  formatUsd,
} from "@/lib/domain/format";
import { TASK_TYPE_LABEL } from "@/lib/domain/labels";
import type { SlaMetric } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function downloadPdfStub(what: string) {
  toast.info(`${what} PDF is a stub in this demo`, {
    description:
      "Branded PDF reports arrive in a later phase. Every figure on this page is computed from your tasks.",
  });
}

function LoadingBlock() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading report">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton cols={4} />
    </div>
  );
}

function SavingsTab() {
  const url = useUrlParams();
  const month = url.get("month") || undefined;
  const q = useSavingsReport(month);

  if (q.isPending) return <LoadingBlock />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  const t = r.totals;
  const chart = r.byType.map((b) => ({
    label: TASK_TYPE_LABEL[b.type],
    value: b.priorVendorCostUsd,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-48 flex-col gap-1">
          <Label htmlFor="savings-month" className="text-muted-foreground text-xs font-normal">
            Month
          </Label>
          <Select value={r.month} onValueChange={(v) => url.set({ month: v })}>
            <SelectTrigger id="savings-month" size="sm" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {r.availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => downloadPdfStub("Savings report")}>
          <DownloadIcon aria-hidden /> Download PDF <StubLabel />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Prior vendor would have billed"
          value={formatUsd(t.priorVendorCostUsd)}
          hint={`${formatUsd(t.priorVendorRateUsd)}/h`}
        />
        <KpiCard
          label="ForgePilot fee"
          value={formatUsd(t.forgePilotFeeUsd)}
          hint={`${t.applications} apps × ${formatUsd(t.pricePerAppMonthlyUsd)}`}
        />
        <KpiCard
          label="Saving"
          value={formatUsd(t.savingUsd)}
          icon={PiggyBankIcon}
          tone={t.savingUsd >= 0 ? "success" : "danger"}
          hint={`${formatPct(t.savingPct, 1)} vs prior vendor`}
        />
        <KpiCard
          label="Agent share of work"
          value={formatPct(r.agentSharePct)}
          hint="every change reviewed by an engineer"
        />
      </div>

      {t.tasks === 0 && (
        <EmptyState
          icon={PiggyBankIcon}
          title={`No changes delivered in ${formatMonth(r.month)}`}
          description="The saving below is baseline upkeep only. Pick another month to see delivered work."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader>
            <CardTitle>Work delivered in {formatMonth(r.month)}</CardTitle>
            <CardDescription>
              Estimated hours a prior vendor would bill for the same work, at{" "}
              {formatUsd(t.priorVendorRateUsd)}/hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <caption className="sr-only">
                  Savings by task type for {formatMonth(r.month)}
                </caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead className="text-right">Est. hours</TableHead>
                    <TableHead className="text-right">Prior vendor cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.byType.map((b) => (
                    <TableRow key={b.type}>
                      <TableCell>{TASK_TYPE_LABEL[b.type]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(b.count)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(b.hours)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(b.priorVendorCostUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      Baseline upkeep
                      <span className="text-muted-foreground block text-xs">
                        Regression testing and patch triage a vendor bills monthly
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right">—</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(t.baselineHours)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(t.baselineCostUsd)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/40 font-medium">
                    <TableCell>Prior vendor total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(t.tasks)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(t.hours + t.baselineHours)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(t.priorVendorCostUsd)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3}>
                      ForgePilot fee
                      <span className="text-muted-foreground block text-xs">
                        {t.applications} applications × {formatUsd(t.pricePerAppMonthlyUsd)} per
                        month
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(t.forgePilotFeeUsd)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={3}>
                      Saving{" "}
                      <span className="text-muted-foreground font-normal">
                        ({formatPct(t.savingPct, 1)})
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        t.savingUsd >= 0 ? "text-success-foreground" : "text-danger-foreground",
                      )}
                    >
                      {formatUsd(t.savingUsd)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Prior vendor cost by type</CardTitle>
            <CardDescription>Change work only, excluding baseline upkeep</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={chart}
              valueLabel="Prior vendor cost"
              ariaLabel={`Prior vendor cost by task type, ${formatMonth(r.month)}`}
              formatValue={(v) => formatUsd(v, true)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatMetric(v: number | null, unit: SlaMetric["unit"]) {
  if (v === null) return "—";
  if (unit === "pct") return formatPct(v, 1);
  if (unit === "hours") return `${formatNumber(v, 1)} h`;
  return `${formatNumber(v, 1)} min`;
}

function MetricCard({ m }: { m: SlaMetric }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{m.label}</span>
        {m.met === null ? (
          <ToneBadge tone="neutral">No data</ToneBadge>
        ) : m.met ? (
          <ToneBadge tone="success">Met</ToneBadge>
        ) : (
          <ToneBadge tone="danger">Not met</ToneBadge>
        )}
      </div>
      {m.unit === "pct" && m.actual !== null ? (
        <SlaMeter metPct={m.actual} targetPct={m.target} label="Actual" />
      ) : (
        <dl className="grid grid-cols-2 gap-2">
          <div>
            <dt className="text-muted-foreground text-xs">Target</dt>
            <dd className="text-sm tabular-nums">
              {m.lowerIsBetter ? "≤ " : "≥ "}
              {formatMetric(m.target, m.unit)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Actual</dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular-nums",
                m.met === true && "text-success-foreground",
                m.met === false && "text-danger-foreground",
              )}
            >
              {formatMetric(m.actual, m.unit)}
            </dd>
          </div>
        </dl>
      )}
      <span className="text-muted-foreground text-xs">
        Based on {m.samples} sample{m.samples === 1 ? "" : "s"}
      </span>
    </Card>
  );
}

function SlaTab() {
  const q = useSlaReport();
  if (q.isPending) return <LoadingBlock />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  const target = r.metrics.find((m) => m.key === "slaMet")?.target;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {formatPct(r.slaMetPct, 1)} of tasks delivered within SLA · {r.breachCount} breach
          {r.breachCount === 1 ? "" : "es"}
          {target !== undefined && <> · target {formatPct(target)}</>}
        </p>
        <Button variant="outline" onClick={() => downloadPdfStub("SLA report")}>
          <DownloadIcon aria-hidden /> Download PDF <StubLabel />
        </Button>
      </div>
      {r.metrics.length === 0 ? (
        <EmptyState
          icon={TargetIcon}
          title="No SLA metrics yet"
          description="Metrics appear once the first tasks are delivered."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {r.metrics.map((m) => (
            <MetricCard key={m.key} m={m} />
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Breaches</CardTitle>
          <CardDescription>Tasks that missed their SLA, and why</CardDescription>
        </CardHeader>
        <CardContent>
          {r.breaches.length === 0 ? (
            <EmptyState
              icon={TargetIcon}
              title="No breaches"
              description="Every task was delivered within its SLA."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/portal/work">See all work</Link>
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <caption className="sr-only">SLA breaches</caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Task</TableHead>
                    <TableHead className="hidden lg:table-cell">Due</TableHead>
                    <TableHead className="hidden lg:table-cell">Resolved</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.breaches.map((b) => (
                    <TableRow key={b.taskId}>
                      <TableCell className="max-w-[18rem]">
                        <Link
                          href={`/portal/work/${b.taskId}`}
                          className="block truncate font-medium hover:underline"
                          title={b.title}
                        >
                          {b.title}
                        </Link>
                        <span className="text-muted-foreground text-xs">{b.applicationName}</span>
                      </TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">
                        {formatDateTime(b.dueAt)}
                      </TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">
                        {b.resolvedAt ? (
                          formatDateTime(b.resolvedAt)
                        ) : (
                          <ToneBadge tone="danger">Still open</ToneBadge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-normal">{b.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const url = useUrlParams();
  const tab = url.get("tab") === "sla" ? "sla" : "savings";
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description="Monthly savings against your prior vendor and SLA performance, computed from delivered tasks."
        meta={<MockDataBadge />}
      />
      <Tabs value={tab} onValueChange={(v) => url.set({ tab: v === "savings" ? null : v })}>
        <TabsList>
          <TabsTrigger value="savings">
            <BarChart3Icon aria-hidden /> Savings
          </TabsTrigger>
          <TabsTrigger value="sla">
            <TargetIcon aria-hidden /> SLA
          </TabsTrigger>
        </TabsList>
        <TabsContent value="savings">
          <SavingsTab />
        </TabsContent>
        <TabsContent value="sla">
          <SlaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
