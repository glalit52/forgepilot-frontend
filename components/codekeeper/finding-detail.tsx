"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  GitPullRequestIcon,
  InfoIcon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorChip } from "@/components/shared/actor-chip";
import { CommitSha, CopyButton } from "@/components/shared/misc";
import { ErrorState } from "@/components/shared/states";
import { RunStatusBadge, SeverityBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { useFinding, useFindingAction, useMembers, usePolicy, useSession } from "@/lib/api/hooks";
import type { FindingDetail, TestRunStatus } from "@/lib/schemas";
import { can } from "@/lib/domain/permissions";
import { formatDate, formatDateTime, formatRelative } from "@/lib/domain/format";
import { FINDING_CATEGORY_LABEL } from "@/lib/domain/labels";
import {
  CONFIDENCE_LABEL,
  FindingStatusBadge,
  GuardedButton,
  RiskBandBadge,
  RISK_BAND_HELP,
} from "./finding-ui";
import { SuppressDialog } from "./suppress-dialog";

const RUN_STATUSES = new Set(["queued", "running", "passed", "failed", "errored"]);

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Finding detail in a right sheet. Driven by `?finding=<id>` on the findings page. */
export function FindingDetailSheet({
  findingId,
  onClose,
  onSelect,
}: {
  findingId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const q = useFinding(findingId);
  return (
    <Sheet open={!!findingId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-xl" aria-describedby={undefined}>
        {q.isPending ? (
          <>
            <SheetHeader>
              <SheetTitle>Loading finding…</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-5" aria-busy="true">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          </>
        ) : q.error || !q.data ? (
          <>
            <SheetHeader>
              <SheetTitle>Finding unavailable</SheetTitle>
            </SheetHeader>
            <div className="px-5">
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            </div>
          </>
        ) : (
          <FindingDetailBody detail={q.data} onSelect={onSelect} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FindingDetailBody({
  detail,
  onSelect,
}: {
  detail: FindingDetail;
  onSelect: (id: string) => void;
}) {
  const { finding: f, dependency, repository, task, similar } = detail;
  const session = useSession();
  const policy = usePolicy();
  const members = useMembers();
  const action = useFindingAction(f.id);
  const [suppressOpen, setSuppressOpen] = useState(false);
  const role = session.data?.role;
  const canTask = can(role, "finding.create_task");
  const canSuppress = can(role, "finding.suppress");
  const maxDays = policy.data?.suppressionMaxDays ?? 90;
  const suppressedBy = f.suppression
    ? (members.data?.members.find((m) => m.id === f.suppression!.by)?.name ?? f.suppression.by)
    : null;
  const runStatus =
    task?.latestRunStatus && RUN_STATUSES.has(task.latestRunStatus)
      ? (task.latestRunStatus as TestRunStatus)
      : null;

  const createTask = () =>
    action.mutate(
      { action: "create_task" },
      {
        onSuccess: (d) => {
          const id = d.task?.id ?? d.finding.taskId;
          toast.success("Maintenance task created", {
            description: id ? (
              <span>
                An agent is starting in an isolated workspace.{" "}
                <Link
                  href={`/app/devpilot/tasks/${id}`}
                  className="font-medium underline underline-offset-2"
                >
                  Open task
                </Link>
              </span>
            ) : (
              "An agent is starting in an isolated workspace."
            ),
          });
        },
        onError: (e) => toast.error("Couldn't create the task", { description: e.message }),
      },
    );

  const unsuppress = () =>
    action.mutate(
      { action: "unsuppress" },
      {
        onSuccess: () =>
          toast.success("Suppression removed", {
            description: "The finding is back in the maintenance queue.",
          }),
        onError: (e) => toast.error("Couldn't remove the suppression", { description: e.message }),
      },
    );

  const taskReason = !canTask
    ? "Viewers can't create tasks. Ask a member or admin."
    : f.status === "resolved"
      ? "Already resolved: the latest scan no longer sees it."
      : f.status === "suppressed"
        ? "Unsuppress it first."
        : null;

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={f.severity} />
          <RiskBandBadge band={f.riskBand} />
          <FindingStatusBadge status={f.status} />
        </div>
        <SheetTitle className="text-base leading-snug">{f.title}</SheetTitle>
        <SheetDescription>
          {FINDING_CATEGORY_LABEL[f.category]} in{" "}
          <Link
            href={`/app/repositories/${repository.id}`}
            className="text-foreground font-medium hover:underline"
          >
            {repository.fullName}
          </Link>{" "}
          · detected {formatRelative(f.detectedAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-5 pb-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {task ? (
            <Button asChild size="sm">
              <Link href={`/app/devpilot/tasks/${task.id}`}>
                <WrenchIcon /> View maintenance task
              </Link>
            </Button>
          ) : (
            <GuardedButton
              size="sm"
              reason={taskReason}
              disabled={action.isPending}
              onClick={createTask}
            >
              <WrenchIcon /> {action.isPending ? "Creating…" : "Create maintenance task"}
            </GuardedButton>
          )}
          {f.status === "suppressed" ? (
            <GuardedButton
              size="sm"
              variant="outline"
              reason={canSuppress ? null : "Only admins and owners can change suppressions."}
              disabled={action.isPending}
              onClick={unsuppress}
            >
              <EyeIcon /> Unsuppress
            </GuardedButton>
          ) : (
            <GuardedButton
              size="sm"
              variant="outline"
              reason={
                !canSuppress
                  ? "Only admins and owners can suppress findings."
                  : f.status === "resolved"
                    ? "Resolved findings can't be suppressed."
                    : null
              }
              onClick={() => setSuppressOpen(true)}
            >
              <EyeOffIcon /> Suppress
            </GuardedButton>
          )}
        </div>
        {!task && canTask && f.status === "open" && (
          <p className="text-muted-foreground -mt-3 text-xs">
            Creates a policy-checked DevPilot task. The agent opens a PR, ShipSafe verifies it, and
            a human merges in GitHub.
          </p>
        )}

        {f.suppression && (
          <div className="bg-muted/60 rounded-lg border p-3 text-sm">
            <p className="font-medium">Suppressed until {formatDate(f.suppression.expiresAt)}</p>
            <p className="text-muted-foreground mt-1">&ldquo;{f.suppression.reason}&rdquo;</p>
            <p className="text-muted-foreground mt-1 text-xs">
              By {suppressedBy} · {formatDateTime(f.suppression.at)}
            </p>
          </div>
        )}

        {/* Advisory */}
        <section aria-labelledby="fd-advisory">
          <h3 id="fd-advisory" className="mb-1 text-sm font-semibold">
            Advisory
          </h3>
          <dl className="divide-y">
            <Row label="Advisory">
              {f.advisoryId ? (
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  {f.advisoryId}
                  <CopyButton value={f.advisoryId} label="Copy advisory id" className="size-6" />
                </span>
              ) : (
                <span className="text-muted-foreground">No advisory (maintenance check)</span>
              )}
            </Row>
            <Row label="Source">
              {f.advisorySource ? (
                f.sourceUrl ? (
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {f.advisorySource} <ExternalLinkIcon className="size-3" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  f.advisorySource
                )
              ) : (
                <span className="text-muted-foreground">CodeKeeper check</span>
              )}
            </Row>
            {f.package && (
              <Row label="Package">
                <span className="font-mono text-xs">{f.package}</span>
                {dependency && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {dependency.ecosystem === "npm" ? "npm" : "PyPI"} ·{" "}
                    {dependency.direct ? "direct" : "transitive"} · {dependency.manifest}
                  </span>
                )}
              </Row>
            )}
            {(f.affectedVersion || f.fixedVersion) && (
              <Row label="Version">
                <span className="inline-flex flex-wrap items-center gap-1.5 font-mono text-xs">
                  <span className="bg-danger-soft text-danger-foreground rounded px-1.5 py-0.5">
                    {f.affectedVersion ?? "?"}
                  </span>
                  <ArrowRightIcon className="text-muted-foreground size-3" aria-label="fixed in" />
                  <span
                    className={
                      f.fixedVersion
                        ? "bg-success-soft text-success-foreground rounded px-1.5 py-0.5"
                        : "text-muted-foreground"
                    }
                  >
                    {f.fixedVersion ?? "No fix published yet"}
                  </span>
                </span>
              </Row>
            )}
            <Row label="Confidence">{CONFIDENCE_LABEL[f.confidence]}</Row>
            <Row label="Risk band">
              <span className="flex flex-col gap-0.5">
                <span>
                  <RiskBandBadge band={f.riskBand} />
                </span>
                <span className="text-muted-foreground text-xs">{RISK_BAND_HELP}</span>
              </span>
            </Row>
          </dl>
        </section>

        {/* Evidence */}
        <section aria-labelledby="fd-evidence">
          <h3 id="fd-evidence" className="mb-2 text-sm font-semibold">
            Evidence
          </h3>
          <pre className="bg-muted/60 rounded-md border p-3 font-mono text-xs break-words whitespace-pre-wrap">
            {f.evidence}
          </pre>
          <dl className="mt-1 divide-y">
            <Row label="Last seen at">
              <span className="inline-flex items-center gap-1">
                <a
                  href={`${repository.url}/commit/${f.lastSeenSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  aria-label={`Commit ${f.lastSeenSha.slice(0, 7)} on GitHub (opens in a new tab)`}
                >
                  <CommitSha sha={f.lastSeenSha} />
                </a>
                <CopyButton value={f.lastSeenSha} label="Copy commit SHA" className="size-6" />
              </span>
            </Row>
            <Row label="Detected">{formatDateTime(f.detectedAt)}</Row>
            <Row label="Found by">
              <ActorChip
                actor={{
                  type: "system",
                  id: "codekeeper",
                  name: "CodeKeeper scanner",
                  detail: "scheduled & push scans",
                }}
              />
            </Row>
          </dl>
        </section>

        {/* Linked task */}
        <section aria-labelledby="fd-task">
          <h3 id="fd-task" className="mb-2 text-sm font-semibold">
            Maintenance task
          </h3>
          {task ? (
            <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/app/devpilot/tasks/${task.id}`}
                  className="min-w-0 font-medium hover:underline"
                >
                  {task.title}
                </Link>
                <TaskStatusBadge status={task.status} />
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {task.agent && (
                  <ActorChip
                    actor={{
                      type: "agent",
                      id: task.agent.id,
                      name: task.agent.name,
                      detail: task.agent.model,
                    }}
                  />
                )}
                {task.pullRequest && (
                  <Link
                    href={`/app/pull-requests/${task.pullRequest.id}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <GitPullRequestIcon className="size-3.5" aria-hidden /> PR #
                    {task.pullRequest.number} · {task.pullRequest.status}
                  </Link>
                )}
                {runStatus && <RunStatusBadge status={runStatus} prefix="ShipSafe" />}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No task yet. Create one to have an agent propose a fix.
            </p>
          )}
        </section>

        {/* Similar */}
        <section aria-labelledby="fd-similar">
          <h3 id="fd-similar" className="mb-2 text-sm font-semibold">
            Similar findings{" "}
            {similar.length > 0 && (
              <span className="text-muted-foreground font-normal">({similar.length})</span>
            )}
          </h3>
          {similar.length ? (
            <ul className="flex flex-col divide-y rounded-lg border">
              {similar.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className="hover:bg-muted/50 flex w-full flex-col gap-1 px-3 py-2 text-left text-sm"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={s.severity} />
                      <span className="min-w-0 truncate font-medium">{s.repositoryName}</span>
                      <FindingStatusBadge status={s.status} />
                    </span>
                    <span className="text-muted-foreground truncate text-xs">{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No other repositories in this workspace have this package flagged.
            </p>
          )}
        </section>

        <Separator />
        <div className="text-muted-foreground flex gap-2 text-xs">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>
            CodeKeeper deduplicates findings: the same advisory on the same package and repository
            is one finding, updated on every scan rather than duplicated. A finding closes on its
            own when a rescan of the default branch no longer sees it, for example after the fix PR
            is merged.
          </p>
        </div>
      </div>

      {suppressOpen && (
        <SuppressDialog
          open={suppressOpen}
          onOpenChange={setSuppressOpen}
          findingId={f.id}
          findingTitle={f.title}
          maxDays={maxDays}
        />
      )}
    </>
  );
}
