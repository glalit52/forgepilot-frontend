"use client";
import { useMemo } from "react";
import {
  AlertOctagonIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  GaugeIcon,
  LockIcon,
  PercentIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/shared/data-table";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { AgentShareChart, TasksByStateChart, WorkloadChart } from "@/components/console/ops-charts";
import { taskColumns } from "@/components/console/task-columns";
import { useOps } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { AGENT_LABEL } from "@/lib/domain/labels";
import { formatNumber, formatPct, formatUsd } from "@/lib/domain/format";

function usd2(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

/** C-06 / FE-15 Ops dashboard (delivery manager only). Every number comes from the API. */
export default function OpsPage() {
  const ops = useOps();
  const slaColumns = useMemo(() => taskColumns(), []);

  const header = (
    <PageHeader
      title="Ops dashboard"
      description="Delivery health across all clients: SLA, throughput, agent share, cost and margin."
      meta={<MockDataBadge />}
    />
  );

  if (ops.error instanceof ApiError && ops.error.status === 403) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={LockIcon}
          title="Delivery managers only"
          description="The ops dashboard shows margin and cost data. Ask a delivery manager if you need these numbers."
        />
      </div>
    );
  }
  if (ops.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  if (ops.error || !ops.data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState error={ops.error} onRetry={() => ops.refetch()} />
      </div>
    );
  }

  const { kpis, tasksByStateByClient, agentShareTrend, slaRisk, workload, costByAgent } = ops.data;
  const weekDelta = kpis.tasksCompletedWeek - kpis.tasksCompletedPrevWeek;

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="SLA met"
          value={formatPct(kpis.slaMetPct)}
          icon={ShieldCheckIcon}
          hint="all tasks, all clients"
        />
        <KpiCard
          label="Completed this week"
          value={kpis.tasksCompletedWeek}
          icon={CheckCircle2Icon}
          delta={weekDelta}
          deltaLabel={`${weekDelta < 0 ? "−" : ""}${formatNumber(Math.abs(weekDelta))} vs last week`}
          hint={`${kpis.tasksCompletedPrevWeek} last week`}
        />
        <KpiCard
          label="Agent share"
          value={formatPct(kpis.agentSharePct)}
          icon={BotIcon}
          hint="of delivered code, 30 days"
        />
        <KpiCard
          label="Avg cost per task"
          value={usd2(kpis.avgCostPerTaskUsd)}
          icon={CircleDollarSignIcon}
          hint="agent compute, 30 days"
        />
        <KpiCard
          label="Gross margin"
          value={formatPct(kpis.grossMarginPct, 1)}
          icon={PercentIcon}
          tone={kpis.grossMarginPct < 0 ? "danger" : undefined}
          hint="revenue vs agents + engineers"
        />
        <KpiCard
          label="Escalations"
          value={kpis.escalations}
          icon={AlertOctagonIcon}
          tone={kpis.escalations > 0 ? "warning" : undefined}
          hint="open right now"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by state per client</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksByStateByClient.length ? (
              <TasksByStateChart data={tasksByStateByClient} />
            ) : (
              <EmptyState title="No clients yet" className="py-6" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent share trend</CardTitle>
          </CardHeader>
          <CardContent>
            {agentShareTrend.length ? (
              <AgentShareChart data={agentShareTrend} />
            ) : (
              <EmptyState title="No deliveries yet" className="py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engineer workload</CardTitle>
          </CardHeader>
          <CardContent>
            {workload.length ? (
              <WorkloadChart data={workload} />
            ) : (
              <EmptyState title="No engineers" className="py-6" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost by agent</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <caption className="sr-only">Cost and success rate by agent runtime</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Per run</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costByAgent.map((a) => (
                  <TableRow key={a.agent}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <BotIcon className="text-muted-foreground size-3.5" aria-hidden />
                        {AGENT_LABEL[a.agent]}
                        {a.runs === 0 && <Badge variant="neutral">No runs</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.runs}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(a.costUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.runs ? usd2(a.costUsd / a.runs) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.runs ? formatPct(a.successPct) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <GaugeIcon className="text-muted-foreground size-4" aria-hidden /> SLA risk
            <span className="text-muted-foreground font-normal tabular-nums">{slaRisk.length}</span>
          </span>
        }
        description="Open tasks due within 24 hours or already past due, soonest first."
      >
        <DataTable
          caption="Tasks at SLA risk"
          rows={slaRisk}
          columns={slaColumns}
          getRowId={(t) => t.id}
          rowHref={(t) => `/console/tasks/${t.id}`}
          empty={
            <EmptyState
              icon={ShieldCheckIcon}
              title="No SLA risk"
              description="Every open task is comfortably within its SLA."
            />
          }
        />
      </Section>
    </div>
  );
}
