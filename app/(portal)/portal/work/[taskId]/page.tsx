"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  GitPullRequestIcon,
  StampIcon,
  TicketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActorChip } from "@/components/shared/actor-chip";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { EvidenceTimeline } from "@/components/shared/evidence-timeline";
import { MockDataBadge, TaskTypeBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { ErrorState, PageSkeleton, QueryState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerificationSummary } from "@/components/shared/verification-summary";
import { Meta, usePortalRole } from "@/components/portal/portal-utils";
import { agentActor, engineerActor } from "@/components/portal/task-actors";
import { TaskDecision } from "@/components/portal/task-decision";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { useTask, useTaskDiff } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/domain/format";
import { TASK_STATE_CLIENT_COPY } from "@/lib/domain/labels";
import { TASK_STATE_TONE } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const TONE_PANEL: Record<string, string> = {
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger-foreground",
  info: "bg-info-soft text-info-foreground",
  accent: "bg-accent text-accent-foreground",
  neutral: "bg-muted text-foreground",
};

function WhatChanged({ taskId }: { taskId: string }) {
  const q = useTaskDiff(taskId);
  return (
    <QueryState query={q} loading={<TableSkeleton rows={4} cols={2} />}>
      {(files) => <DiffViewer files={files} />}
    </QueryState>
  );
}

export default function PortalTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const q = useTask(taskId);
  const role = usePortalRole();
  const [showDiff, setShowDiff] = useState(false);
  useBreadcrumbLabel(taskId, q.data?.task.title);

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const t = d.task;
  const engineer = engineerActor(t);
  const lastApproval = d.approvals.at(-1);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t.title}
        description={
          <>
            <Link href={`/portal/applications/${t.applicationId}`} className="hover:underline">
              {t.applicationName}
            </Link>{" "}
            · <span className="font-mono text-xs">{t.repositoryName}</span>
          </>
        }
        meta={
          <>
            <StatusBadge state={t.state} />
            <TaskTypeBadge type={t.type} />
            <AiCodeFlag pct={t.aiAuthoredPct} />
            <MockDataBadge />
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="#evidence">Jump to evidence</a>
          </Button>
        }
      />

      <div
        className={cn(
          "rounded-lg px-4 py-3 text-sm font-medium",
          TONE_PANEL[TASK_STATE_TONE[t.state]],
        )}
        role="status"
      >
        {TASK_STATE_CLIENT_COPY[t.state]}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>What changed and why</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{t.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification</CardTitle>
              <CardDescription>
                Full test suite and security scans run before an engineer can sign off
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerificationSummary verification={t.latestVerification} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-5">
              <button
                type="button"
                onClick={() => setShowDiff((s) => !s)}
                aria-expanded={showDiff}
                aria-controls="what-changed"
                className="hover:text-foreground focus-visible:ring-ring/50 flex items-center justify-between gap-2 rounded text-left focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">What changed (code diff)</span>
                  <span className="text-muted-foreground text-sm">
                    Files touched, with AI-authored files marked
                  </span>
                </span>
                <ChevronDownIcon
                  className={cn("size-4 shrink-0 transition-transform", showDiff && "rotate-180")}
                  aria-hidden
                />
              </button>
            </CardHeader>
            {showDiff && (
              <CardContent id="what-changed">
                <WhatChanged taskId={t.id} />
              </CardContent>
            )}
          </Card>

          <Card id="evidence" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Evidence timeline</CardTitle>
              <CardDescription>
                Every step, who did it (agent or person) and a hash linking it to the step before
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EvidenceTimeline records={d.evidence} chainValid={d.chainValid} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {t.state === "pr_open" && (
            <Card className="border-warning/40">
              <CardHeader>
                <CardTitle>Your decision</CardTitle>
                <CardDescription>
                  This change is verified and signed off, and is waiting for you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskDecision detail={d} canApprove={role.canApprove} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3">
                <Meta label="Linked ticket">
                  <span className="inline-flex items-center gap-1.5">
                    <TicketIcon className="text-muted-foreground size-3.5" aria-hidden />
                    {t.source.url ? (
                      <a
                        href={t.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {t.source.ref}
                        <ExternalLinkIcon className="size-3" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <span>
                        {t.source.ref}
                        <span className="text-muted-foreground">
                          {" "}
                          · {t.source.kind === "scan" ? "from a health scan" : t.source.kind}
                        </span>
                      </span>
                    )}
                  </span>
                </Meta>
                <Meta label="SLA due">
                  <span className="flex flex-col gap-0.5">
                    <SlaCountdown dueAt={t.slaDueAt} risk={t.slaRisk} />
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(t.slaDueAt)}
                    </span>
                  </span>
                </Meta>
                <Meta label="Pull request">
                  {t.pullRequest ? (
                    <a
                      href={t.pullRequest.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <GitPullRequestIcon className="size-3.5" aria-hidden />
                      PR #{t.pullRequest.number} in your Git
                      <ExternalLinkIcon className="size-3" aria-hidden />
                      <span className="sr-only">(opens your Git provider in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground">
                      Not opened yet — opens after engineer sign-off
                    </span>
                  )}
                </Meta>
                <Meta label="AI-authored code">
                  <AiCodeFlag pct={t.aiAuthoredPct} />
                </Meta>
                <Meta label="Done by">
                  <span className="flex flex-col gap-1">
                    <ActorChip actor={agentActor(t)} />
                    {engineer ? (
                      <ActorChip actor={engineer} />
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        No engineer assigned yet
                      </span>
                    )}
                  </span>
                </Meta>
                <Meta label="Engineer sign-off">
                  {d.signOff ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <StampIcon className="text-success-foreground size-3.5" aria-hidden />
                      <span className="font-medium">{d.signOff.by}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(d.signOff.at)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not signed off yet</span>
                  )}
                </Meta>
                {lastApproval && (
                  <Meta label="Your team's decision">
                    <span className="flex flex-col gap-0.5">
                      <span>
                        {lastApproval.decision === "approved" ? "Approved" : "Changes requested"} by{" "}
                        <span className="font-medium">
                          {lastApproval.approver?.name ?? "a team member"}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(lastApproval.at)}
                      </span>
                      {lastApproval.comment && (
                        <span className="text-muted-foreground text-xs">
                          “{lastApproval.comment}”
                        </span>
                      )}
                    </span>
                  </Meta>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
