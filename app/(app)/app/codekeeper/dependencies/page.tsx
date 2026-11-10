"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  PackageIcon,
  PlugIcon,
  SearchIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { findingHref } from "@/components/codekeeper/finding-ui";
import { useDependencies, useFindings, useRepositories, type DependencyRow } from "@/lib/api/hooks";
import { formatNumber } from "@/lib/domain/format";

const SHOW = [
  { value: "outdated", label: "Outdated" },
  { value: "major", label: "Major version behind" },
  { value: "vulnerable", label: "Vulnerable" },
  { value: "direct", label: "Direct only" },
];

export default function DependenciesPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const repo = sp.get("repo") ?? "";
  const show = sp.get("show") ?? "";
  const [search, setSearch] = useState(() => sp.get("q") ?? "");

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  // One inventory query per repository scope; outdated/vulnerable/search filter client-side so counts stay stable.
  const q = useDependencies({ repositoryId: repo || undefined });
  const repos = useRepositories();
  const vulns = useFindings({ category: "vulnerability", status: "open,task_created,suppressed" });

  const findingByDep = useMemo(() => {
    const m = new Map<string, string>();
    (vulns.data ?? []).forEach(
      (f) => f.dependencyId && !m.has(f.dependencyId) && m.set(f.dependencyId, f.id),
    );
    return m;
  }, [vulns.data]);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all
      .filter((d) =>
        show === "outdated"
          ? d.outdated
          : show === "major"
            ? d.majorBehind
            : show === "vulnerable"
              ? d.vulnerable
              : show === "direct"
                ? d.direct
                : true,
      )
      .filter(
        (d) => !s || [d.name, d.license, d.manifest].some((v) => v.toLowerCase().includes(s)),
      );
  }, [all, show, search]);

  const counts = {
    total: all.length,
    direct: all.filter((d) => d.direct).length,
    outdated: all.filter((d) => d.outdated).length,
    major: all.filter((d) => d.majorBehind).length,
    vulnerable: all.filter((d) => d.vulnerable).length,
    repos: new Set(all.map((d) => d.repositoryId)).size,
  };
  const filtered = !!show || !!search || !!repo;

  const columns: Column<DependencyRow>[] = [
    {
      id: "name",
      header: "Package",
      cell: (d) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-medium">{d.name}</span>
          <span className="text-muted-foreground text-xs md:hidden">{d.repositoryName}</span>
        </span>
      ),
      sortValue: (d) => d.name,
    },
    {
      id: "ecosystem",
      header: "Ecosystem",
      cell: (d) => <Badge variant="outline">{d.ecosystem === "npm" ? "npm" : "PyPI"}</Badge>,
      sortValue: (d) => d.ecosystem,
      hideBelow: "lg",
    },
    {
      id: "version",
      header: "Installed → latest",
      cell: (d) => (
        <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span>{d.installedVersion}</span>
          {d.outdated ? (
            <>
              <ArrowRightIcon className="text-muted-foreground size-3" aria-label="latest" />
              <span className="text-muted-foreground">{d.latestVersion}</span>
              {d.majorBehind && (
                <Badge
                  variant="warning"
                  className="font-sans"
                  title="The installed major version is behind the latest. Upgrading may need code changes."
                >
                  Major behind
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="success" className="font-sans">
              Latest
            </Badge>
          )}
        </span>
      ),
      sortValue: (d) => (d.majorBehind ? 2 : d.outdated ? 1 : 0),
    },
    {
      id: "direct",
      header: "Type",
      cell: (d) => (
        <span className="text-xs">
          {d.direct ? "Direct" : <span className="text-muted-foreground">Transitive</span>}
        </span>
      ),
      sortValue: (d) => (d.direct ? 0 : 1),
      hideBelow: "md",
    },
    {
      id: "license",
      header: "License",
      cell: (d) => <span className="font-mono text-xs">{d.license}</span>,
      sortValue: (d) => d.license,
      hideBelow: "xl",
    },
    {
      id: "manifest",
      header: "Manifest",
      cell: (d) => <span className="text-muted-foreground font-mono text-xs">{d.manifest}</span>,
      sortValue: (d) => d.manifest,
      hideBelow: "xl",
    },
    {
      id: "repo",
      header: "Repository",
      cell: (d) => (
        <Link
          href={`/app/repositories/${d.repositoryId}`}
          className="text-sm whitespace-nowrap hover:underline"
        >
          {d.repositoryName}
        </Link>
      ),
      sortValue: (d) => d.repositoryName,
      hideBelow: "md",
    },
    {
      id: "vuln",
      header: "Advisories",
      cell: (d) => {
        if (!d.vulnerable) return <span className="text-muted-foreground text-xs">None known</span>;
        const fid = findingByDep.get(d.id);
        const badge = (
          <Badge variant="danger">
            <ShieldAlertIcon aria-hidden /> Vulnerable
          </Badge>
        );
        return fid ? (
          <Link
            href={findingHref(fid)}
            className="rounded-md hover:opacity-80"
            aria-label={`Vulnerable: open the finding for ${d.name}`}
          >
            {badge}
          </Link>
        ) : (
          badge
        );
      },
      sortValue: (d) => (d.vulnerable ? 0 : 1),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dependencies"
        description="Every package CodeKeeper found in your manifests and lockfiles, with installed and latest versions and known advisories."
        meta={<MockDataBadge />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {q.isPending ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Packages"
              value={formatNumber(counts.total)}
              icon={PackageIcon}
              hint={`${counts.direct} direct · ${counts.total - counts.direct} transitive · ${counts.repos} ${counts.repos === 1 ? "repo" : "repos"}`}
            />
            <KpiCard
              label="Outdated"
              value={formatNumber(counts.outdated)}
              hint={
                counts.total
                  ? `${Math.round((counts.outdated / counts.total) * 100)}% of packages`
                  : undefined
              }
              tone={counts.outdated ? "warning" : undefined}
            />
            <KpiCard
              label="Major version behind"
              value={formatNumber(counts.major)}
              hint="May need code changes to upgrade"
              tone={counts.major ? "warning" : undefined}
            />
            <KpiCard
              label="Vulnerable"
              value={formatNumber(counts.vulnerable)}
              icon={ShieldAlertIcon}
              hint={
                <Link
                  href="/app/codekeeper/findings?category=vulnerability"
                  className="hover:underline"
                >
                  View advisories
                </Link>
              }
              tone={counts.vulnerable ? "danger" : undefined}
            />
          </>
        )}
      </div>

      <FilterBar>
        <div className="flex min-w-48 flex-1 flex-col gap-1 sm:max-w-64">
          <Label htmlFor="dep-search" className="text-muted-foreground text-xs font-normal">
            Search
          </Label>
          <div className="relative">
            <SearchIcon
              className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="dep-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setParams({ q: e.target.value || null });
              }}
              placeholder="Package, license or manifest"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <FilterSelect
          label="Repository"
          allLabel="All repositories"
          value={repo}
          onChange={(v) => setParams({ repo: v || null })}
          options={(repos.data ?? []).map((r) => ({ value: r.id, label: r.fullName }))}
        />
        <FilterSelect
          label="Show"
          allLabel="All packages"
          value={show}
          onChange={(v) => setParams({ show: v || null })}
          options={SHOW}
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setParams({ repo: null, show: null, q: null });
            }}
          >
            <XIcon /> Reset
          </Button>
        )}
      </FilterBar>

      {q.isPending ? (
        <TableSkeleton rows={10} cols={6} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : all.length === 0 && !repo ? (
        <EmptyState
          icon={PlugIcon}
          title="No dependencies inventoried yet"
          description="CodeKeeper reads package.json, lockfiles, requirements.txt and pyproject.toml. Connect a repository or run a scan."
          action={
            <Button asChild size="sm">
              <Link href="/app/codekeeper">Go to repository health</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            Showing {rows.length} of {all.length} packages
          </p>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(d) => d.id}
            pageSize={30}
            initialSort={{ id: "vuln", dir: "asc" }}
            caption="Dependency inventory"
            empty={
              <EmptyState
                title="No packages match"
                description="Try a different filter or search."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setParams({ repo: null, show: null, q: null });
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            }
          />
        </>
      )}
    </div>
  );
}
