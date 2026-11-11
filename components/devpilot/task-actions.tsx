"use client";
import { useId, useState } from "react";
import { PlayIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";
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
import { usePolicy, useSession, useTaskAction } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { checkTaskAction, DEFAULT_MAX_FIX_RETRIES } from "@/lib/domain/workflow";
import type { TaskAction, TaskDetail } from "@/lib/schemas";
import { ReasonTip } from "./bits";

const SIMULATE_LABEL = "Simulate verification failure (demo)";

/** Launch / Cancel / Retry, each gated by the task state machine and the viewer's role. */
export function TaskActions({ detail }: { detail: TaskDetail }) {
  const { task, policyPreview } = detail;
  const session = useSession().data;
  const policy = usePolicy().data;
  const mutation = useTaskAction(task.id);
  const [simulate, setSimulate] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const simId = useId();

  const role = session?.role;
  const maxRetries = policy?.maxFixRetries ?? DEFAULT_MAX_FIX_RETRIES;
  const check = (action: TaskAction): { allowed: boolean; reason?: string } => {
    if (!role) return { allowed: false, reason: "Loading your permissions…" };
    if (!can(role, "task.launch"))
      return {
        allowed: false,
        reason: "Viewers can't run or stop agents. Ask a workspace admin for Member access.",
      };
    return checkTaskAction(action, {
      status: task.status,
      attempts: task.attempts,
      hasAgent: !!task.agentId,
      maxRetries,
      budgetRemainingUsd: session?.workspace.budget.hardCap
        ? policyPreview.budgetRemainingUsd
        : undefined,
    });
  };
  const launch = check("launch");
  const cancel = check("cancel");
  const retry = check("retry");
  const pending = mutation.isPending;

  const run = (
    action: TaskAction,
    extra: { notes?: string; simulateFailure?: boolean } = {},
    done?: () => void,
  ) =>
    mutation.mutate(
      { action, ...extra },
      {
        onSuccess: () => {
          const agent = task.agent?.name ?? "The agent";
          if (action === "launch")
            toast.success(`${agent} launched`, {
              description: extra.simulateFailure
                ? "Demo: ShipSafe will report a failure so you can see the fix loop."
                : "Working in an isolated workspace. Follow along in the live log.",
            });
          if (action === "retry")
            toast.success(`Attempt ${task.attempts + 1} started`, {
              description: extra.notes
                ? "Your notes were passed to the agent."
                : "Same task, fresh workspace.",
            });
          if (action === "cancel")
            toast.success("Task cancelled", {
              description: "The worker was terminated and its workspace cleaned up.",
            });
          done?.();
        },
        onError: (e) =>
          toast.error(
            `Couldn't ${action === "launch" ? "launch the agent" : action === "retry" ? "retry" : "cancel the task"}`,
            { description: e.message },
          ),
      },
    );

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <ReasonTip reason={cancel.allowed ? undefined : cancel.reason}>
          <Button
            variant="outline"
            disabled={!cancel.allowed || pending}
            onClick={() => run("cancel")}
          >
            <SquareIcon /> Cancel
          </Button>
        </ReasonTip>
        <ReasonTip reason={retry.allowed ? undefined : retry.reason}>
          <Button
            variant="outline"
            disabled={!retry.allowed || pending}
            onClick={() => setRetryOpen(true)}
          >
            <RotateCcwIcon /> Retry with notes
          </Button>
        </ReasonTip>
        <ReasonTip reason={launch.allowed ? undefined : launch.reason}>
          <Button
            disabled={!launch.allowed || pending}
            onClick={() => run("launch", { simulateFailure: simulate })}
          >
            <PlayIcon />{" "}
            {pending && mutation.variables?.action === "launch" ? "Launching…" : "Launch agent"}
          </Button>
        </ReasonTip>
      </div>
      {launch.allowed && (
        <label htmlFor={simId} className="text-muted-foreground flex items-center gap-2 text-xs">
          <Checkbox
            id={simId}
            checked={simulate}
            onCheckedChange={(v) => setSimulate(v === true)}
          />
          {SIMULATE_LABEL}
        </label>
      )}
      <RetryDialog
        open={retryOpen}
        onOpenChange={setRetryOpen}
        attempt={task.attempts + 1}
        maxAttempts={maxRetries + 1}
        pending={pending}
        onSubmit={(notes, simulateFailure) =>
          run("retry", { notes: notes || undefined, simulateFailure }, () => setRetryOpen(false))
        }
      />
    </div>
  );
}

function RetryDialog({
  open,
  onOpenChange,
  attempt,
  maxAttempts,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  attempt: number;
  maxAttempts: number;
  pending: boolean;
  onSubmit: (notes: string, simulateFailure: boolean) => void;
}) {
  const [notes, setNotes] = useState("");
  const [simulate, setSimulate] = useState(false);
  const notesId = useId();
  const simId = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setNotes("");
          setSimulate(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retry with notes</DialogTitle>
          <DialogDescription>
            Attempt {attempt} of {maxAttempts}. The agent starts in a fresh workspace from the same
            base commit, with your notes added to its instructions.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(notes.trim(), simulate);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>Notes for the agent</Label>
            <Textarea
              id={notesId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Await the save request before updating local state, and cover reload in the e2e test."
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Optional, but specific notes make the next attempt far more likely to pass.
            </p>
          </div>
          <label htmlFor={simId} className="text-muted-foreground flex items-center gap-2 text-xs">
            <Checkbox
              id={simId}
              checked={simulate}
              onCheckedChange={(v) => setSimulate(v === true)}
            />
            {SIMULATE_LABEL}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Keep as is
            </Button>
            <Button type="submit" disabled={pending}>
              <RotateCcwIcon /> {pending ? "Starting…" : "Start attempt " + attempt}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
