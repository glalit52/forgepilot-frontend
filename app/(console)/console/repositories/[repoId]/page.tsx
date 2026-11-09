"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLinkIcon,
  FolderGit2Icon,
  LoaderCircleIcon,
  PlusIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Column } from "@/components/shared/data-table";
import { DataTable } from "@/components/shared/data-table";
import { HealthBreakdown } from "@/components/shared/health-breakdown";
import { HealthScore } from "@/components/shared/health-score";
import { MockDataBadge, SeverityBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { ToneBadge } from "@/components/shared/status-badge";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { useConsoleUI } from "@/components/console/console-ui";
import { CoverageBar, FailureRateBadge } from "@/components/console/repo-badges";
import { taskColumns } from "@/components/console/task-columns";
import { useNow } from "@/components/console/use-now";
import { useRepository, useRunScan } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { Finding, Scan } from "@/lib/schemas";
import { HEALTH_DIMENSION_LABEL, LANGUAGE_LABEL } from "@/lib/domain/labels";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const FINDING_STATUS = {
  open: { label: "Open", tone: "warning" },
  in_progress: { label: "In progress", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
} as const;

function scanColumns(): Column<Scan>[] {
  return [
    {
      id: "started",
      header: "Started",
      sortValue: (s) => s.startedAt,
      cell: (s) => <span className="text-sm">{formatDateTime(s.startedAt)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (s) =>
        s.status === "running" ? (
          <ToneBadge tone="accent" pulse>
            Running
          </ToneBadge>
        ) : s.status === "completed" ? (
          <ToneBadge tone="success">Completed</ToneBadge>
        ) : (
          <ToneBadge tone="danger">Failed</ToneBadge>
        ),
    },
    {
      id: "trigger",
      header: "Trigger",
      cell: (s) => <span className="text-muted-foreground text-xs capitalize">{s.trigger}</span>,
    },
    {
      id: "duration",
      header: "Duration",
      align: "right",
      cell: (s) =>
        s.finishedAt
          ? formatDuration((Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000)
          : "—",
      hideBelow: "md",
    },
    { id: "score", header: "Health", align: "right", cell: (s) => s.healthScore ?? "—" },
    { id: "findings", header: "Findings", align: "right", cell: (s) => s.findingsCount ?? "—" },
  ];
}

/** C-05 / FE-16 Repository detail with "Run scan". */
export default function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const q = useRepository(repoId);
  const scan = useRunScan(repoId);
  const { openNewTask } = useConsoleUI();
  const running = !!q.data?.repository.scanRunning;
  const now = useNow(running ? 500 : 30_000);
  useBreadcrumbLabel(repoId, q.data?.repository.name);

  // Toast once when a scan we were watching completes.
  const wasRunning = useRef<boolean | null>(null);
  const latestScore = q.data?.repository.health.score;
  const openCount = q.data?.findings.filter((f) => f.status !== "resolved").length;
  useEffect(() => {
    if (q.data === undefined) return;
    if (wasRunning.current && !running) {
      toast.success("Scan complete", {
        description: `Health score ${latestScore} · ${openCount} open findings.`,
      });
    }
    wasRunning.current = running;
  }, [running, latestScore, openCount, q.data]);

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !q.data) {
    if (q.error instanceof ApiError && q.error.status === 404)
      return (
        <EmptyState
          icon={FolderGit2Icon}
          title="Repository not found"
          action={
            <Button asChild variant="outline">
              <Link href="/console/repositories">All repositories</Link>
            </Button>
          }
        />
      );
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }

  const { repository: repo, findings, scans, tasks, flakyTests } = q.data;
  const runningScan = scans.find((s) => s.status === "running");
  const completed = scans.filter((s) => s.status === "completed" && s.healthScore !== null);
  const delta =
    completed.length > 1 ? completed[0].healthScore! - completed[1].healthScore! : undefined;
  const scanPct = runningScan
    ? runningScan.simulatedEndsAt
      ? Math.min(
          99,
          Math.max(
            3,
            Math.round(
              ((now - Date.parse(runningScan.startedAt)) /
                (runningScan.simulatedEndsAt - Date.parse(runningScan.startedAt))) *
                100,
            ),
          ),
        )
      : 50
    : 0;

  const sortedFindings = [...findings].sort(
    (a, b) =>
      Number(a.status === "resolved") - Number(b.status === "resolved") ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
  const findingColumns: Column<Finding>[] = [
    {
      id: "severity",
      header: "Severity",
      sortValue: (f) => SEVERITY_RANK[f.severity],
      cell: (f) => <SeverityBadge severity={f.severity} />,
    },
    {
      id: "title",
      header: "Finding",
      sortValue: (f) => f.title,
      className: "max-w-[28rem]",
      cell: (f) => (
        <div className="flex flex-col gap-0.5 whitespace-normal">
          <span className="font-medium">{f.title}</span>
          <span className="text-muted-foreground text-xs">{f.recommendation}</span>
        </div>
      ),
    },
    {
      id: "dim",
      header: "Dimension",
      sortValue: (f) => f.dimension,
      cell: (f) => <span className="text-sm">{HEALTH_DIMENSION_LABEL[f.dimension]}</span>,
      hideBelow: "lg",
    },
    {
      id: "status",
      header: "Status",
      sortValue: (f) => f.status,
      cell: (f) => (
        <ToneBadge tone={FINDING_STATUS[f.status].tone}>{FINDING_STATUS[f.status].label}</ToneBadge>
      ),
    },
    {
      id: "detected",
      header: "Detected",
      sortValue: (f) => f.detectedAt,
      hideBelow: "xl",
      cell: (f) => (
        <span className="text-muted-foreground text-xs">{formatRelative(f.detectedAt, now)}</span>
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (f) =>
        f.status === "resolved" ? null : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNewTask({ orgId: repo.organizationId, repositoryId: repo.id })}
            aria-label={`Create task for finding: ${f.title}`}
          >
            <PlusIcon /> Create task
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={<span className="font-mono">{repo.name}</span>}
        description={
          <>
            <Link
              href={`/console/clients/${repo.organizationId}`}
              className="text-foreground font-medium hover:underline"
            >
              {repo.organizationName}
            </Link>{" "}
            · {repo.applicationName} · {LANGUAGE_LABEL[repo.language] ?? repo.language} · branch{" "}
            {repo.defaultBranch}
          </>
        }
        meta={
          <>
            <Badge variant="outline" className="capitalize">
              {repo.provider.replace("_", " ")}
            </Badge>
            <span className="text-muted-foreground text-xs">
              Last scan {formatRelative(repo.lastScanAt, now)}
            </span>
            <MockDataBadge />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <a href={repo.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon /> Open repository
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button
              onClick={() =>
                scan.mutate(undefined, {
                  onSuccess: () =>
                    toast.info("Scan started", {
                      description:
                        "Dependencies, security, build, tests and docs are being checked.",
                    }),
                  onError: (e) =>
                    toast.error("Couldn't start the scan", {
                      description: e instanceof Error ? e.message : String(e),
                    }),
                })
              }
              disabled={running || scan.isPending}
            >
              {running ? <LoaderCircleIcon className="animate-spin" /> : <ScanSearchIcon />}
              {running ? "Scanning…" : "Run scan"}
            </Button>
          </>
        }
      />

      {running && (
        <Card
          className="border-primary/30 flex flex-col gap-2 p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <LoaderCircleIcon className="text-primary size-4 animate-spin" aria-hidden />
              Health scan in progress
            </span>
            <span className="text-muted-foreground tabular-nums">{scanPct}%</span>
          </div>
          <Progress value={scanPct} aria-label="Scan progress" />
          <p className="text-muted-foreground text-xs">
            Results below update automatically when the scan finishes.
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Health score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <HealthScore score={repo.health.score} delta={delta} size={72} showLabel />
            </div>
            <HealthBreakdown health={repo.health} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-xs">Line coverage</span>
                <span className="text-2xl font-semibold tabular-nums">{repo.coveragePct}%</span>
              </div>
              <Progress
                value={repo.coveragePct}
                aria-label={`Coverage ${repo.coveragePct}%`}
                indicatorClassName={
                  repo.coveragePct >= 80
                    ? "bg-success"
                    : repo.coveragePct >= 60
                      ? "bg-warning"
                      : "bg-danger"
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs">
                Flaky tests ({flakyTests.length})
              </span>
              {flakyTests.length === 0 ? (
                <p className="text-success-foreground flex items-center gap-1.5 text-sm">
                  <ShieldCheckIcon className="size-4" aria-hidden /> No flaky tests detected
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {flakyTests.map((t) => (
                    <li key={t.name} className="flex flex-col gap-1 rounded-md border px-2.5 py-2">
                      <span className="font-mono text-xs break-all">{t.name}</span>
                      <span className="flex items-center justify-between gap-2">
                        <FailureRateBadge pct={t.failureRatePct} />
                        <span className="text-muted-foreground text-xs">
                          seen {formatRelative(t.lastSeen, now)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Open findings</dt>
                <dd className="text-xl font-semibold tabular-nums">{repo.openFindings}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Critical</dt>
                <dd
                  className={`text-xl font-semibold tabular-nums ${repo.criticalFindings > 0 ? "text-danger-foreground" : ""}`}
                >
                  {repo.criticalFindings}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Coverage</dt>
                <dd>
                  <CoverageBar pct={repo.coveragePct} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Scans on record</dt>
                <dd className="tabular-nums">{scans.length}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs">Tasks on this repo</dt>
                <dd className="tabular-nums">
                  {tasks.length} total ·{" "}
                  {tasks.filter((t) => !["merged", "closed"].includes(t.state)).length} open
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Section
        title="Findings"
        description="From the latest scan. Turn any open finding into a task for an agent."
      >
        <DataTable
          caption={`Findings for ${repo.name}`}
          rows={sortedFindings}
          columns={findingColumns}
          getRowId={(f) => f.id}
          empty={
            <EmptyState
              icon={ShieldCheckIcon}
              title="No findings"
              description="The latest scan found nothing to fix."
            />
          }
        />
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Recent scans">
          <DataTable
            caption={`Scans for ${repo.name}`}
            rows={scans}
            columns={scanColumns()}
            getRowId={(s) => s.id}
            pageSize={8}
            empty={
              <EmptyState
                icon={ScanSearchIcon}
                title="No scans yet"
                description="Run the first scan to compute a health score."
              />
            }
          />
        </Section>
        <Section title="Tasks">
          <DataTable
            caption={`Tasks for ${repo.name}`}
            rows={tasks}
            columns={taskColumns({ client: false, assignee: false })}
            getRowId={(t) => t.id}
            rowHref={(t) => `/console/tasks/${t.id}`}
            pageSize={8}
            empty={
              <EmptyState
                title="No tasks on this repository"
                action={
                  <Button
                    variant="outline"
                    onClick={() =>
                      openNewTask({ orgId: repo.organizationId, repositoryId: repo.id })
                    }
                  >
                    <PlusIcon /> New task
                  </Button>
                }
              />
            }
          />
        </Section>
      </div>
    </div>
  );
}
