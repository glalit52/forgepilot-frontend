"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpenIcon,
  CalendarClockIcon,
  ExternalLinkIcon,
  FileCode2Icon,
  FlaskConicalIcon,
  GitBranchIcon,
  LockIcon,
  PackageIcon,
  PlusIcon,
  RadarIcon,
  WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRepository, useRunScan, useSession } from "@/lib/api/hooks";
import type { RepositoryDetail } from "@/lib/schemas";
import { can } from "@/lib/domain/permissions";
import { formatNumber } from "@/lib/domain/format";
import { useAppUI } from "@/components/app/app-ui";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthBreakdown } from "@/components/shared/health-breakdown";
import { HealthScore } from "@/components/shared/health-score";
import { CommitSha, CopyButton } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState } from "@/components/shared/states";
import { RunStatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { HealthHistoryChart } from "@/components/workspace/charts";
import { GatedButton } from "@/components/workspace/gated-button";
import {
  FindingList,
  IndexStatusBadge,
  PullRequestTable,
  RunList,
} from "@/components/workspace/lists";
import { RelativeTime } from "@/components/workspace/relative-time";
import { ScanProgress, ScanResult, useScanWatcher } from "@/components/workspace/scan-panel";

const SCHEDULE_LABEL = {
  daily: "Daily",
  weekly: "Weekly",
  on_push: "On every push",
  off: "Off",
} as const;

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" aria-hidden /> {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Intelligence({ d }: { d: RepositoryDetail }) {
  const r = d.repository;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository intelligence</CardTitle>
        <p className="text-muted-foreground text-xs">
          Discovered when the repository was indexed. Agents and ShipSafe use this context.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Fact icon={FlaskConicalIcon} label="Test commands">
            {r.testCommands.length ? (
              <ul className="flex flex-col gap-1">
                {r.testCommands.map((c) => (
                  <li
                    key={c}
                    className="bg-muted flex items-center justify-between gap-2 rounded-md py-0.5 pr-0.5 pl-2"
                  >
                    <code className="truncate font-mono text-xs">{c}</code>
                    <CopyButton value={c} label={`Copy ${c}`} className="size-7" />
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">None discovered</span>
            )}
          </Fact>
          <Fact icon={WorkflowIcon} label="CI workflows">
            {r.ciWorkflows.length ? (
              <span className="flex flex-wrap gap-1">
                {r.ciWorkflows.map((w) => (
                  <Badge key={w} variant="outline" className="font-mono">
                    .github/workflows/{w}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">None found</span>
            )}
          </Fact>
          <Fact icon={PackageIcon} label="Ecosystems">
            <span className="flex flex-wrap items-center gap-1">
              {r.ecosystems.map((e) => (
                <Badge key={e} variant="secondary">
                  {e}
                </Badge>
              ))}
              <Link
                href={`/app/codekeeper/dependencies?repositoryId=${r.id}`}
                className="text-muted-foreground hover:text-foreground ml-1 text-xs hover:underline"
              >
                {d.dependencies} dependencies
              </Link>
            </span>
          </Fact>
          <Fact icon={FileCode2Icon} label="Files indexed">
            <span className="tabular-nums">{formatNumber(r.fileCount)}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {r.hasDocs ? (
                <span className="inline-flex items-center gap-1">
                  <BookOpenIcon className="size-3" aria-hidden /> Docs found
                </span>
              ) : (
                "No docs folder"
              )}
            </span>
          </Fact>
        </dl>
      </CardContent>
    </Card>
  );
}

export default function RepositoryPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const repo = useRepository(repositoryId);
  const session = useSession();
  const runScan = useRunScan();
  const { openNewTask } = useAppUI();
  const watcher = useScanWatcher(repo.data?.scans);
  useBreadcrumbLabel(repositoryId, repo.data?.repository.fullName);
  const role = session.data?.role;
  const scanBlocked =
    role && !can(role, "test.run") ? "Viewers can't start scans. Ask for the Member role." : null;
  const taskBlocked = role && !can(role, "task.create") ? "Viewers can't create tasks." : null;

  return (
    <QueryState query={repo}>
      {(d) => {
        const r = d.repository;
        const running = d.scans.find((s) => s.status === "running" || s.status === "queued");
        const lastScan = d.scans.find((s) => s.status === "completed");
        const openFindings = d.findings.filter(
          (f) => f.status === "open" || f.status === "task_created",
        );
        const history = d.history.slice(-12);
        const first = history[0]?.score;
        const last = history[history.length - 1]?.score;
        return (
          <div className="flex flex-col gap-6">
            <PageHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {r.fullName}
                  {r.private && (
                    <Badge variant="outline" className="font-normal">
                      <LockIcon aria-hidden /> Private
                    </Badge>
                  )}
                </span>
              }
              description={
                <span className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/app/projects/${r.projectId}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {r.projectName}
                  </Link>
                  <span aria-hidden>·</span>
                  {[...r.languages, ...r.frameworks].map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </span>
              }
              meta={
                <>
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    <GitBranchIcon className="size-3.5" aria-hidden />
                    <span className="font-mono">{r.defaultBranch}</span>
                  </span>
                  <IndexStatusBadge status={r.indexStatus} />
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    indexed at <CommitSha sha={r.indexedSha} /> · <RelativeTime iso={r.indexedAt} />
                  </span>
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    <CalendarClockIcon className="size-3.5" aria-hidden /> Scans:{" "}
                    {SCHEDULE_LABEL[r.scanSchedule]}
                  </span>
                </>
              }
              actions={
                <>
                  <Button variant="outline" asChild>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon /> Open in GitHub
                    </a>
                  </Button>
                  <GatedButton
                    variant="outline"
                    disabledReason={taskBlocked}
                    onClick={() => openNewTask({ repositoryId: r.id })}
                  >
                    <PlusIcon /> New task
                  </GatedButton>
                  <GatedButton
                    disabledReason={
                      scanBlocked ??
                      (r.indexStatus !== "ready" ? "Wait for indexing to finish." : null)
                    }
                    disabled={!!running || runScan.isPending}
                    onClick={() =>
                      runScan.mutate(r.id, {
                        onSuccess: (s) => {
                          watcher.watch(s.id);
                          toast.success("Scan started", {
                            description: `CodeKeeper is scanning ${r.fullName} at ${s.commitSha.slice(0, 7)}.`,
                          });
                        },
                        onError: (e) =>
                          toast.error("Couldn't start the scan", { description: e.message }),
                      })
                    }
                  >
                    <RadarIcon className={running ? "animate-pulse" : undefined} />
                    {running ? "Scanning…" : "Run scan"}
                  </GatedButton>
                </>
              }
            />

            {r.indexStatus === "indexing" && (
              <div
                className="flex flex-col gap-2 rounded-lg border p-4"
                role="status"
                aria-live="polite"
              >
                <span className="text-sm font-medium">
                  Indexing… reading the repository so agents and checks have context.
                </span>
                <Progress
                  value={undefined}
                  className="animate-pulse"
                  aria-label="Indexing in progress"
                />
              </div>
            )}
            {r.indexStatus === "error" && (
              <p
                role="alert"
                className="bg-danger-soft text-danger-foreground rounded-lg p-4 text-sm"
              >
                Indexing failed. Check the GitHub App still has access to this repository, then
                reconnect it.
              </p>
            )}
            {running && <ScanProgress scan={running} />}
            {!running && watcher.finished && (
              <ScanResult scan={watcher.finished} onDismiss={watcher.dismiss} />
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Repository health</CardTitle>
                  {lastScan && (
                    <span className="text-muted-foreground text-xs">
                      Last scan <RelativeTime iso={lastScan.finishedAt ?? lastScan.startedAt} />
                    </span>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <HealthScore score={r.health.score} delta={r.healthDelta} size={72} showLabel />
                  <HealthBreakdown health={r.health} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Health over 12 weeks</CardTitle>
                  {history.length > 1 && (
                    <p className="text-muted-foreground text-xs">
                      From {first} to {last} ({last - first >= 0 ? "+" : ""}
                      {last - first} points). Dashed line marks the healthy threshold (80).
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {history.length > 1 ? (
                    <HealthHistoryChart
                      data={history}
                      label={`Weekly health score for ${r.fullName}: ${history.map((h) => h.score).join(", ")}`}
                    />
                  ) : (
                    <EmptyState
                      title="Not enough history yet"
                      description="Health history builds up after a couple of weekly scans."
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Intelligence d={d} />

            <Tabs defaultValue="findings">
              <TabsList>
                <TabsTrigger value="findings">
                  Findings{" "}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {openFindings.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="suites">
                  Test suites{" "}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {d.suites.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="runs">
                  Runs{" "}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {d.runs.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="prs">
                  Pull requests{" "}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {d.pullRequests.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="scans">Scans</TabsTrigger>
              </TabsList>
              <TabsContent value="findings">
                <FindingList findings={openFindings} limit={50} />
              </TabsContent>
              <TabsContent value="suites">
                {d.suites.length ? (
                  <ul className="divide-y rounded-lg border">
                    {d.suites.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
                      >
                        <span className="min-w-40 font-medium">{s.name}</span>
                        <Badge variant="outline">
                          {s.type === "playwright"
                            ? "Playwright e2e"
                            : s.type === "api"
                              ? "API"
                              : "Unit"}
                        </Badge>
                        {s.required ? (
                          <ToneBadge tone="info">Required</ToneBadge>
                        ) : (
                          <ToneBadge tone="neutral">Optional</ToneBadge>
                        )}
                        {!s.enabled && <ToneBadge tone="neutral">Disabled</ToneBadge>}
                        <code className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
                          {s.command}
                        </code>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {s.testCount} tests
                        </span>
                        <span
                          className={
                            s.flakyRatePct >= 2
                              ? "text-warning-foreground text-xs tabular-nums"
                              : "text-muted-foreground text-xs tabular-nums"
                          }
                        >
                          {s.flakyRatePct}% flaky
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={FlaskConicalIcon}
                    title="No test suites"
                    description="Add a suite so ShipSafe knows what to run on each pull request."
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link href="/app/shipsafe/suites">Manage suites</Link>
                      </Button>
                    }
                  />
                )}
              </TabsContent>
              <TabsContent value="runs">
                <RunList runs={d.runs} limit={15} />
              </TabsContent>
              <TabsContent value="prs">
                <PullRequestTable rows={d.pullRequests} hideRepo pageSize={15} />
              </TabsContent>
              <TabsContent value="scans">
                {d.scans.length ? (
                  <ul className="divide-y rounded-lg border">
                    {d.scans.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
                      >
                        {s.status === "running" || s.status === "queued" ? (
                          <RunStatusBadge status="running" />
                        ) : s.status === "failed" ? (
                          <ToneBadge tone="danger">Failed</ToneBadge>
                        ) : (
                          <ToneBadge tone="success">Completed</ToneBadge>
                        )}
                        <span className="text-muted-foreground text-xs capitalize">
                          {s.trigger}
                        </span>
                        <CommitSha sha={s.commitSha} />
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {s.changes.length ? (
                            s.changes.join(" · ")
                          ) : (
                            <span className="text-muted-foreground">No changes</span>
                          )}
                        </span>
                        {s.scoreAfter !== null && (
                          <span className="text-xs tabular-nums">
                            {s.scoreAfter}
                            {s.scoreDelta ? (
                              <span
                                className={
                                  s.scoreDelta > 0
                                    ? "text-success-foreground ml-1"
                                    : "text-danger-foreground ml-1"
                                }
                              >
                                ({s.scoreDelta > 0 ? "+" : ""}
                                {s.scoreDelta})
                              </span>
                            ) : null}
                          </span>
                        )}
                        <RelativeTime iso={s.startedAt} className="text-muted-foreground text-xs" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={RadarIcon}
                    title="No scans yet"
                    description="Run a scan to see dependency, security and build health."
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        );
      }}
    </QueryState>
  );
}
