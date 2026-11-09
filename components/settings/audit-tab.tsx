"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DownloadIcon, ScrollTextIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActorChip } from "@/components/shared/actor-chip";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PlanGate } from "@/components/shared/misc";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { useAuditLogs } from "@/lib/api/hooks";
import type { ActivityItem, SessionInfo } from "@/lib/schemas";
import { FEATURE_MIN_PLAN, hasFeature, planById } from "@/lib/domain/plans";
import { formatDateTime, formatRelative } from "@/lib/domain/format";
import { Guarded } from "./common";

const ACTOR_OPTIONS = [
  { value: "person", label: "People" },
  { value: "agent", label: "Agents" },
  { value: "system", label: "System" },
];

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Builds the CSV entirely in the browser from the rows already loaded. */
function downloadCsv(rows: ActivityItem[], workspaceSlug: string) {
  const header = [
    "time",
    "actor_type",
    "actor",
    "actor_detail",
    "action",
    "resource",
    "detail",
    "ip",
  ];
  const lines = rows.map((r) =>
    [
      r.at,
      r.actorResolved.type,
      r.actorResolved.name,
      r.actorResolved.detail,
      r.action,
      r.resource,
      r.detail,
      r.ip ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workspaceSlug}-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AuditTab({ session }: { session: SessionInfo }) {
  return (
    <PlanGate plan={session.workspace.plan} feature="auditLog" title="The audit log">
      <AuditLog session={session} />
    </PlanGate>
  );
}

function AuditLog({ session }: { session: SessionInfo }) {
  const [actorType, setActorType] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);
  const query = useAuditLogs({ actorType: actorType || undefined, q: q || undefined, limit: 200 });
  const plan = session.workspace.plan;
  const canExport = hasFeature(plan, "auditExport");
  const exportPlan = planById(FEATURE_MIN_PLAN.auditExport).name;

  const columns: Column<ActivityItem>[] = [
    {
      id: "at",
      header: "Time",
      sortValue: (r) => r.at,
      className: "whitespace-nowrap",
      cell: (r) => (
        <time
          dateTime={r.at}
          title={formatDateTime(r.at)}
          className="text-muted-foreground text-xs"
        >
          {formatRelative(r.at)}
        </time>
      ),
    },
    {
      id: "actor",
      header: "Actor",
      sortValue: (r) => r.actorResolved.name,
      cell: (r) => <ActorChip actor={r.actorResolved} className="max-w-56" />,
    },
    {
      id: "action",
      header: "Action",
      sortValue: (r) => r.action,
      cell: (r) => (
        <div className="min-w-0">
          <code className="font-mono text-xs">{r.action}</code>
          <p className="text-muted-foreground text-xs">{r.label}</p>
        </div>
      ),
    },
    {
      id: "resource",
      header: "Resource",
      hideBelow: "md",
      cell: (r) =>
        r.href ? (
          <Link href={r.href} className="text-primary font-mono text-xs hover:underline">
            {r.resource}
          </Link>
        ) : (
          <span className="font-mono text-xs">{r.resource}</span>
        ),
    },
    {
      id: "detail",
      header: "Detail",
      hideBelow: "lg",
      cell: (r) => <span className="text-muted-foreground text-xs">{r.detail || "—"}</span>,
    },
    {
      id: "ip",
      header: "IP",
      hideBelow: "xl",
      cell: (r) => <span className="text-muted-foreground font-mono text-xs">{r.ip ?? "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Every action by people, agents and ForgePilot itself — approvals, policy changes,
        integration changes, runs and merges. Entries can&apos;t be edited or deleted.
      </p>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <FilterBar>
          <FilterSelect
            label="Actor"
            value={actorType}
            onChange={setActorType}
            options={ACTOR_OPTIONS}
            allLabel="Everyone"
          />
          <div className="flex min-w-56 flex-col gap-1">
            <Label htmlFor="audit-q" className="text-muted-foreground text-xs font-normal">
              Search
            </Label>
            <div className="relative">
              <SearchIcon
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="audit-q"
                type="search"
                value={text}
                placeholder="Action, resource or detail"
                className="h-8 pl-8"
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>
        </FilterBar>
        <div className="flex flex-col items-end gap-1">
          <Guarded
            reason={
              canExport
                ? query.data?.length
                  ? null
                  : "Nothing to export with these filters."
                : `CSV export is on ${exportPlan} and above.`
            }
          >
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport || !query.data?.length}
              onClick={() => {
                if (!query.data) return;
                downloadCsv(query.data, session.workspace.slug);
                toast.success(`Exported ${query.data.length} entries`, {
                  description: "Generated in your browser from the rows shown.",
                });
              }}
            >
              <DownloadIcon /> Export CSV
            </Button>
          </Guarded>
          {!canExport && (
            <Link href="/app/billing?upgrade=1" className="text-primary text-xs hover:underline">
              Upgrade to {exportPlan} for audit export
            </Link>
          )}
        </div>
      </div>
      <QueryState query={query} loading={<TableSkeleton rows={8} cols={5} />}>
        {(rows) => (
          <>
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              caption="Audit log"
              pageSize={25}
              empty={
                <EmptyState
                  icon={ScrollTextIcon}
                  title={actorType || q ? "No entries match these filters" : "No audit entries yet"}
                  description={
                    actorType || q
                      ? "Clear the filters to see everything."
                      : "Actions by members, agents and the system appear here as they happen."
                  }
                  action={
                    (actorType || q) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActorType("");
                          setText("");
                        }}
                      >
                        Clear filters
                      </Button>
                    )
                  }
                />
              }
            />
            <p className="text-muted-foreground text-xs">
              Showing the latest {rows.length} entr{rows.length === 1 ? "y" : "ies"}. Retention
              follows your audit policy.
            </p>
          </>
        )}
      </QueryState>
    </div>
  );
}
