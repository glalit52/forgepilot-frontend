"use client";
import { useMemo } from "react";
import Link from "next/link";
import { FolderGit2Icon, LoaderCircleIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/shared/data-table";
import { DataTable, FilterBar } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { HealthPill } from "@/components/shared/health-score";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { CoverageBar, FlakyBadge } from "@/components/console/repo-badges";
import { useNow } from "@/components/console/use-now";
import { useUrlFilters } from "@/components/console/use-url-filters";
import { useClients, useRepositories } from "@/lib/api/hooks";
import { LanguageSchema, type RepositorySummary } from "@/lib/schemas";
import { LANGUAGE_LABEL } from "@/lib/domain/labels";
import { formatDateTime, formatRelative } from "@/lib/domain/format";

const KEYS = ["client", "language", "app"] as const;

function columns(now: number): Column<RepositorySummary>[] {
  return [
    {
      id: "name",
      header: "Repository",
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/console/repositories/${r.id}`}
            className="font-mono text-sm font-medium hover:underline"
          >
            {r.name}
          </Link>
          <span className="text-muted-foreground text-xs">
            {r.organizationName} · {r.applicationName}
          </span>
        </div>
      ),
    },
    {
      id: "lang",
      header: "Language",
      sortValue: (r) => r.language,
      cell: (r) => <Badge variant="outline">{LANGUAGE_LABEL[r.language] ?? r.language}</Badge>,
      hideBelow: "md",
    },
    {
      id: "health",
      header: "Health",
      align: "right",
      sortValue: (r) => r.health.score,
      cell: (r) => <HealthPill score={r.health.score} />,
    },
    {
      id: "coverage",
      header: "Coverage",
      sortValue: (r) => r.coveragePct,
      cell: (r) => <CoverageBar pct={r.coveragePct} />,
      hideBelow: "lg",
    },
    {
      id: "flaky",
      header: "Flaky tests",
      sortValue: (r) => r.flakyTests,
      cell: (r) => <FlakyBadge count={r.flakyTests} />,
    },
    {
      id: "findings",
      header: "Findings",
      align: "right",
      sortValue: (r) => r.criticalFindings * 1000 + r.openFindings,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.openFindings} open
          {r.criticalFindings > 0 && <Badge variant="danger">{r.criticalFindings} critical</Badge>}
        </span>
      ),
    },
    {
      id: "scan",
      header: "Last scan",
      sortValue: (r) => r.lastScanAt,
      hideBelow: "lg",
      cell: (r) =>
        r.scanRunning ? (
          <span className="text-primary inline-flex items-center gap-1 text-xs">
            <LoaderCircleIcon className="size-3 animate-spin" aria-hidden /> Scanning…
          </span>
        ) : (
          <time
            dateTime={r.lastScanAt}
            title={formatDateTime(r.lastScanAt)}
            className="text-muted-foreground text-xs"
          >
            {formatRelative(r.lastScanAt, now)}
          </time>
        ),
    },
  ];
}

/** Repositories across all clients (C-05 list). */
export default function RepositoriesPage() {
  const { values, set, clear, active } = useUrlFilters(KEYS);
  const clients = useClients();
  const repos = useRepositories(values.client ? { orgId: values.client } : {});
  const now = useNow();
  const rows = useMemo(
    () =>
      (repos.data ?? []).filter(
        (r) =>
          (!values.language || r.language === values.language) &&
          (!values.app || r.applicationId === values.app),
      ),
    [repos.data, values.language, values.app],
  );
  const appName = values.app
    ? repos.data?.find((r) => r.applicationId === values.app)?.applicationName
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Repositories"
        description="Health, coverage, flaky tests and open findings for every repository we maintain."
        meta={<MockDataBadge />}
      />
      <FilterBar>
        <FilterSelect
          label="Client"
          value={values.client}
          onChange={(v) => set("client", v)}
          options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          label="Language"
          value={values.language}
          onChange={(v) => set("language", v)}
          options={LanguageSchema.options.map((l) => ({ value: l, label: LANGUAGE_LABEL[l] ?? l }))}
        />
        {values.app && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => set("app", "")}
            aria-label={`Remove application filter ${appName ?? ""}`}
          >
            App: {appName ?? values.app} <XIcon />
          </Button>
        )}
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <XIcon /> Clear filters
          </Button>
        )}
      </FilterBar>
      {repos.isPending ? (
        <TableSkeleton rows={8} cols={6} />
      ) : repos.error ? (
        <ErrorState error={repos.error} onRetry={() => repos.refetch()} />
      ) : (
        <DataTable
          caption="Repositories"
          rows={rows}
          columns={columns(now)}
          getRowId={(r) => r.id}
          rowHref={(r) => `/console/repositories/${r.id}`}
          initialSort={{ id: "health", dir: "asc" }}
          empty={
            <EmptyState
              icon={FolderGit2Icon}
              title={active > 0 ? "No repositories match these filters" : "No repositories yet"}
              description={
                active > 0
                  ? "Try removing a filter."
                  : "Repositories are connected by the client during onboarding."
              }
              action={
                active > 0 ? (
                  <Button variant="outline" onClick={clear}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </div>
  );
}
