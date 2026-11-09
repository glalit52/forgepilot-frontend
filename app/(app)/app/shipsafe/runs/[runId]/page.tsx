"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BugIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  ExternalLinkIcon,
  GitPullRequestIcon,
  Loader2Icon,
  MinusCircleIcon,
  RotateCwIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LogViewer } from "@/components/shared/log-viewer";
import { CommitSha, CopyButton, MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { RunSummary } from "@/components/shared/run-summary";
import { PageSkeleton, ErrorState } from "@/components/shared/states";
import { RunStatusBadge, SeverityBadge } from "@/components/shared/status-badge";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { GuardedButton } from "@/components/shipsafe/guarded-button";
import { TriggerLabel, useNow, usePermission } from "@/components/shipsafe/helpers";
import { RunResults } from "@/components/shipsafe/run-results";
import { BugStatusBadge } from "@/components/shipsafe/bug-table";
import { useRerun, useTestRun } from "@/lib/api/hooks";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";
import type { TestRunDetail } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function LiveProgress({ detail }: { detail: TestRunDetail }) {
  const { run } = detail;
  const now = useNow(500);
  const start = Date.parse(run.startedAt);
  const end = run.simulatedEndsAt;
  const pct =
    end && end > start ? Math.min(97, Math.max(3, ((now - start) / (end - start)) * 100)) : null;
  return (
    <Card
      className="border-primary/40 bg-accent/30 flex flex-col gap-3 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <Loader2Icon className="text-primary size-4 animate-spin" aria-hidden />
          Verifying <CommitSha sha={run.headSha} /> in an isolated worker
        </span>
        <span className="text-muted-foreground text-xs tabular-nums" suppressHydrationWarning>
          {formatDuration((now - start) / 1000)} elapsed
          {end && end > now ? ` · about ${formatDuration((end - now) / 1000)} left` : ""}
        </span>
      </div>
      <Progress
        value={pct ?? undefined}
        aria-label="Run progress"
        className={cn(pct === null && "animate-pulse")}
      />
      <ul className="flex flex-wrap gap-2 text-xs">
        {detail.suites.map((s) => (
          <li
            key={s.id}
            className="bg-card inline-flex items-center gap-1.5 rounded-md border px-2 py-1"
          >
            <Loader2Icon className="text-primary size-3 animate-spin" aria-hidden /> {s.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CheckRunCard({ detail }: { detail: TestRunDetail }) {
  const { run, pullRequest } = detail;
  const cr = run.checkRun;
  const c = cr?.conclusion;
  const meta =
    c === "success"
      ? {
          icon: CheckCircle2Icon,
          cls: "text-success-foreground",
          label: "Success",
          help: "All required suites passed. Reviewers are notified; nothing merges automatically.",
        }
      : c === "failure"
        ? {
            icon: XCircleIcon,
            cls: "text-danger-foreground",
            label: "Failure",
            help: "At least one test failed. The PR shows a failing check until a newer commit passes.",
          }
        : c === "neutral"
          ? {
              icon: MinusCircleIcon,
              cls: "text-muted-foreground",
              label: "Neutral",
              help: "Informational only; it doesn't block the PR.",
            }
          : run.status === "errored"
            ? {
                icon: MinusCircleIcon,
                cls: "text-warning-foreground",
                label: "No conclusion",
                help: "Infrastructure errors don't publish a failing check against your change. Rerun to get a conclusion.",
              }
            : {
                icon: CircleDashedIcon,
                cls: "text-muted-foreground",
                label: "In progress",
                help: "The check shows as pending in GitHub until the run finishes.",
              };
  const Icon = meta.icon;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">GitHub Check Run</h2>
      {!pullRequest ? (
        <p className="text-muted-foreground text-xs">
          This run wasn&apos;t triggered by a pull request, so no Check Run was published. Results
          live here only.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Icon className={cn("size-5", meta.cls)} aria-hidden />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{cr?.name ?? "ForgePilot ShipSafe"}</span>
              <span className={cn("text-xs font-medium", meta.cls)}>Conclusion: {meta.label}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{meta.help}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Pull request</dt>
            <dd className="min-w-0 truncate">
              <Link href={`/app/pull-requests/${pullRequest.id}`} className="hover:underline">
                #{pullRequest.number} {pullRequest.title}
              </Link>
            </dd>
            <dt className="text-muted-foreground">Head SHA</dt>
            <dd>
              <CommitSha sha={run.headSha} />
            </dd>
            {cr?.detailsUrl && (
              <>
                <dt className="text-muted-foreground">Details URL</dt>
                <dd className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono">{cr.detailsUrl}</span>
                  <CopyButton value={cr.detailsUrl} label="Copy details URL" className="size-6" />
                </dd>
              </>
            )}
          </dl>
          <Button variant="outline" size="sm" asChild>
            <a href={pullRequest.url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon /> Open in GitHub
            </a>
          </Button>
          <p className="text-muted-foreground text-[11px]">
            Merging happens in GitHub, by a person, under your branch protection rules.
          </p>
        </>
      )}
    </Card>
  );
}

function Comparison({ detail }: { detail: TestRunDetail }) {
  const { previous, comparison } = detail;
  if (!previous || !comparison)
    return (
      <Card className="flex flex-col gap-2 p-4">
        <h2 className="text-sm font-semibold">Compared with the previous run</h2>
        <p className="text-muted-foreground text-xs">
          This is the first run for this {detail.pullRequest ? "pull request" : "branch"}, so
          there&apos;s nothing to compare yet.
        </p>
      </Card>
    );
  const groups = [
    {
      key: "newlyFailing",
      label: "Newly failing",
      items: comparison.newlyFailing,
      cls: "text-danger-foreground",
      icon: XCircleIcon,
    },
    {
      key: "stillFailing",
      label: "Still failing",
      items: comparison.stillFailing,
      cls: "text-warning-foreground",
      icon: MinusCircleIcon,
    },
    {
      key: "fixed",
      label: "Fixed",
      items: comparison.fixed,
      cls: "text-success-foreground",
      icon: CheckCircle2Icon,
    },
  ];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Compared with the previous run</h2>
        <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
          <Link href={`/app/shipsafe/runs/${previous.id}`} className="hover:underline">
            {previous.id}
          </Link>
          <RunStatusBadge status={previous.status} /> on <CommitSha sha={previous.headSha} />
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {groups.map((g) => (
          <div key={g.key} className="rounded-md border p-2">
            <dt className="text-muted-foreground text-[11px]">{g.label}</dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular-nums",
                g.items.length ? g.cls : "text-muted-foreground",
              )}
            >
              {g.items.length}
            </dd>
          </div>
        ))}
      </dl>
      {groups.some((g) => g.items.length) ? (
        <ul className="flex flex-col gap-1.5 text-xs">
          {groups.flatMap((g) =>
            g.items.map((name) => (
              <li key={g.key + name} className="flex items-start gap-1.5">
                <g.icon className={cn("mt-0.5 size-3.5 shrink-0", g.cls)} aria-hidden />
                <span className="sr-only">{g.label}:</span>
                <span className="font-mono break-all">{name}</span>
              </li>
            )),
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">
          Same outcome as before: no tests changed state.
        </p>
      )}
    </Card>
  );
}

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const q = useTestRun(runId);
  const rerun = useRerun();
  const router = useRouter();
  const perm = usePermission("test.run");
  const d = q.data;
  useBreadcrumbLabel(
    runId,
    d
      ? d.run.pullRequestNumber
        ? `PR #${d.run.pullRequestNumber} · ${d.run.headSha.slice(0, 7)}`
        : `${d.run.branch} · ${d.run.headSha.slice(0, 7)}`
      : undefined,
  );

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !d) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { run } = d;
  const live = run.status === "running" || run.status === "queued";
  const infra = run.status === "errored";

  const doRerun = () =>
    rerun.mutate(run.id, {
      onSuccess: (next) => {
        toast.success(infra ? "Rerun started (free)" : "Rerun started", {
          description: `Same commit pin ${next.headSha.slice(0, 7)}. You're now watching the new run.`,
        });
        router.push(`/app/shipsafe/runs/${next.id}`);
      },
      onError: (e) => toast.error("Couldn't start the rerun", { description: e.message }),
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          run.pullRequestNumber ? (
            <>
              <span className="text-muted-foreground">#{run.pullRequestNumber}</span>{" "}
              {run.pullRequestTitle}
            </>
          ) : (
            <>
              Run on <span className="font-mono">{run.branch}</span>
            </>
          )
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{run.repositoryName}</span>·<TriggerLabel trigger={run.trigger} />·
            <span title={formatDateTime(run.startedAt)} suppressHydrationWarning>
              started {formatRelative(run.startedAt)}
            </span>
            {run.retestOf && (
              <>
                ·
                <span>
                  rerun of{" "}
                  <Link href={`/app/shipsafe/runs/${run.retestOf}`} className="hover:underline">
                    {run.retestOf}
                  </Link>
                </span>
              </>
            )}
          </span>
        }
        meta={
          <>
            <RunStatusBadge status={run.status} />
            <span className="text-muted-foreground inline-flex items-center gap-1 font-mono text-xs">
              {run.id} <CopyButton value={run.id} label="Copy run id" className="size-6" />
            </span>
            <MockDataBadge />
          </>
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              {d.pullRequest && (
                <Button variant="outline" asChild>
                  <Link href={`/app/pull-requests/${d.pullRequest.id}`}>
                    <GitPullRequestIcon /> PR verification
                  </Link>
                </Button>
              )}
              <GuardedButton
                onClick={doRerun}
                variant={infra ? "default" : "outline"}
                disabled={rerun.isPending}
                disabledReason={
                  !perm.allowed
                    ? perm.reason
                    : live
                      ? "Wait for this run to finish before rerunning it."
                      : null
                }
              >
                {rerun.isPending ? <Loader2Icon className="animate-spin" /> : <RotateCwIcon />}{" "}
                Rerun
              </GuardedButton>
            </div>
            <span className="text-muted-foreground max-w-64 text-right text-[11px]">
              {infra
                ? "Infrastructure errors rerun free: no browser minutes are billed."
                : "Reruns use the same commit pin and count toward browser minutes."}
            </span>
          </div>
        }
      />

      {live && <LiveProgress detail={d} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card className="p-4">
            <RunSummary run={run} />
            <p className="text-muted-foreground mt-3 text-xs">
              {run.billedBrowserMinutes
                ? `${run.billedBrowserMinutes} browser minutes billed. `
                : ""}
              {run.finishedAt ? `Finished ${formatDateTime(run.finishedAt)}.` : ""}
            </p>
          </Card>

          <Section
            title="Test plan"
            description="Deterministic selection from your path rules. Each suite records why it ran."
          >
            {d.suites.length ? (
              <ul className="divide-y rounded-lg border">
                {d.suites.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    {s.required && <Badge variant="secondary">Required</Badge>}
                    <span className="text-muted-foreground font-mono text-xs">{s.command}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      <span className="sr-only">Selected because: </span>
                      {s.reason}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                No suites were selected for this run.
              </p>
            )}
          </Section>

          <Section
            title="Results"
            description="Grouped by suite, failures first. Every failure carries its classification and evidence."
          >
            <RunResults detail={d} />
          </Section>

          <Section
            title="Worker log"
            description={`${run.environment.worker} · ${run.environment.region}`}
          >
            <LogViewer lines={d.workerLog} live={live} height="h-72" />
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <CheckRunCard detail={d} />
          <Comparison detail={d} />
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold">Bugs from this run</h2>
            {d.bugs.length ? (
              <ul className="flex flex-col gap-2">
                {d.bugs.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/app/shipsafe/bugs/${b.id}`}
                      className="hover:bg-accent/50 flex flex-col gap-1.5 rounded-md border p-2.5"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <BugIcon className="text-danger-foreground size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{b.title}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <SeverityBadge severity={b.severity} />
                        <BugStatusBadge status={b.status} />
                        <ArrowRightIcon
                          className="text-muted-foreground ml-auto size-3.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                {live
                  ? "Bugs are filed when a product defect is confirmed."
                  : run.totals.failed
                    ? "No bug filed. Bugs are created only for product defects found on pull requests."
                    : "None. No product defects were found."}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
