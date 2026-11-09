"use client";
import { forwardRef, useId, useState } from "react";
import {
  AlertOctagonIcon,
  ArchiveIcon,
  GitPullRequestIcon,
  HandIcon,
  RefreshCwIcon,
  RocketIcon,
  ShieldCheckIcon,
  SquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { TaskAction, TaskActionInput, TaskState, VerificationRun } from "@/lib/schemas";
import { checkAction } from "@/lib/domain/workflow";
import { cn } from "@/lib/utils";
import { ActionButton } from "../action-button";

/** Friendlier copy for "wrong state" reasons; product-rule reasons come straight from checkAction. */
function stateHint(action: TaskAction, state: TaskState): string | undefined {
  const after = (s: TaskState[]) => s.includes(state);
  switch (action) {
    case "launch":
      if (after(["created", "planned"])) return "Approve the plan before launching an agent.";
      if (after(["running", "verifying"])) return "An agent run is already in progress.";
      if (after(["retrying", "escalated", "awaiting_review", "rejected", "failed"]))
        return "Use Retry with notes to start another attempt.";
      return "This task is past the agent stage.";
    case "stop":
      return state === "verifying"
        ? "Verification is running; it can't be stopped."
        : "Only a running agent can be stopped.";
    case "retry":
      return "Available after a failed verification, an escalation, a review or a client change request.";
    case "take_over":
      return "Available once the plan is approved and before review.";
    case "sign_off":
      if (after(["signed_off", "pr_open", "client_approved", "merged", "closed"]))
        return "Already signed off.";
      return "Available when the task is awaiting review and verification has passed.";
    case "open_pr":
      if (after(["pr_open", "client_approved", "merged", "closed"]))
        return "The pull request is already open.";
      return "Sign off the change first.";
    case "escalate":
      return "Only work in progress can be escalated.";
    case "close":
      return "Only merged, failed or rejected tasks can be closed.";
    default:
      return undefined;
  }
}

export function actionReasons(state: TaskState, latestVerification: VerificationRun | null) {
  return (action: TaskAction, reviewedDiff?: boolean): string | undefined => {
    const c = checkAction(action, { state, latestVerification, reviewedDiff });
    if (c.allowed) return undefined;
    const stateOk = checkAction(action, {
      state,
      latestVerification: { status: "passed" },
      reviewedDiff: true,
    }).allowed;
    return stateOk ? c.reason : (stateHint(action, state) ?? c.reason);
  };
}

function NotesDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  required,
  pending,
  extra,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  label: string;
  placeholder: string;
  confirmLabel: string;
  required?: boolean;
  pending: boolean;
  extra?: React.ReactNode;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const id = useId();
  const tooShort = required && notes.trim().length < 3;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setNotes("");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (tooShort) return;
            onConfirm(notes.trim());
            setNotes("");
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground text-sm">{description}</div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>
              {label}
              {!required && <span className="text-muted-foreground font-normal">(optional)</span>}
            </Label>
            <Textarea
              id={id}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={placeholder}
              aria-invalid={(tooShort && notes.length > 0) || undefined}
              required={required}
            />
          </div>
          {extra}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || tooShort}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Run = (input: TaskActionInput) => void;

/**
 * Every engineer action, each enabled only in valid states (lib/domain/workflow).
 * There is deliberately no merge action: merge happens in the client's Git.
 */
export const ActionBar = forwardRef<
  HTMLButtonElement,
  {
    state: TaskState;
    latestVerification: VerificationRun | null;
    pending: TaskAction | null;
    highlightLaunch: boolean;
    agentName: string;
    onRun: Run;
  }
>(function ActionBar(
  { state, latestVerification, pending, highlightLaunch, agentName, onRun },
  launchRef,
) {
  const reasonFor = actionReasons(state, latestVerification);
  const [simulateFailure, setSimulateFailure] = useState(false);
  // Tied to the verification it was ticked for, so a new attempt needs a fresh review.
  const [reviewedFor, setReviewedFor] = useState<string | null>(null);
  const reviewedDiff = !!latestVerification && reviewedFor === latestVerification.id;
  const [dialog, setDialog] = useState<null | "retry" | "take_over" | "escalate">(null);
  const [retryFail, setRetryFail] = useState(false);
  const simId = useId();
  const retrySimId = useId();
  const reviewId = useId();
  const busy = pending !== null;
  const canReview = state === "awaiting_review" && latestVerification?.status === "passed";

  const close = () => setDialog(null);
  const run: Run = (input) => {
    onRun(input);
    close();
  };

  return (
    <section
      aria-label="Task actions"
      className="bg-background/95 sticky top-14 z-30 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 shadow-xs backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          ref={launchRef}
          size="sm"
          disabledReason={reasonFor("launch")}
          disabled={busy}
          onClick={() => {
            onRun({ action: "launch", simulateFailure });
            setSimulateFailure(false);
          }}
          className={cn(
            highlightLaunch &&
              !reasonFor("launch") &&
              "ring-primary/50 ring-offset-background ring-[3px] ring-offset-2",
          )}
        >
          <RocketIcon /> {pending === "launch" ? "Launching…" : "Launch agent"}
        </ActionButton>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={simId}
            checked={simulateFailure}
            onCheckedChange={(v) => setSimulateFailure(v === true)}
            disabled={!!reasonFor("launch")}
          />
          <Label htmlFor={simId} className="text-muted-foreground text-xs font-normal">
            Simulate verification failure (demo)
          </Label>
        </div>
        <ActionButton
          variant="outline"
          size="sm"
          disabledReason={reasonFor("stop")}
          disabled={busy}
          onClick={() => onRun({ action: "stop" })}
        >
          <SquareIcon /> Stop
        </ActionButton>
        <ActionButton
          variant="outline"
          size="sm"
          disabledReason={reasonFor("retry")}
          disabled={busy}
          onClick={() => setDialog("retry")}
        >
          <RefreshCwIcon /> Retry with notes
        </ActionButton>
        <ActionButton
          variant="outline"
          size="sm"
          disabledReason={reasonFor("take_over")}
          disabled={busy}
          onClick={() => setDialog("take_over")}
        >
          <HandIcon /> Take over manually
        </ActionButton>
        <ActionButton
          variant="ghost"
          size="sm"
          disabledReason={reasonFor("escalate")}
          disabled={busy}
          onClick={() => setDialog("escalate")}
        >
          <AlertOctagonIcon /> Escalate
        </ActionButton>
      </div>

      <div className="bg-border hidden h-6 w-px xl:block" aria-hidden />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={reviewId}
            checked={reviewedDiff}
            disabled={!canReview}
            onCheckedChange={(v) =>
              setReviewedFor(v === true && latestVerification ? latestVerification.id : null)
            }
          />
          <Label htmlFor={reviewId} className="text-xs">
            I reviewed the diff
          </Label>
        </div>
        <ActionButton
          size="sm"
          disabledReason={reasonFor("sign_off", reviewedDiff)}
          disabled={busy}
          onClick={() => onRun({ action: "sign_off", reviewedDiff: true })}
        >
          <ShieldCheckIcon /> Sign off
        </ActionButton>
        <ActionButton
          size="sm"
          variant="outline"
          disabledReason={reasonFor("open_pr")}
          disabled={busy}
          onClick={() => onRun({ action: "open_pr" })}
        >
          <GitPullRequestIcon /> Open PR
        </ActionButton>
        {!reasonFor("close") && (
          <ActionButton
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onRun({ action: "close" })}
          >
            <ArchiveIcon /> Close task
          </ActionButton>
        )}
      </div>

      <NotesDialog
        open={dialog === "retry"}
        onOpenChange={(o) => !o && close()}
        title="Retry with notes"
        description={`${agentName} starts a new attempt with your notes added to its instructions. The new attempt goes through verification again.`}
        label="Notes for the agent"
        placeholder="e.g. Keep the public API unchanged; the contract test failed on the v1 response schema."
        confirmLabel="Start retry"
        pending={pending === "retry"}
        extra={
          <div className="flex items-center gap-2">
            <Checkbox
              id={retrySimId}
              checked={retryFail}
              onCheckedChange={(v) => setRetryFail(v === true)}
            />
            <Label htmlFor={retrySimId} className="text-muted-foreground text-xs font-normal">
              Simulate verification failure (demo)
            </Label>
          </div>
        }
        onConfirm={(notes) => {
          run({ action: "retry", notes: notes || undefined, simulateFailure: retryFail });
          setRetryFail(false);
        }}
      />
      <NotesDialog
        open={dialog === "take_over"}
        onOpenChange={(o) => !o && close()}
        title="Take over manually?"
        description={
          <ul className="list-disc space-y-1 pl-4">
            <li>Any running agent attempt is stopped.</li>
            <li>
              The change is marked as human-authored, with you as the actor in the evidence trail.
            </li>
            <li>It still goes through the full verification gate before anyone can sign off.</li>
          </ul>
        }
        label="What are you changing?"
        placeholder="e.g. Rewriting the retry logic by hand; the agent keeps changing the public API."
        confirmLabel="Take over"
        pending={pending === "take_over"}
        onConfirm={(notes) => run({ action: "take_over", notes: notes || undefined })}
      />
      <NotesDialog
        open={dialog === "escalate"}
        onOpenChange={(o) => !o && close()}
        title="Escalate this task"
        description="Flags the task for hands-on engineering attention and notifies the delivery manager. The reason is recorded in the evidence trail."
        label="Reason"
        placeholder="e.g. Needs a schema migration the agent can't run in the sandbox."
        confirmLabel="Escalate task"
        required
        pending={pending === "escalate"}
        onConfirm={(notes) => run({ action: "escalate", notes })}
      />
    </section>
  );
});
