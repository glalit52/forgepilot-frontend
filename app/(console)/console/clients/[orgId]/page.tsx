"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AppWindowIcon,
  ArrowRightIcon,
  Building2Icon,
  ListTodoIcon,
  PlugIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Column } from "@/components/shared/data-table";
import { DataTable } from "@/components/shared/data-table";
import { HealthPill } from "@/components/shared/health-score";
import { CriticalityBadge, MockDataBadge, SlaStatusBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { SlaMeter } from "@/components/shared/sla-meter";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { useConsoleUI } from "@/components/console/console-ui";
import { IntegrationStatusBadge, Monogram } from "@/components/console/integration-status";
import { taskColumns } from "@/components/console/task-columns";
import { useClient, useSavingsReport, useSlaReport } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { ApplicationSummary } from "@/lib/schemas";
import { LANGUAGE_LABEL, ROLE_LABEL, TIER_LABEL } from "@/lib/domain/labels";
import { providerById } from "@/lib/domain/integrations";
import { formatDate, formatMonth, formatNumber, formatPct, formatUsd } from "@/lib/domain/format";

const APP_COLUMNS: Column<ApplicationSummary>[] = [
  {
    id: "name",
    header: "Application",
    sortValue: (a) => a.name,
    cell: (a) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{a.name}</span>
        <span className="text-muted-foreground text-xs">
          {a.languages.map((l) => LANGUAGE_LABEL[l] ?? l).join(", ")}
        </span>
      </div>
    ),
  },
  {
    id: "crit",
    header: "Criticality",
    sortValue: (a) => a.criticality,
    cell: (a) => <CriticalityBadge criticality={a.criticality} />,
  },
  {
    id: "repos",
    header: "Repos",
    align: "right",
    sortValue: (a) => a.repoCount,
    cell: (a) => a.repoCount,
  },
  {
    id: "health",
    header: "Health",
    align: "right",
    sortValue: (a) => a.healthScore,
    cell: (a) => <HealthPill score={a.healthScore} />,
  },
  {
    id: "open",
    header: "Open tasks",
    align: "right",
    sortValue: (a) => a.openTasks,
    cell: (a) => a.openTasks,
  },
  { id: "sla", header: "SLA", cell: (a) => <SlaStatusBadge status={a.slaStatus} /> },
];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function SavingsCard({ orgId }: { orgId: string }) {
  const q = useSavingsReport(undefined, orgId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings {q.data ? `· ${formatMonth(q.data.month)}` : ""}</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <Skeleton className="h-20" />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" />
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Estimated saving">
              <span className="text-success-foreground">{formatUsd(q.data.totals.savingUsd)}</span>{" "}
              <span className="text-muted-foreground text-xs font-normal">
                ({formatPct(q.data.totals.savingPct)})
              </span>
            </Fact>
            <Fact label="Prior vendor cost">
              {formatUsd(q.data.totals.priorVendorCostUsd + q.data.totals.baselineCostUsd)}
            </Fact>
            <Fact label="ForgePilot fee">{formatUsd(q.data.totals.forgePilotFeeUsd)}</Fact>
            <Fact label="Tasks · agent share">
              {formatNumber(q.data.totals.tasks)} · {formatPct(q.data.agentSharePct)}
            </Fact>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function SlaReportCard({ orgId }: { orgId: string }) {
  const q = useSlaReport(orgId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <Skeleton className="h-20" />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-4" />
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1.5">
              {q.data.metrics.map((m) => (
                <li key={m.key} className="flex flex-col gap-0.5 text-sm">
                  <span className="text-muted-foreground text-xs">{m.label}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {m.actual === null
                      ? "—"
                      : `${formatNumber(m.actual, 1)}${m.unit === "pct" ? "%" : m.unit === "hours" ? "h" : "m"}`}
                    <span className="text-muted-foreground text-xs">
                      / {m.lowerIsBetter ? "≤" : "≥"}
                      {m.target}
                      {m.unit === "pct" ? "%" : m.unit === "hours" ? "h" : "m"}
                    </span>
                    <span className="flex-1" />
                    {m.met === null ? (
                      <Badge variant="neutral">No data</Badge>
                    ) : m.met ? (
                      <Badge variant="success">Met</Badge>
                    ) : (
                      <Badge variant="danger">Missed</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              {q.data.breachCount} {q.data.breachCount === 1 ? "breach" : "breaches"} on record
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** C-04 Client detail: contract, SLA, apps, contacts, recent tasks, integrations. */
export default function ClientDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const q = useClient(orgId);
  const { openNewTask } = useConsoleUI();
  useBreadcrumbLabel(orgId, q.data?.client.name);

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !q.data) {
    if (q.error instanceof ApiError && q.error.status === 404)
      return (
        <EmptyState
          icon={Building2Icon}
          title="Client not found"
          action={
            <Button asChild variant="outline">
              <Link href="/console/clients">All clients</Link>
            </Button>
          }
        />
      );
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const { client, contract, applications, contacts, tasks, integrations } = q.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={client.name}
        description={`${client.industry} · ${client.region}${client.headquarters ? ` · ${client.headquarters}` : ""}`}
        meta={
          <>
            <Badge variant="outline">{TIER_LABEL[client.tier]}</Badge>
            <SlaStatusBadge status={client.slaStatus} />
            {client.status !== "active" && <Badge variant="neutral">{client.status}</Badge>}
            <MockDataBadge />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/console/tasks?client=${client.id}`}>
                <ListTodoIcon /> All tasks
              </Link>
            </Button>
            <Button onClick={() => openNewTask({ orgId: client.id })}>
              <PlusIcon /> New task for this client
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Contract</CardTitle>
          </CardHeader>
          <CardContent>
            {contract ? (
              <dl className="grid grid-cols-2 gap-3">
                <Fact label="Tier">{TIER_LABEL[contract.tier]}</Fact>
                <Fact label="Price / app / month">{formatUsd(contract.pricePerAppMonthlyUsd)}</Fact>
                <Fact label="Start">{formatDate(contract.startDate)}</Fact>
                <Fact label="End">{formatDate(contract.endDate)}</Fact>
                <Fact label="ARR">{formatUsd(client.arrUsd)}</Fact>
                {client.marginPct !== null && (
                  <Fact label="Margin">{formatPct(client.marginPct, 1)}</Fact>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">No contract on file.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SLA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {contract ? (
              <SlaMeter
                metPct={client.slaMetPct}
                targetPct={contract.slaTargets.slaMetTargetPct}
                label="SLA met"
              />
            ) : (
              <p className="text-sm">
                <span className="font-semibold tabular-nums">{formatPct(client.slaMetPct)}</span>{" "}
                SLA met (no contract target on file)
              </p>
            )}
            {contract && (
              <dl className="grid grid-cols-2 gap-3">
                <Fact label="Critical CVE patch">
                  ≤ {contract.slaTargets.criticalCvePatchHours}h
                </Fact>
                <Fact label="Verification p90">
                  ≤ {contract.slaTargets.verificationMinutesP90}m
                </Fact>
                <Fact label="Approval turnaround">
                  ≤ {contract.slaTargets.approvalTurnaroundHours}h
                </Fact>
                <Fact label="SLA met target">≥ {contract.slaTargets.slaMetTargetPct}%</Fact>
              </dl>
            )}
          </CardContent>
        </Card>
        <SlaReportCard orgId={client.id} />
        <SavingsCard orgId={client.id} />
      </div>

      <Section
        title="Applications"
        description={`${applications.length} under contract · average health ${client.avgHealth}`}
      >
        <DataTable
          caption={`Applications for ${client.name}`}
          rows={applications}
          columns={APP_COLUMNS}
          getRowId={(a) => a.id}
          rowHref={(a) => `/console/repositories?client=${client.id}&app=${a.id}`}
          empty={
            <EmptyState
              icon={AppWindowIcon}
              title="No applications yet"
              description="Applications are added during onboarding."
            />
          }
        />
      </Section>

      <Section
        title="Recent tasks"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/console/tasks?client=${client.id}`}>
              View all <ArrowRightIcon />
            </Link>
          </Button>
        }
      >
        <DataTable
          caption={`Recent tasks for ${client.name}`}
          rows={tasks}
          columns={taskColumns({ client: false })}
          getRowId={(t) => t.id}
          rowHref={(t) => `/console/tasks/${t.id}`}
          empty={
            <EmptyState
              icon={ListTodoIcon}
              title="No tasks yet"
              action={
                <Button onClick={() => openNewTask({ orgId: client.id })}>
                  <PlusIcon /> New task
                </Button>
              }
            />
          }
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Contacts">
          {contacts.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No contacts"
              description="The client admin can invite people from the portal."
              className="py-6"
            />
          ) : (
            <Card>
              <ul className="divide-y">
                {contacts.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <a
                        href={`mailto:${u.email}`}
                        className="text-muted-foreground truncate text-xs hover:underline"
                      >
                        {u.email}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {u.title && (
                        <span className="text-muted-foreground hidden text-xs md:inline">
                          {u.title}
                        </span>
                      )}
                      <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>
                      {u.status === "invited" && <Badge variant="neutral">Invited</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Section>
        <Section
          title="Integrations"
          description="Managed by the client admin in the portal (read-only here)."
        >
          {integrations.length === 0 ? (
            <EmptyState icon={PlugIcon} title="No integrations connected" className="py-6" />
          ) : (
            <Card>
              <ul className="divide-y">
                {integrations.map((i) => {
                  const p = providerById(i.providerId);
                  return (
                    <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Monogram text={p?.monogram ?? i.providerId.slice(0, 2).toUpperCase()} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p?.name ?? i.providerId}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {i.status === "error" && i.error ? i.error : i.account}
                        </p>
                      </div>
                      <IntegrationStatusBadge connection={i} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </Section>
      </div>
    </div>
  );
}
