"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, FileSearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorChip } from "@/components/shared/actor-chip";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { LogViewer } from "@/components/shared/log-viewer";
import { CommitSha, MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import {
  ApprovalBanner,
  CancelSessionButton,
  ClarificationForm,
  UsagePanel,
  WorkspacePanel,
} from "@/components/devpilot/session-panels";
import { TaskApprovals } from "@/components/devpilot/task-sections";
import { agentActor, formatCost, sessionSeconds, useNow } from "@/components/devpilot/utils";
import { useSession, useSessionDetail, useSessionDiff, useSessionLog } from "@/lib/api/hooks";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import type { SessionDetail } from "@/lib/schemas";

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const q = useSessionDetail(sessionId);
  useBreadcrumbLabel(sessionId, q.data ? `Attempt ${q.data.session.attempt}` : undefined);
  if (q.isPending) return <PageSkeleton />;
  if (q.error || !q.data) {
    const notFound = q.error instanceof Error && /not found|404/i.test(q.error.message);
    return notFound ? (
      <EmptyState
        icon={FileSearchIcon}
        title="Session not found"
        description="It may belong to another workspace, or the link is wrong."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/devpilot/sessions">Back to sessions</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    );
  }
  return <SessionView detail={q.data} />;
}

function SessionView({ detail }: { detail: SessionDetail }) {
  const { session, task } = detail;
  const role = useSession().data?.role;
  const active =
    session.status === "running" || session.status === "waiting" || session.status === "queued";
  const running = session.status === "running";
  const now = useNow(1000, running);
  const log = useSessionLog(session.id, active);
  const diff = useSessionDiff(session.id, session.changedFiles.length > 0);
  const elapsed = session.durationSec ?? sessionSeconds(session, now);
  const waitingApproval = session.status === "waiting" && session.waitingFor?.kind === "approval";
  const waitingAnswer =
    session.status === "waiting" && session.waitingFor?.kind === "clarification";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {task.title}
            <span className="text-muted-foreground text-base font-normal">
              · attempt {session.attempt}
            </span>
          </span>
        }
        meta={
          <>
            <SessionStatusBadge status={session.status} />
            <ActorChip actor={agentActor(session.agent)} />
            <span className="text-muted-foreground font-mono text-xs">
              {session.repositoryName}
            </span>
            <span className="text-muted-foreground text-xs" suppressHydrationWarning>
              Started {formatRelative(session.startedAt)} · {formatDuration(elapsed)}
              {active ? " so far" : ""} · {formatCost(session.costUsd)}
            </span>
            <MockDataBadge />
          </>
        }
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href={`/app/devpilot/tasks/${task.id}`}>
                <ArrowLeftIcon /> Task
              </Link>
            </Button>
            <CancelSessionButton
              sessionId={session.id}
              active={session.status === "running" || session.status === "waiting"}
              allowed={can(role, "task.cancel")}
            />
          </>
        }
      />

      {waitingApproval && <ApprovalBanner approvals={detail.approvals} />}
      {waitingAnswer && (
        <ClarificationForm
          sessionId={session.id}
          question={session.waitingFor?.question ?? "The agent asked a question."}
          canAnswer={can(role, "task.launch")}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Section
            title="Live log"
            description={
              running
                ? "Streaming structured events as the agent works."
                : "Structured events recorded for this session."
            }
          >
            <Card className="flex flex-col gap-3 p-4">
              {log.isPending ? (
                <Skeleton className="h-96" />
              ) : log.error || !log.data ? (
                <ErrorState error={log.error} onRetry={() => log.refetch()} />
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={log.data.progressPct}
                      aria-label={`Session progress ${Math.round(log.data.progressPct)}%`}
                    />
                    <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                      {Math.round(log.data.progressPct)}%
                    </span>
                  </div>
                  <LogViewer
                    lines={log.data.lines}
                    live={running}
                    redactions={log.data.redactions}
                  />
                </>
              )}
            </Card>
          </Section>

          <Section
            title="Changed files"
            description={
              session.headSha ? (
                <>
                  Commit <CommitSha sha={session.headSha} /> on {task.branch}
                </>
              ) : (
                "Files appear when the agent commits its work."
              )
            }
          >
            {session.summary && <p className="text-sm">{session.summary}</p>}
            {session.changedFiles.length === 0 ? (
              <EmptyState
                title={active ? "No changes committed yet" : "No files changed"}
                description={active ? "The diff shows up when the agent finishes." : undefined}
                className="py-8"
              />
            ) : diff.isPending ? (
              <Skeleton className="h-64" />
            ) : diff.error || !diff.data ? (
              <ErrorState error={diff.error} onRetry={() => diff.refetch()} />
            ) : (
              <DiffViewer files={diff.data} />
            )}
            {session.notes && (
              <p className="bg-muted/60 rounded-md p-3 text-sm">
                <span className="font-medium">Notes: </span>
                {session.notes}
              </p>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4" aria-label="Session details">
          <TaskApprovals approvals={detail.approvals} />
          <UsagePanel detail={detail} elapsedSec={elapsed} />
          <WorkspacePanel workspace={detail.workspace} />
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold">Attempts on this task</h2>
            <ol className="flex flex-col gap-2 text-sm">
              {[session, ...detail.otherAttempts]
                .sort((a, b) => b.attempt - a.attempt)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    {s.id === session.id ? (
                      <span className="font-medium" aria-current="page">
                        Attempt {s.attempt} (this one)
                      </span>
                    ) : (
                      <Link
                        href={`/app/devpilot/sessions/${s.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        Attempt {s.attempt}
                      </Link>
                    )}
                    <span className="flex items-center gap-2">
                      <time
                        dateTime={s.startedAt}
                        title={formatDateTime(s.startedAt)}
                        className="text-muted-foreground text-xs"
                        suppressHydrationWarning
                      >
                        {formatRelative(s.startedAt)}
                      </time>
                      <SessionStatusBadge status={s.status} />
                    </span>
                  </li>
                ))}
            </ol>
            <Link
              href={`/app/devpilot/tasks/${task.id}`}
              className="text-primary text-xs hover:underline"
            >
              Open the task
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
