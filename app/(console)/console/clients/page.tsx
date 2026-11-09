"use client";
import Link from "next/link";
import { Building2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/shared/data-table";
import { DataTable } from "@/components/shared/data-table";
import { HealthPill } from "@/components/shared/health-score";
import { MockDataBadge, SlaStatusBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { useClients } from "@/lib/api/hooks";
import type { ClientSummary } from "@/lib/schemas";
import { TIER_LABEL } from "@/lib/domain/labels";
import { formatPct, formatUsd } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

function columns(showMargin: boolean): Column<ClientSummary>[] {
  const cols: Column<ClientSummary>[] = [
    {
      id: "name",
      header: "Client",
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex flex-col gap-0.5">
          <Link href={`/console/clients/${c.id}`} className="font-medium hover:underline">
            {c.name}
          </Link>
          <span className="text-muted-foreground text-xs">
            {c.industry} · {c.region}
            {c.status !== "active" && (
              <Badge variant="neutral" className="ml-1.5">
                {c.status}
              </Badge>
            )}
          </span>
        </div>
      ),
    },
    {
      id: "tier",
      header: "Tier",
      sortValue: (c) => c.tier,
      cell: (c) => <Badge variant="outline">{TIER_LABEL[c.tier]}</Badge>,
    },
    {
      id: "apps",
      header: "Apps",
      align: "right",
      sortValue: (c) => c.applications,
      cell: (c) => c.applications,
    },
    {
      id: "arr",
      header: "ARR",
      align: "right",
      sortValue: (c) => c.arrUsd,
      cell: (c) => formatUsd(c.arrUsd, true),
    },
    {
      id: "sla",
      header: "SLA",
      sortValue: (c) => c.slaMetPct,
      cell: (c) => (
        <span className="inline-flex items-center gap-2">
          <SlaStatusBadge status={c.slaStatus} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatPct(c.slaMetPct)} met
          </span>
        </span>
      ),
    },
    {
      id: "open",
      header: "Open tasks",
      align: "right",
      sortValue: (c) => c.openTasks,
      cell: (c) => c.openTasks,
    },
    {
      id: "health",
      header: "Avg health",
      align: "right",
      sortValue: (c) => c.avgHealth,
      cell: (c) => <HealthPill score={c.avgHealth} />,
      hideBelow: "md",
    },
  ];
  if (showMargin) {
    cols.push({
      id: "margin",
      header: "Margin",
      align: "right",
      sortValue: (c) => c.marginPct,
      cell: (c) =>
        c.marginPct === null ? (
          "—"
        ) : (
          <span
            className={cn(
              c.marginPct < 0
                ? "text-danger-foreground"
                : c.marginPct < 30
                  ? "text-warning-foreground"
                  : "",
            )}
          >
            {formatPct(c.marginPct, 1)}
          </span>
        ),
    });
  }
  return cols;
}

/** C-04 Client list. Margin is returned by the API only for delivery managers. */
export default function ClientsPage() {
  const clients = useClients();
  const showMargin = (clients.data ?? []).some((c) => c.marginPct !== null);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clients"
        description="Every client under contract: tier, applications, revenue, SLA and open work."
        meta={<MockDataBadge />}
      />
      {clients.isPending ? (
        <TableSkeleton rows={4} cols={7} />
      ) : clients.error ? (
        <ErrorState error={clients.error} onRetry={() => clients.refetch()} />
      ) : (
        <DataTable
          caption="Clients"
          rows={clients.data}
          columns={columns(showMargin)}
          getRowId={(c) => c.id}
          rowHref={(c) => `/console/clients/${c.id}`}
          initialSort={{ id: "arr", dir: "desc" }}
          empty={
            <EmptyState
              icon={Building2Icon}
              title="No clients yet"
              description="Clients appear here once they finish onboarding in the portal."
            />
          }
        />
      )}
    </div>
  );
}
