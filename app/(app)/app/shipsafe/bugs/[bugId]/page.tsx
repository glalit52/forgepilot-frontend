"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BanIcon,
  CheckIcon,
  ImageIcon,
  Loader2Icon,
  RotateCcwIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CommitSha, CopyButton, MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EvidenceLinks } from "@/components/shared/run-summary";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import {
  FailureClassBadge,
  RunStatusBadge,
  SeverityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { BugStatusBadge } from "@/components/shipsafe/bug-table";
import { ClosedLoopDiagram } from "@/components/shipsafe/closed-loop";
import { GuardedButton } from "@/components/shipsafe/guarded-button";
import { usePermission } from "@/components/shipsafe/helpers";
import { useBug, useBugAction, usePolicy } from "@/lib/api/hooks";
import { formatDateTime, formatRelative } from "@/lib/domain/format";
import { DEFAULT_MAX_FIX_RETRIES } from "@/lib/domain/workflow";
import type { BugActionInput, BugDetail } from "@/lib/schemas";

function WontFixDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (comment: string) => void;
  pending: boolean;
}) {
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const id = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setComment("");
          setErr(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close as won&apos;t fix</DialogTitle>
          <DialogDescription>
            The bug stays on record with its evidence. Say why, so the decision is clear in the
            audit log.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim().length < 3) return setErr("Say why (at least 3 characters)");
            onConfirm(comment.trim());
          }}
          className="flex flex-col gap-3"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>Reason</Label>
            <Textarea
              id={id}
              value={comment}
              onChange={(e) => (setComment(e.target.value), setErr(null))}
              rows={3}
              placeholder="Expected behaviour after the billing redesign; test will be updated."
              aria-invalid={!!err}
              aria-describedby={err ? `${id}-err` : undefined}
            />
            {err && (
              <p id={`${id}-err`} role="alert" className="text-danger-foreground text-xs">
                {err}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <BanIcon />} Close as won&apos;t
              fix
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Actions({ d, maxRetries }: { d: BugDetail; maxRetries: number }) {
  const action = useBugAction(d.bug.id);
  const perm = usePermission("bug.manage");
  const router = useRouter();
  const [wontFix, setWontFix] = useState(false);
  const [pendingAction, setPendingAction] = useState<BugActionInput["action"] | null>(null);
  const status = d.bug.status;
  const no = perm.allowed ? null : perm.reason;

  const run = (input: BugActionInput, ok: (r: BugDetail) => void) => {
    setPendingAction(input.action);
    action.mutate(input, {
      onSuccess: (r) => ok(r),
      onError: (e) => toast.error("That didn't work", { description: e.message }),
      onSettled: () => setPendingAction(null),
    });
  };
  const busy = (a: BugActionInput["action"]) => action.isPending && pendingAction === a;

  return (
    <div className="flex flex-col items-start gap-1.5 md:items-end">
      <div className="flex flex-wrap gap-2 md:justify-end">
        {(status === "open" || status === "fix_in_progress") && (
          <GuardedButton
            disabled={action.isPending}
            disabledReason={
              no ??
              (status === "fix_in_progress" &&
              d.task &&
              !["failed", "cancelled"].includes(d.task.status)
                ? "A fix task is already in progress. Wait for its retest, or resolve the bug."
                : null)
            }
            onClick={() =>
              run({ action: "create_fix_task" }, (r) => {
                const t = r.task;
                toast.success("Fix task created and launched", {
                  description: t
                    ? `${t.title}. ShipSafe will retest the new commit automatically.`
                    : undefined,
                  action: t
                    ? {
                        label: "Open task",
                        onClick: () => router.push(`/app/devpilot/tasks/${t.id}`),
                      }
                    : undefined,
                });
              })
            }
          >
            {busy("create_fix_task") ? <Loader2Icon className="animate-spin" /> : <WrenchIcon />}{" "}
            Create fix task
          </GuardedButton>
        )}
        {(status === "open" || status === "fix_in_progress") && (
          <GuardedButton
            variant="outline"
            disabled={action.isPending}
            disabledReason={no}
            onClick={() => run({ action: "resolve" }, () => toast.success("Bug marked resolved"))}
          >
            {busy("resolve") ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} Resolve
          </GuardedButton>
        )}
        {status === "open" && (
          <GuardedButton
            variant="outline"
            disabled={action.isPending}
            disabledReason={no}
            onClick={() => setWontFix(true)}
          >
            <BanIcon /> Won&apos;t fix
          </GuardedButton>
        )}
        {(status === "resolved" || status === "wont_fix") && (
          <GuardedButton
            variant="outline"
            disabled={action.isPending}
            disabledReason={no}
            onClick={() => run({ action: "reopen" }, () => toast.success("Bug reopened"))}
          >
            {busy("reopen") ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />} Reopen
          </GuardedButton>
        )}
      </div>
      {(status === "open" || status === "fix_in_progress") && (
        <p className="text-muted-foreground max-w-80 text-[11px] md:text-right">
          Fix attempts are capped at {maxRetries} per bug by workspace policy. After that, ShipSafe
          stops and asks a person to investigate.
        </p>
      )}
      <WontFixDialog
        open={wontFix}
        onOpenChange={setWontFix}
        pending={busy("wont_fix")}
        onConfirm={(comment) =>
          run({ action: "wont_fix", comment }, () => {
            setWontFix(false);
            toast.success("Closed as won't fix");
          })
        }
      />
    </div>
  );
}

export default function BugDetailPage() {
  const { bugId } = useParams<{ bugId: string }>();
  const q = useBug(bugId);
  const policy = usePolicy();
  const d = q.data;
  useBreadcrumbLabel(bugId, d?.bug.title);

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !d) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { bug, result, run, pullRequest, task, repository } = d;
  const maxRetries = policy.data?.maxFixRetries ?? DEFAULT_MAX_FIX_RETRIES;
  const screenshots = result.evidence.filter((e) => e.kind === "screenshot");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={bug.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{repository.fullName}</span>·
            <span title={formatDateTime(bug.createdAt)} suppressHydrationWarning>
              found {formatRelative(bug.createdAt)}
            </span>
            · on <CommitSha sha={bug.commitSha} />
          </span>
        }
        meta={
          <>
            <SeverityBadge severity={bug.severity} />
            <BugStatusBadge status={bug.status} />
            {result.classification && <FailureClassBadge classification={result.classification} />}
            <MockDataBadge />
          </>
        }
        actions={<Actions d={d} maxRetries={maxRetries} />}
      />

      <Card className="p-4">
        <Section
          title="Closed-loop fix workflow"
          description="Failure → linked defect → DevPilot fix task → isolated agent fix → new commit → ShipSafe retest → human review."
        >
          <ClosedLoopDiagram detail={d} />
        </Section>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Section title="Reproduction steps">
            <ol className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
              {bug.reproSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            title="Failing test"
            description={`${result.retries ? `${result.retries} retries, failed every time. ` : "Failed on the first attempt. "}Classified as a product defect, not flaky or infrastructure.`}
          >
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm break-all">{result.name}</span>
                <CopyButton value={result.name} label="Copy test name" className="size-7" />
              </div>
              {result.error && (
                <pre className="bg-muted overflow-x-auto rounded p-2.5 font-mono text-xs whitespace-pre-wrap">
                  {result.error}
                </pre>
              )}
              {screenshots.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {screenshots.map((s) => (
                    <figure key={s.ref} className="flex flex-col gap-1">
                      <div
                        className="bg-muted/60 text-muted-foreground flex aspect-video flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-xs"
                        role="img"
                        aria-label={`${s.label} (demo placeholder for ${s.ref})`}
                      >
                        <ImageIcon className="size-6" aria-hidden />
                        Screenshot preview
                        <span className="font-mono text-[10px]">{s.ref}</span>
                      </div>
                      <figcaption className="text-muted-foreground text-xs">{s.label}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs">Evidence</span>
                <EvidenceLinks evidence={result.evidence} />
              </div>
            </Card>
          </Section>

          <Section
            title="Stack trace"
            actions={<CopyButton value={bug.stackTrace} label="Copy stack trace" />}
          >
            <pre className="overflow-x-auto rounded-lg border bg-[oklch(0.16_0.01_286)] p-3 font-mono text-xs leading-5 whitespace-pre text-[oklch(0.92_0.005_286)]">
              {bug.stackTrace}
            </pre>
          </Section>

          <Section title="Suspected cause">
            <div className="flex items-start gap-2 rounded-lg border p-4 text-sm">
              <SparklesIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="flex flex-col gap-1">
                <p>{bug.suspectedCause}</p>
                <p className="text-muted-foreground text-xs">
                  Inferred by ShipSafe from the diff and the failure evidence. Treat it as a
                  starting point and confirm it before acting.
                </p>
              </div>
            </div>
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Commit</dt>
              <dd className="flex items-center gap-1">
                <CommitSha sha={bug.commitSha} />
                <CopyButton value={bug.commitSha} label="Copy commit SHA" className="size-6" />
              </dd>
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="truncate font-mono">{run.branch}</dd>
              <dt className="text-muted-foreground">Run</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Link href={`/app/shipsafe/runs/${run.id}`} className="font-mono hover:underline">
                  {run.id}
                </Link>
                <RunStatusBadge status={run.status} />
              </dd>
              <dt className="text-muted-foreground">Pull request</dt>
              <dd className="min-w-0">
                {pullRequest ? (
                  <Link
                    href={`/app/pull-requests/${pullRequest.id}`}
                    className="line-clamp-2 hover:underline"
                  >
                    #{pullRequest.number} {pullRequest.title}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Not linked</span>
                )}
              </dd>
              <dt className="text-muted-foreground">Environment</dt>
              <dd className="min-w-0 truncate">
                {run.environment.name}
                {run.environment.url ? ` · ${run.environment.url}` : ""}
              </dd>
              <dt className="text-muted-foreground">Found</dt>
              <dd>{formatDateTime(bug.createdAt)}</dd>
            </dl>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/app/shipsafe/runs/${run.id}`}>
                Open the run <ArrowRightIcon />
              </Link>
            </Button>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold">Fix task</h2>
            {task ? (
              <Link
                href={`/app/devpilot/tasks/${task.id}`}
                className="hover:bg-accent/50 flex flex-col gap-1.5 rounded-md border p-2.5"
              >
                <span className="text-sm font-medium">{task.title}</span>
                <span className="flex items-center gap-2">
                  <TaskStatusBadge status={task.status} />
                  <span className="text-muted-foreground font-mono text-xs">{task.branch}</span>
                  <ArrowRightIcon className="text-muted-foreground ml-auto size-3.5" aria-hidden />
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground text-xs">
                No fix task yet. Creating one hands this bug to a DevPilot agent with the commit,
                failing test, error and suspected cause. The agent works in an isolated workspace
                and pushes to the PR branch; ShipSafe then retests.
              </p>
            )}
            <p className="text-muted-foreground text-[11px]">
              Limit: {maxRetries} fix attempts per bug (workspace policy).
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
