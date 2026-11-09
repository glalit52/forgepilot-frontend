"use client";
import { useMemo } from "react";
import Link from "next/link";
import { AppWindowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { HealthPill } from "@/components/shared/health-score";
import { CriticalityBadge, MockDataBadge, SlaStatusBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { SearchField, useUrlParams } from "@/components/portal/portal-utils";
import { useApplications } from "@/lib/api/hooks";
import { CRITICALITY_LABEL, LANGUAGE_LABEL, TIER_LABEL } from "@/lib/domain/labels";
import { CriticalitySchema, type ApplicationSummary } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const CRIT_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const SLA_ORDER = { breached: 0, at_risk: 1, on_track: 2 } as const;

const columns: Column<ApplicationSummary>[] = [
  {
    id: "name",
    header: "Application",
    sortValue: (a) => a.name.toLowerCase(),
    cell: (a) => (
      <div className="flex min-w-0 flex-col">
        <Link
          href={`/portal/applications/${a.id}`}
          className="truncate font-medium hover:underline"
        >
          {a.name}
        </Link>
        <span className="text-muted-foreground truncate text-xs">
          {a.languages.map((l) => LANGUAGE_LABEL[l] ?? l).join(", ")}
        </span>
      </div>
    ),
  },
  {
    id: "criticality",
    header: "Criticality",
    sortValue: (a) => CRIT_ORDER[a.criticality],
    cell: (a) => <CriticalityBadge criticality={a.criticality} />,
  },
  {
    id: "repos",
    header: "Repos",
    align: "right",
    sortValue: (a) => a.repoCount,
    cell: (a) => a.repoCount,
    hideBelow: "lg",
  },
  {
    id: "health",
    header: "Health",
    sortValue: (a) => a.healthScore,
    cell: (a) => (
      <span className="inline-flex items-center gap-2">
        <HealthPill score={a.healthScore} />
        <span
          className={cn(
            "text-xs tabular-nums",
            a.healthDelta > 0
              ? "text-success-foreground"
              : a.healthDelta < 0
                ? "text-danger-foreground"
                : "text-muted-foreground",
          )}
          aria-label={`${a.healthDelta >= 0 ? "up" : "down"} ${Math.abs(a.healthDelta)} in 4 weeks`}
        >
          {a.healthDelta > 0 ? "+" : ""}
          {a.healthDelta}
        </span>
      </span>
    ),
  },
  {
    id: "open",
    header: "Open tasks",
    align: "right",
    sortValue: (a) => a.openTasks,
    cell: (a) => a.openTasks,
  },
  {
    id: "sla",
    header: "SLA",
    sortValue: (a) => SLA_ORDER[a.slaStatus],
    cell: (a) => <SlaStatusBadge status={a.slaStatus} />,
  },
  {
    id: "tier",
    header: "Tier",
    sortValue: (a) => a.tier ?? "",
    cell: (a) => (
      <span className="text-muted-foreground text-sm">{a.tier ? TIER_LABEL[a.tier] : "—"}</span>
    ),
    hideBelow: "lg",
  },
];

export default function ApplicationsPage() {
  const q = useApplications();
  const url = useUrlParams();
  const text = url.get("q");
  const crit = url.get("criticality");

  const filtered = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (q.data ?? []).filter(
      (a) =>
        (!t ||
          a.name.toLowerCase().includes(t) ||
          (a.description ?? "").toLowerCase().includes(t)) &&
        (!crit || a.criticality === crit),
    );
  }, [q.data, text, crit]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Applications"
        description="Every application ForgePilot maintains for you, with its health score, open work and SLA status."
        meta={<MockDataBadge />}
      />
      <QueryState
        query={q}
        loading={<TableSkeleton cols={6} />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={AppWindowIcon}
            title="No applications yet"
            description="Connect your Git provider and map repositories to applications to get them covered."
            action={
              <Button asChild>
                <Link href="/portal/onboarding">Add applications</Link>
              </Button>
            }
          />
        }
      >
        {() => (
          <div className="flex flex-col gap-3">
            <FilterBar>
              <SearchField
                value={text}
                onChange={(v) => url.set({ q: v })}
                placeholder="Application name"
              />
              <FilterSelect
                label="Criticality"
                value={crit}
                onChange={(v) => url.set({ criticality: v })}
                options={CriticalitySchema.options.map((c) => ({
                  value: c,
                  label: CRITICALITY_LABEL[c],
                }))}
              />
              {(text || crit) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => url.set({ q: null, criticality: null })}
                >
                  Clear filters
                </Button>
              )}
            </FilterBar>
            <DataTable
              caption="Applications"
              rows={filtered}
              columns={columns}
              getRowId={(a) => a.id}
              rowHref={(a) => `/portal/applications/${a.id}`}
              initialSort={{ id: "criticality", dir: "asc" }}
              empty={
                <EmptyState
                  title="No applications match these filters"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => url.set({ q: null, criticality: null })}
                    >
                      Clear filters
                    </Button>
                  }
                />
              }
            />
          </div>
        )}
      </QueryState>
    </div>
  );
}
