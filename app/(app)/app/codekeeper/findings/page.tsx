"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InfoIcon, SearchIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { SeverityBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { FindingDetailSheet } from "@/components/codekeeper/finding-detail";
import {
  FINDING_STATUS_LABEL,
  FindingStatusBadge,
  RISK_BAND_RANK,
  RiskBandBadge,
} from "@/components/codekeeper/finding-ui";
import { useFindings, useRepositories } from "@/lib/api/hooks";
import type { FindingCategory, FindingListItem, FindingStatus, Severity } from "@/lib/schemas";
import { formatRelative } from "@/lib/domain/format";
import { FINDING_CATEGORY_LABEL } from "@/lib/domain/labels";

const ACTIVE = "open,task_created";
const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function FindingsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const statusParam = sp.get("status") ?? ACTIVE;
  const severity = sp.get("severity") ?? "";
  const category = sp.get("category") ?? "";
  const repo = sp.get("repo") ?? "";
  const findingId = sp.get("finding");
  const [search, setSearch] = useState("");

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const q = useFindings({
    status: statusParam === "all" ? undefined : statusParam,
    severity: severity || undefined,
    category: category || undefined,
    repositoryId: repo || undefined,
  });
  const repos = useRepositories();

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter(
      (f) =>
        !s ||
        [f.title, f.package, f.advisoryId, f.repositoryName].some((v) =>
          v?.toLowerCase().includes(s),
        ),
    );
  }, [q.data, search]);

  const filtered = statusParam !== ACTIVE || !!severity || !!category || !!repo || !!search;

  const columns: Column<FindingListItem>[] = [
    {
      id: "risk",
      header: "Risk",
      cell: (f) => <RiskBandBadge band={f.riskBand} />,
      sortValue: (f) => RISK_BAND_RANK[f.riskBand],
      className: "w-28",
    },
    {
      id: "title",
      header: "Finding",
      cell: (f) => (
        <button
          type="button"
          onClick={() => setParams({ finding: f.id })}
          className="flex max-w-md min-w-0 flex-col items-start gap-0.5 text-left"
        >
          <span className="line-clamp-2 font-medium hover:underline">{f.title}</span>
          <span className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
            <span>{FINDING_CATEGORY_LABEL[f.category]}</span>
            {f.advisoryId && <span className="font-mono">{f.advisoryId}</span>}
            {f.package && f.fixedVersion && (
              <span className="font-mono">
                {f.affectedVersion} → {f.fixedVersion}
              </span>
            )}
          </span>
        </button>
      ),
      sortValue: (f) => f.title,
    },
    {
      id: "severity",
      header: "Severity",
      cell: (f) => <SeverityBadge severity={f.severity} />,
      sortValue: (f) => SEV_RANK[f.severity],
      hideBelow: "md",
    },
    {
      id: "repo",
      header: "Repository",
      cell: (f) => (
        <Link href={`/app/repositories/${f.repositoryId}`} className="text-sm whitespace-nowrap hover:underline">
          {f.repositoryName}
        </Link>
      ),
      sortValue: (f) => f.repositoryName,
      hideBelow: "lg",
    },
    {
      id: "status",
      header: "Status",
      cell: (f) => (
        <span className="flex flex-col items-start gap-1">
          <FindingStatusBadge status={f.status} />
          {f.taskStatus && <TaskStatusBadge status={f.taskStatus} />}
        </span>
      ),
      sortValue: (f) => f.status,
    },
    {
      id: "detected",
      header: "Detected",
      cell: (f) => (
        <span className="text-muted-foreground text-xs">{formatRelative(f.detectedAt)}</span>
      ),
      sortValue: (f) => f.detectedAt,
      hideBelow: "xl",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Security findings"
        description="Advisories, outdated packages and maintenance checks found by CodeKeeper scans, ranked by risk band."
        meta={<MockDataBadge />}
      />

      <div className="bg-muted/40 text-muted-foreground flex gap-2 rounded-lg border px-3 py-2 text-xs">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Findings are deduplicated: one advisory on one package in one repository is a single
          finding, refreshed on every scan. It closes automatically when a rescan no longer sees it.
          Suppressions need a reason and always expire.
        </p>
      </div>

      <FilterBar>
        <div className="flex min-w-48 flex-1 flex-col gap-1 sm:max-w-64">
          <Label htmlFor="finding-search" className="text-muted-foreground text-xs font-normal">
            Search
          </Label>
          <div className="relative">
            <SearchIcon
              className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="finding-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, package or advisory"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <FilterSelect
          label="Status"
          allLabel="All statuses"
          value={statusParam === "all" ? "" : statusParam}
          onChange={(v) => setParams({ status: v === ACTIVE ? null : v || "all" })}
          options={[
            { value: ACTIVE, label: "Active (open + task created)" },
            ...(["open", "task_created", "suppressed", "resolved"] as FindingStatus[]).map((s) => ({
              value: s,
              label: FINDING_STATUS_LABEL[s],
            })),
          ]}
        />
        <FilterSelect
          label="Severity"
          allLabel="All severities"
          value={severity}
          onChange={(v) => setParams({ severity: v || null })}
          options={(["critical", "high", "medium", "low"] as Severity[]).map((s) => ({
            value: s,
            label: s[0].toUpperCase() + s.slice(1),
          }))}
        />
        <FilterSelect
          label="Category"
          allLabel="All categories"
          value={category}
          onChange={(v) => setParams({ category: v || null })}
          options={(Object.keys(FINDING_CATEGORY_LABEL) as FindingCategory[]).map((c) => ({
            value: c,
            label: FINDING_CATEGORY_LABEL[c],
          }))}
        />
        <FilterSelect
          label="Repository"
          allLabel="All repositories"
          value={repo}
          onChange={(v) => setParams({ repo: v || null })}
          options={(repos.data ?? []).map((r) => ({ value: r.id, label: r.fullName }))}
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setParams({ status: null, severity: null, category: null, repo: null });
            }}
          >
            <XIcon /> Reset
          </Button>
        )}
      </FilterBar>

      {q.isPending ? (
        <TableSkeleton rows={8} cols={5} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {rows.length} {rows.length === 1 ? "finding" : "findings"}
            {rows.length > 0 &&
              `, ${rows.filter((r) => r.riskBand === "urgent" || r.riskBand === "high").length} urgent or high risk`}
          </p>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(f) => f.id}
            rowHref={(f) => {
              const next = new URLSearchParams(sp.toString());
              next.set("finding", f.id);
              return `${pathname}?${next.toString()}`;
            }}
            caption="CodeKeeper findings, sorted by risk band"
            empty={
              <EmptyState
                icon={ShieldCheckIcon}
                title={filtered ? "No findings match these filters" : "No active findings"}
                description={
                  filtered
                    ? "Try another status or clear the filters."
                    : "Every repository is clear on its latest scan. Run a scan from Repository health to check again."
                }
                action={
                  filtered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (
                        setSearch(""),
                        setParams({ status: null, severity: null, category: null, repo: null })
                      )}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/app/codekeeper">Repository health</Link>
                    </Button>
                  )
                }
              />
            }
          />
        </>
      )}

      <FindingDetailSheet
        findingId={findingId}
        onClose={() => setParams({ finding: null })}
        onSelect={(id) => setParams({ finding: id })}
      />
    </div>
  );
}
