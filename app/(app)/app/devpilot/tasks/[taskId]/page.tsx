"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRightIcon, FileSearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { ActorChip } from "@/components/shared/actor-chip";
import { LifecycleStepper } from "@/components/shared/lifecycle";
import { CommitSha, CopyButton, MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { MetaList, SourceChip } from "@/components/devpilot/bits";
import { TaskActions } from "@/components/devpilot/task-actions";
import {
  FixLoop,
  PolicyPreview,
  PullRequestCard,
  SessionAttempts,
  TaskApprovals,
  TaskSpec,
} from "@/components/devpilot/task-sections";
import { agentActor, formatCost, personActor } from "@/components/devpilot/utils";
import { useTask } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/domain/format";
import { PRIORITY_LABEL, TASK_SOURCE_LABEL } from "@/lib/domain/labels";
import type { TaskDetail } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const q = useTask(taskId);
  useBreadcrumbLabel(taskId, q.data?.task.title);

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !q.data) {
    const notFound = q.error instanceof Error && /not found|404/i.test(q.error.message);
    return notFound ? (
      <EmptyState
        icon={FileSearchIcon}
        title="Task not found"
        description="It may belong to another workspace, or the link is wrong."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/devpilot/tasks">Back to tasks</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    );
  }
  return <TaskView detail={q.data} />;
}

function TaskView({ detail }: { detail: TaskDetail }) {
  const { task } = detail;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={task.title}
        meta={
          <>
            <TaskStatusBadge status={task.status} />
            <span
              className={cn(
                "text-xs font-medium",
                task.priority === "urgent"
                  ? "text-danger-foreground"
                  : task.priority === "high"
                    ? "text-warning-foreground"
                    : "text-muted-foreground",
              )}
            >
              {PRIORITY_LABEL[task.priority]} priority
            </span>
            <SourceChip source={task.source} sourceRef={task.sourceRef} />
            <span className="text-muted-foreground inline-flex items-center font-mono text-xs">
              {task.id}
              <CopyButton value={task.id} label="Copy task id" className="size-6" />
            </span>
            <MockDataBadge />
          </>
        }
        actions={<TaskActions detail={detail} />}
      />

      <LifecycleStepper steps={detail.lifecycle} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <TaskSpec task={task} />
          <FixLoop detail={detail} />
          <Section
            title="Agent sessions"
            description="Every attempt runs in its own isolated workspace from the same base commit."
          >
            <SessionAttempts detail={detail} />
          </Section>
          <Section
            title="Pull request & verification"
            description="ShipSafe verifies the exact PR head commit. Review-ready only when it passes."
          >
            <PullRequestCard detail={detail} />
          </Section>
          <Section
            title="Activity"
            description="Every action, with who did it: a person, an agent (with model) or the system."
          >
            <Card className="p-4">
              <ActivityTimeline items={detail.activity} />
            </Card>
          </Section>
        </div>
        <aside className="flex min-w-0 flex-col gap-4" aria-label="Task details">
          <TaskApprovals approvals={detail.approvals} />
          <Metadata detail={detail} />
          <PolicyPreview preview={detail.policyPreview} task={task} />
        </aside>
      </div>
    </div>
  );
}

function Metadata({ detail }: { detail: TaskDetail }) {
  const { task, parent, children, bug, finding } = detail;
  const items = [
    {
      label: "Repository",
      value: (
        <Link
          href={`/app/repositories/${task.repositoryId}`}
          className="hover:text-primary font-mono text-xs hover:underline"
        >
          {task.repositoryName}
        </Link>
      ),
    },
    {
      label: "Project",
      value: (
        <Link
          href={`/app/projects/${task.projectId}`}
          className="hover:text-primary hover:underline"
        >
          {task.projectName}
        </Link>
      ),
    },
    {
      label: "Base commit",
      hint: "Immutable: every attempt starts from this commit",
      value: (
        <span className="inline-flex items-center">
          <CommitSha sha={task.baseSha} />
          <CopyButton value={task.baseSha} label="Copy base SHA" className="size-6" />
        </span>
      ),
    },
    {
      label: "Branch",
      value: (
        <span className="inline-flex max-w-full items-center">
          <span className="truncate font-mono text-xs" title={task.branch}>
            {task.branch}
          </span>
          <CopyButton value={task.branch} label="Copy branch name" className="size-6" />
        </span>
      ),
    },
    {
      label: "Target branch",
      value: <span className="font-mono text-xs">{task.targetBranch}</span>,
    },
    {
      label: "Agent",
      value: task.agent ? (
        <ActorChip actor={agentActor(task.agent)} className="text-xs" />
      ) : (
        <span className="text-muted-foreground">Not assigned</span>
      ),
    },
    {
      label: "Budget",
      value: (
        <span className="tabular-nums">
          {formatCost(task.costUsd)} of {formatCost(task.budgetUsd)} used
        </span>
      ),
    },
    { label: "Timeout", value: `${task.timeoutMin} min per attempt` },
    { label: "Priority", value: PRIORITY_LABEL[task.priority] },
    {
      label: "Created by",
      value: task.createdByUser ? (
        <ActorChip actor={personActor(task.createdByUser)} showDetail={false} className="text-xs" />
      ) : (
        "System"
      ),
    },
    {
      label: "Created",
      value: <span suppressHydrationWarning>{formatDateTime(task.createdAt)}</span>,
    },
    {
      label: "Source",
      value: (
        <span>
          {TASK_SOURCE_LABEL[task.source]}
          {task.sourceRef && (
            <span className="text-muted-foreground font-mono text-xs"> · {task.sourceRef}</span>
          )}
        </span>
      ),
    },
  ];
  const links = [
    parent && {
      href: `/app/devpilot/tasks/${parent.id}`,
      label: "Parent task",
      text: parent.title,
    },
    ...children.map((c) => ({
      href: `/app/devpilot/tasks/${c.id}`,
      label: "Fix task",
      text: c.title,
    })),
    bug && { href: `/app/shipsafe/bugs/${bug.id}`, label: "Bug", text: bug.title },
    finding && {
      href: `/app/codekeeper/findings?finding=${finding.id}`,
      label: "Finding",
      text: finding.title,
    },
  ].filter(Boolean) as { href: string; label: string; text: string }[];
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold">Details</h2>
      <MetaList items={items} />
      {links.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t pt-3">
          <h3 className="text-muted-foreground text-xs font-medium">Linked</h3>
          <ul className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li key={l.href} className="text-sm">
                <span className="text-muted-foreground text-xs">{l.label}: </span>
                <Link
                  href={l.href}
                  className="hover:text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  {l.text}
                  <ArrowUpRightIcon className="size-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
