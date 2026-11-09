"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ExternalLinkIcon,
  FileCode2Icon,
  GitBranchIcon,
  ListChecksIcon,
  RadarIcon,
  TerminalSquareIcon,
} from "lucide-react";
import { usePullRequest, usePullRequestDiff, useSession } from "@/lib/api/hooks";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorChip } from "@/components/shared/actor-chip";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { CommitSha, MockDataBadge } from "@/components/shared/misc";
import { FailureList, RunSummary } from "@/components/shared/run-summary";
import { EmptyState, ErrorState, QueryState } from "@/components/shared/states";
import { SessionStatusBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { PrStateIcon, ReviewStateBadge, RunList } from "@/components/workspace/lists";
import {
  BugsSection,
  MergeBanner,
  MergePanel,
  ReleasePolicy,
  ReviewPanel,
} from "@/components/workspace/pr-detail";
import { RelativeTime } from "@/components/workspace/relative-time";

function ChangedFiles({ prId }: { prId: string }) {
  const diff = usePullRequestDiff(prId);
  if (diff.isPending) return <Skeleton className="h-64 w-full" />;
  if (diff.error || !diff.data)
    return <ErrorState error={diff.error} onRetry={() => diff.refetch()} />;
  return <DiffViewer files={diff.data} />;
}

export default function PullRequestPage() {
  const { prId } = useParams<{ prId: string }>();
  const pr = usePullRequest(prId);
  const session = useSession();
  const role = session.data?.role;
  useBreadcrumbLabel(prId, pr.data ? `#${pr.data.pullRequest.number}` : undefined);

  return (
    <QueryState query={pr}>
      {(d) => {
        const p = d.pullRequest;
        const latest = p.latestRun;
        const failing = d.latestResults.filter(
          (r) => r.outcome === "failed" || r.outcome === "flaky",
        );
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="flex items-start gap-2 text-xl font-semibold tracking-tight">
                  <PrStateIcon status={p.status} className="mt-1.5 size-5" />
                  <span>
                    {p.title}{" "}
                    <span className="text-muted-foreground font-normal tabular-nums">
                      #{p.number}
                    </span>
                  </span>
                </h1>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <ActorChip actor={p.authorResolved} />
                  <Link
                    href={`/app/repositories/${p.repositoryId}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {p.repositoryName}
                  </Link>
                  <span className="inline-flex items-center gap-1">
                    <GitBranchIcon className="size-3.5" aria-hidden />
                    <span className="font-mono">{p.branch}</span> →{" "}
                    <span className="font-mono">{d.repository.defaultBranch}</span>
                  </span>
                  <span>
                    head <CommitSha sha={p.headSha} />
                  </span>
                  <span className="tabular-nums">
                    <span className="text-success-foreground">+{p.additions}</span>{" "}
                    <span className="text-danger-foreground">−{p.deletions}</span> ·{" "}
                    {p.changedFiles} files
                  </span>
                  <span>
                    opened <RelativeTime iso={p.openedAt} />
                  </span>
                  <AiCodeFlag pct={p.aiAuthoredPct} />
                  <ReviewStateBadge pr={p} />
                  <MockDataBadge />
                </div>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <a href={p.url} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon /> Open in GitHub
                </a>
              </Button>
            </div>

            <MergeBanner d={d} />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
              <div className="flex min-w-0 flex-col gap-4">
                <ReleasePolicy checks={d.releasePolicy} />

                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <RadarIcon className="size-4" aria-hidden /> Latest ShipSafe run
                    </CardTitle>
                    {latest && (
                      <Link
                        href={`/app/shipsafe/runs/${latest.id}`}
                        className="text-muted-foreground hover:text-foreground text-xs hover:underline"
                      >
                        Run details and evidence →
                      </Link>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {latest ? (
                      <>
                        <RunSummary run={latest} />
                        {failing.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <h3 className="text-sm font-medium">Failing and flaky results</h3>
                            <FailureList results={failing} />
                          </div>
                        ) : (
                          latest.status === "passed" && (
                            <p className="text-success-foreground text-sm">
                              Every selected test passed on this commit.
                            </p>
                          )
                        )}
                      </>
                    ) : (
                      <EmptyState
                        icon={RadarIcon}
                        title="Not verified yet"
                        description="ShipSafe starts a run as soon as GitHub tells us about this PR."
                      />
                    )}
                  </CardContent>
                </Card>

                <BugsSection d={d} role={role} />

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecksIcon className="size-4" aria-hidden /> Run history
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                      Each new commit is verified as a separate, comparable run.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <RunList runs={d.runs} limit={20} />
                  </CardContent>
                </Card>
              </div>

              <aside className="flex min-w-0 flex-col gap-4" aria-label="Review and merge">
                <ReviewPanel d={d} role={role} />
                <MergePanel d={d} role={role} />
                <Card>
                  <CardHeader>
                    <CardTitle>Linked work</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 text-sm">
                    {d.task ? (
                      <Link
                        href={`/app/devpilot/tasks/${d.task.id}`}
                        className="hover:bg-muted/50 flex flex-col gap-1 rounded-md border p-3"
                      >
                        <span className="text-muted-foreground text-xs">DevPilot task</span>
                        <span className="font-medium">{d.task.title}</span>
                        <TaskStatusBadge status={d.task.status} />
                      </Link>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No linked task — this PR was opened directly in GitHub.
                      </p>
                    )}
                    {d.session && (
                      <Link
                        href={`/app/devpilot/sessions/${d.session.id}`}
                        className="hover:bg-muted/50 flex flex-col gap-1 rounded-md border p-3"
                      >
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <TerminalSquareIcon className="size-3.5" aria-hidden /> Agent session ·
                          attempt {d.session.attempt}
                        </span>
                        <ActorChip actor={p.authorResolved} />
                        <SessionStatusBadge status={d.session.status} />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>

            <section aria-labelledby="changed-files" className="flex flex-col gap-3">
              <h2 id="changed-files" className="flex items-center gap-2 text-sm font-semibold">
                <FileCode2Icon className="size-4" aria-hidden /> Changed files
              </h2>
              <ChangedFiles prId={p.id} />
            </section>
          </div>
        );
      }}
    </QueryState>
  );
}
