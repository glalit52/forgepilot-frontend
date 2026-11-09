"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, MessageSquareWarningIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApprovalDecision } from "@/lib/api/hooks";
import { canClientDecide } from "@/lib/domain/workflow";
import type { TaskDetail } from "@/lib/schemas";
import { ApproveDialog, RequestChangesDialog, type ApprovalSubject } from "./approval-dialogs";
import { ReadOnlyNote } from "./portal-utils";

/** Approve / Request changes for a task in `pr_open`. Hidden for viewers (read-only note instead). */
export function TaskDecision({ detail, canApprove }: { detail: TaskDetail; canApprove: boolean }) {
  const t = detail.task;
  const decide = useApprovalDecision(t.id);
  const [dialog, setDialog] = useState<"approve" | "changes" | null>(null);

  if (!canClientDecide(t.state)) return null;
  if (!canApprove)
    return (
      <ReadOnlyNote>
        Read-only access — an approver or admin on your team approves this change.
      </ReadOnlyNote>
    );

  const verified = t.latestVerification?.status === "passed";
  const signedOff = !!detail.signOff;
  const ready = verified && signedOff;
  const subject: ApprovalSubject = {
    title: t.title,
    prNumber: t.pullRequest?.number ?? null,
    verification: t.latestVerification,
    signOff: detail.signOff,
    aiAuthoredPct: t.aiAuthoredPct,
  };
  const pr = t.pullRequest ? `PR #${t.pullRequest.number}` : "the change";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog("approve")} disabled={!ready || decide.isPending}>
          <CheckCircle2Icon aria-hidden /> Approve
        </Button>
        <Button variant="outline" onClick={() => setDialog("changes")} disabled={decide.isPending}>
          <MessageSquareWarningIcon aria-hidden /> Request changes
        </Button>
      </div>
      {!ready && (
        <p className="text-warning-foreground text-xs">
          {!verified
            ? "Approval unlocks once verification passes."
            : "Approval unlocks once a ForgePilot engineer signs off."}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Approving does not merge anything automatically: {pr} merges in your repository under your
        branch rules.
      </p>
      <ApproveDialog
        open={dialog === "approve"}
        onOpenChange={(o) => setDialog(o ? "approve" : null)}
        subject={subject}
        pending={decide.isPending}
        onConfirm={() =>
          decide.mutate(
            { decision: "approved", comment: "" },
            {
              onSuccess: () => {
                setDialog(null);
                toast.success(`Approved ${pr}`, {
                  description:
                    "Recorded in the evidence trail. It merges in your repository under your branch rules.",
                });
              },
              onError: (err) => toast.error("Could not approve", { description: err.message }),
            },
          )
        }
      />
      <RequestChangesDialog
        open={dialog === "changes"}
        onOpenChange={(o) => setDialog(o ? "changes" : null)}
        subject={subject}
        pending={decide.isPending}
        onSubmit={(comment) =>
          decide.mutate(
            { decision: "changes_requested", comment },
            {
              onSuccess: () => {
                setDialog(null);
                toast.success("Changes requested", {
                  description: "The ForgePilot engineer has your comment.",
                });
              },
              onError: (err) =>
                toast.error("Could not send your request", { description: err.message }),
            },
          )
        }
      />
    </div>
  );
}
