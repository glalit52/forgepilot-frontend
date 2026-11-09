"use client";
import Link from "next/link";
import { BugIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { BUG_STATUS, BugTable } from "@/components/shipsafe/bug-table";
import { useUrlState } from "@/components/shipsafe/use-url-state";
import { useBugs } from "@/lib/api/hooks";
import type { BugListItem, Severity } from "@/lib/schemas";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export default function BugsPage() {
  const [f, set] = useUrlState(["status", "severity"] as const);
  const bugs = useBugs({ status: f.status || undefined, severity: f.severity || undefined });
  const filtered = !!(f.status || f.severity);
  const clear = () => set({ status: null, severity: null });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Bugs"
        description="Confirmed product defects from ShipSafe runs, each with reproduction steps, the commit it failed on and evidence. Flaky, environment and infrastructure failures never appear here."
        meta={<MockDataBadge />}
      />
      <FilterBar>
        <FilterSelect
          label="Status"
          value={f.status}
          onChange={(v) => set({ status: v })}
          allLabel="Any status"
          options={(Object.keys(BUG_STATUS) as BugListItem["status"][]).map((s) => ({
            value: s,
            label: BUG_STATUS[s].label,
          }))}
        />
        <FilterSelect
          label="Severity"
          value={f.severity}
          onChange={(v) => set({ severity: v })}
          allLabel="Any severity"
          options={SEVERITIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <XIcon /> Clear filters
          </Button>
        )}
        {bugs.data && (
          <span
            className="text-muted-foreground ml-auto self-center text-xs tabular-nums"
            aria-live="polite"
          >
            {bugs.data.length} bug{bugs.data.length === 1 ? "" : "s"}
          </span>
        )}
      </FilterBar>
      {bugs.isPending ? (
        <TableSkeleton rows={6} cols={6} />
      ) : bugs.error ? (
        <ErrorState error={bugs.error} onRetry={() => bugs.refetch()} />
      ) : (
        <BugTable
          bugs={bugs.data}
          empty={
            filtered ? (
              <EmptyState
                icon={BugIcon}
                title="No bugs match these filters"
                action={
                  <Button variant="outline" size="sm" onClick={clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BugIcon}
                title="No bugs found"
                description="When a test on a pull request fails because the application misbehaves, ShipSafe files a bug here with evidence."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/app/shipsafe/runs">View verification runs</Link>
                  </Button>
                }
              />
            )
          }
        />
      )}
    </div>
  );
}
