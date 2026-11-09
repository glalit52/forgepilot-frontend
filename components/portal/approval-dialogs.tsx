"use client";
import { useState } from "react";
import {
  CheckCircle2Icon,
  Loader2Icon,
  ShieldAlertIcon,
  StampIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { ApprovalInputSchema, type VerificationRun } from "@/lib/schemas";
import { formatDateTime } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export interface ApprovalSubject {
  title: string;
  prNumber: number | null;
  verification: Pick<VerificationRun, "testsPassed" | "testsRun" | "status" | "riskScore"> | null;
  signOff: { by: string; at: string } | null;
  aiAuthoredPct: number;
  highRisk?: boolean;
}

function riskWord(score: number) {
  return score >= 60 ? "High" : score >= 35 ? "Medium" : "Low";
}

/** What the approver is confirming: tests, sign-off, risk. */
function ApprovalFacts({ subject }: { subject: ApprovalSubject }) {
  const v = subject.verification;
  const passed = v?.status === "passed";
  return (
    <ul className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <li className="flex items-start gap-2">
        {passed ? (
          <CheckCircle2Icon
            className="text-success-foreground mt-0.5 size-4 shrink-0"
            aria-hidden
          />
        ) : (
          <XCircleIcon className="text-danger-foreground mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <span>
          {v ? (
            <>
              <span className="font-medium tabular-nums">
                Tests passed ({v.testsPassed}/{v.testsRun})
              </span>
              {!passed && (
                <span className="text-danger-foreground"> — verification did not pass</span>
              )}
            </>
          ) : (
            "No verification run recorded"
          )}
        </span>
      </li>
      <li className="flex items-start gap-2">
        <StampIcon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            subject.signOff ? "text-success-foreground" : "text-danger-foreground",
          )}
          aria-hidden
        />
        <span>
          {subject.signOff ? (
            <>
              <span className="font-medium">Signed off by {subject.signOff.by}</span>
              <span className="text-muted-foreground"> · {formatDateTime(subject.signOff.at)}</span>
            </>
          ) : (
            "No engineer sign-off recorded"
          )}
        </span>
      </li>
      {v && (
        <li className="flex items-start gap-2">
          <ShieldAlertIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              v.riskScore >= 60
                ? "text-danger-foreground"
                : v.riskScore >= 35
                  ? "text-warning-foreground"
                  : "text-success-foreground",
            )}
            aria-hidden
          />
          <span>
            <span className="font-medium tabular-nums">
              Risk score {v.riskScore} ({riskWord(v.riskScore)})
            </span>
            {subject.highRisk && (
              <span className="text-warning-foreground">
                {" "}
                · flagged high-risk — review carefully
              </span>
            )}
          </span>
        </li>
      )}
      <li className="flex items-center gap-2">
        <AiCodeFlag pct={subject.aiAuthoredPct} />
      </li>
    </ul>
  );
}

/** Confirm dialog for approving a PR. The confirm button text is "Confirm approval". */
export function ApproveDialog({
  open,
  onOpenChange,
  subject,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject: ApprovalSubject | null;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {subject && (
          <>
            <DialogHeader>
              <DialogTitle>
                Approve {subject.prNumber ? `PR #${subject.prNumber}` : "this change"}?
              </DialogTitle>
              <DialogDescription>{subject.title}</DialogDescription>
            </DialogHeader>
            <ApprovalFacts subject={subject} />
            <p className="text-muted-foreground text-xs">
              Approving records your decision in the evidence trail. ForgePilot does not merge for
              you — the PR merges in your repository under your branch rules.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={pending}>
                {pending ? (
                  <Loader2Icon className="animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2Icon aria-hidden />
                )}
                Confirm approval
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Request-changes dialog; the comment is validated with ApprovalInputSchema (≥5 chars). */
export function RequestChangesDialog({
  open,
  onOpenChange,
  subject,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject: Pick<ApprovalSubject, "title" | "prNumber"> | null;
  pending: boolean;
  onSubmit: (comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  // Start each opening with an empty form.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setComment("");
      setError(null);
    }
  }
  const change = onOpenChange;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ApprovalInputSchema.safeParse({ decision: "changes_requested", comment });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Add a comment");
      return;
    }
    setError(null);
    onSubmit(parsed.data.comment);
  };

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        {subject && (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                Request changes{subject.prNumber ? ` on PR #${subject.prNumber}` : ""}
              </DialogTitle>
              <DialogDescription>{subject.title}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rc-comment">What should the engineer change?</Label>
              <Textarea
                id="rc-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Keep the old endpoint until the mobile app ships 4.2"
                aria-invalid={!!error}
                aria-describedby={error ? "rc-comment-err" : "rc-comment-hint"}
                autoFocus
              />
              {error ? (
                <p id="rc-comment-err" className="text-danger-foreground text-xs" role="alert">
                  {error}
                </p>
              ) : (
                <p id="rc-comment-hint" className="text-muted-foreground text-xs">
                  Your comment goes to the ForgePilot engineer and is recorded in the evidence
                  trail.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => change(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="secondary" disabled={pending}>
                {pending && <Loader2Icon className="animate-spin" aria-hidden />}
                Request changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
