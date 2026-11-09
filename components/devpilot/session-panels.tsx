"use client";
import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BoxIcon,
  HandIcon,
  KeyRoundIcon,
  NetworkIcon,
  ShieldAlertIcon,
  SquareIcon,
  TimerIcon,
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CommitSha } from "@/components/shared/misc";
import { ToneBadge } from "@/components/shared/status-badge";
import { useAnswerSession, useCancelSession } from "@/lib/api/hooks";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/domain/format";
import {
  SessionInputSchema,
  type Approval,
  type SessionDetail,
  type Workspace,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { MetaList, ReasonTip } from "./bits";
import { formatCost, formatTokens } from "./utils";

export const NETWORK_LABEL: Record<Workspace["networkPolicy"], string> = {
  none: "No network",
  allowlist: "Allowlisted hosts only",
  open: "Open egress",
};
export const WORKSPACE_STATE_TONE = {
  provisioning: "info",
  active: "accent",
  cleaned: "neutral",
} as const;
export const WORKSPACE_STATE_LABEL: Record<Workspace["state"], string> = {
  provisioning: "Provisioning",
  active: "Active",
  cleaned: "Cleaned up",
};

export function WorkspacePanel({ workspace }: { workspace: Workspace | null }) {
  if (!workspace)
    return (
      <Card className="p-4 text-sm">
        <h2 className="mb-1 font-semibold">Workspace</h2>
        <p className="text-muted-foreground text-xs">No workspace was recorded for this session.</p>
      </Card>
    );
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <BoxIcon className="text-muted-foreground size-4" aria-hidden /> Workspace
        </h2>
        <ToneBadge
          tone={WORKSPACE_STATE_TONE[workspace.state]}
          pulse={workspace.state === "active"}
        >
          {WORKSPACE_STATE_LABEL[workspace.state]}
        </ToneBadge>
      </div>
      <MetaList
        items={[
          { label: "Id", value: <span className="font-mono text-xs">{workspace.id}</span> },
          { label: "Image", value: <span className="font-mono text-xs">{workspace.image}</span> },
          {
            label: "Runtime",
            value: workspace.runtime === "container" ? "Isolated container" : "Git worktree",
          },
          {
            label: "Resources",
            value: `${workspace.cpu} vCPU · ${workspace.memoryGb} GB RAM · ${workspace.diskGb} GB disk`,
          },
          {
            label: "Network",
            value: (
              <span className="inline-flex items-center gap-1">
                <NetworkIcon className="text-muted-foreground size-3.5" aria-hidden />{" "}
                {NETWORK_LABEL[workspace.networkPolicy]}
              </span>
            ),
          },
          {
            label: "Credentials",
            value: (
              <span className="inline-flex items-start gap-1">
                <KeyRoundIcon
                  className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                  aria-hidden
                />{" "}
                {workspace.credentials}
              </span>
            ),
          },
          { label: "Base commit", value: <CommitSha sha={workspace.baseSha} /> },
          {
            label: "Branch",
            value: <span className="font-mono text-xs break-all">{workspace.branch}</span>,
          },
          {
            label: workspace.state === "cleaned" ? "Cleaned" : "Cleanup",
            value: (
              <time
                dateTime={workspace.cleanupAt}
                title={formatDateTime(workspace.cleanupAt)}
                suppressHydrationWarning
              >
                {workspace.state === "cleaned"
                  ? "Removed after completion"
                  : formatRelative(workspace.cleanupAt)}
              </time>
            ),
          },
        ]}
      />
      <p className="text-muted-foreground text-xs">
        No production secrets are mounted. Credentials are scoped to this repository and expire on
        their own.
      </p>
    </Card>
  );
}

function Meter({
  label,
  value,
  max,
  display,
  warnAt = 0.8,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  warnAt?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tone = pct >= 100 ? "bg-danger" : pct >= warnAt * 100 ? "bg-warning" : "bg-primary";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{display}</span>
      </div>
      <Progress value={pct} indicatorClassName={tone} aria-label={`${label}: ${display}`} />
    </div>
  );
}

export function UsagePanel({ detail, elapsedSec }: { detail: SessionDetail; elapsedSec: number }) {
  const { session, task } = detail;
  const timeoutSec = task.timeoutMin * 60;
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <TimerIcon className="text-muted-foreground size-4" aria-hidden /> Usage
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-md border p-2.5">
          <dt className="text-muted-foreground text-xs">Tokens in</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatTokens(session.tokensIn)}</dd>
        </div>
        <div className="rounded-md border p-2.5">
          <dt className="text-muted-foreground text-xs">Tokens out</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatTokens(session.tokensOut)}</dd>
        </div>
      </dl>
      <Meter
        label="Cost vs task budget"
        value={session.costUsd}
        max={task.budgetUsd}
        display={`${formatCost(session.costUsd)} of ${formatCost(task.budgetUsd)}`}
      />
      <Meter
        label="Duration vs timeout"
        value={elapsedSec}
        max={timeoutSec}
        display={`${formatDuration(elapsedSec)} of ${task.timeoutMin} min`}
      />
      <p className="text-muted-foreground text-xs">
        The session stops on its own if it hits the budget ceiling or the timeout.
      </p>
    </Card>
  );
}

export function ApprovalBanner({ approvals }: { approvals: Approval[] }) {
  const pending = approvals.filter((a) => a.status === "pending");
  return (
    <div
      role="alert"
      className="border-warning/50 bg-warning-soft text-warning-foreground flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <ShieldAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">The agent is paused, waiting for approval</p>
          <p className="text-sm">
            {pending[0]?.title ?? "It tried a protected action."} Nothing runs until someone with
            the right role approves or rejects it.
          </p>
        </div>
      </div>
      <Button asChild className="shrink-0">
        <Link href="/app/approvals">
          Review in approvals <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}

export function ClarificationForm({
  sessionId,
  question,
  canAnswer,
}: {
  sessionId: string;
  question: string;
  canAnswer: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useAnswerSession();
  const id = useId();
  return (
    <form
      className="border-warning/50 bg-warning-soft/50 flex flex-col gap-3 rounded-lg border p-4"
      aria-label="Answer the agent"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = SessionInputSchema.safeParse({ answer });
        if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Type an answer");
        setError(null);
        mutation.mutate(
          { id: sessionId, answer: parsed.data.answer },
          {
            onSuccess: () => {
              setAnswer("");
              toast.success("Answer sent", {
                description: "The agent picked up where it left off.",
              });
            },
            onError: (err) => toast.error("Couldn't send the answer", { description: err.message }),
          },
        );
      }}
    >
      <div className="text-warning-foreground flex items-start gap-3">
        <HandIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">The agent needs an answer to continue</p>
          <p className="text-sm">{question}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>Your answer</Label>
        <Textarea
          id={id}
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!canAnswer}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="bg-background"
        />
        {error && (
          <p id={`${id}-err`} role="alert" className="text-danger-foreground text-xs">
            {error}
          </p>
        )}
      </div>
      <ReasonTip
        reason={
          canAnswer
            ? undefined
            : "Viewers can't answer agents. Ask a workspace admin for Member access."
        }
        className="w-fit"
      >
        <Button type="submit" disabled={!canAnswer || mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send answer"}
        </Button>
      </ReasonTip>
    </form>
  );
}

export function CancelSessionButton({
  sessionId,
  active,
  allowed,
}: {
  sessionId: string;
  active: boolean;
  allowed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCancelSession();
  const reason = !allowed
    ? "Viewers can't stop agents. Ask a workspace admin for Member access."
    : !active
      ? "This session has already ended."
      : undefined;
  return (
    <>
      <ReasonTip reason={reason}>
        <Button
          variant="outline"
          disabled={!!reason}
          onClick={() => setOpen(true)}
          className={cn(!reason && "text-danger-foreground")}
        >
          <SquareIcon /> Cancel session
        </Button>
      </ReasonTip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this session?</DialogTitle>
            <DialogDescription>
              The agent&apos;s worker is terminated and its workspace is cleaned up. Changes it
              hasn&apos;t pushed are discarded. You can retry the task later with notes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep running
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(sessionId, {
                  onSuccess: () => {
                    setOpen(false);
                    toast.success("Session cancelled", {
                      description: "The worker was terminated and the workspace cleaned up.",
                    });
                  },
                  onError: (e) =>
                    toast.error("Couldn't cancel the session", { description: e.message }),
                })
              }
            >
              {mutation.isPending ? "Cancelling…" : "Cancel session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
