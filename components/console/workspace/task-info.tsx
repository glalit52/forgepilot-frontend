import Link from "next/link";
import { AlertOctagonIcon, ExternalLinkIcon } from "lucide-react";
import { CriticalityBadge, TaskTypeBadge } from "@/components/shared/misc";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import type { TaskDetail } from "@/lib/schemas";
import { PRIORITY_LABEL, repoName } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/domain/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-start gap-2 text-sm">
      <dt className="text-muted-foreground text-xs leading-5">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function TaskInfo({
  detail,
  manualTakeoverName,
}: {
  detail: TaskDetail;
  manualTakeoverName: string | null;
}) {
  const { task, organization, application, repository } = detail;
  return (
    <div className="flex flex-col gap-3">
      {task.state === "escalated" && task.escalationReason && (
        <div
          role="note"
          className="bg-danger-soft text-danger-foreground flex gap-2 rounded-md px-3 py-2 text-sm"
        >
          <AlertOctagonIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Escalated</p>
            <p className="text-xs">{task.escalationReason}</p>
          </div>
        </div>
      )}
      <dl className="flex flex-col gap-2">
        <Row label="Client">
          <Link
            href={`/console/clients/${organization.id}`}
            className="font-medium hover:underline"
          >
            {organization.name}
          </Link>
        </Row>
        <Row label="Application">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {application.name}
            <CriticalityBadge criticality={application.criticality} />
          </span>
        </Row>
        <Row label="Repository">
          <Link
            href={`/console/repositories/${repository.id}`}
            className="font-mono text-xs hover:underline"
          >
            {repoName(repository.url)}
          </Link>
          <span className="text-muted-foreground block text-xs">
            branch {repository.defaultBranch}
          </span>
        </Row>
        <Row label="Type">
          <TaskTypeBadge type={task.type} />
        </Row>
        <Row label="Priority">{PRIORITY_LABEL[task.priority]}</Row>
        <Row label="SLA">
          <SlaCountdown dueAt={task.slaDueAt} risk={task.slaRisk} />
          <span className="text-muted-foreground block text-xs">
            Due {formatDateTime(task.slaDueAt)}
          </span>
        </Row>
        <Row label="Source">
          {task.source.url ? (
            <a
              href={task.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
            >
              {task.source.ref}
              <ExternalLinkIcon className="size-3" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span className="font-mono text-xs">
              {task.source.ref}{" "}
              <span className="text-muted-foreground font-sans">({task.source.kind})</span>
            </span>
          )}
        </Row>
        <Row label="Assignee">
          {task.assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>}
        </Row>
        {manualTakeoverName && (
          <Row label="Taken over by">
            <span className="font-medium">{manualTakeoverName}</span>
            <span className="text-muted-foreground block text-xs">
              Human-authored change, still verified
            </span>
          </Row>
        )}
        <Row label="Created">{formatDateTime(task.createdAt)}</Row>
      </dl>
      {task.summary && (
        <p className="text-muted-foreground border-t pt-3 text-sm">{task.summary}</p>
      )}
    </div>
  );
}
