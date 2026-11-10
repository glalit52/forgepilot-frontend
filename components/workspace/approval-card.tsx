"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  FileLockIcon,
  GlobeIcon,
  KeyRoundIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRow } from "@/lib/api/hooks";
import { useDecideApproval } from "@/lib/api/hooks";
import { ApprovalDecisionInputSchema, type Role } from "@/lib/schemas";
import { APPROVAL_ACTION_LABEL } from "@/lib/domain/labels";
import { can, meetsRole, ROLE_LABEL } from "@/lib/domain/permissions";
import { formatDateTime, formatUsd } from "@/lib/domain/format";
import { Badge } from "@/components/ui/badge";
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
import { ActorChip } from "@/components/shared/actor-chip";
import { ToneBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { ExpiryCountdown } from "./countdown";
import { GatedButton } from "./gated-button";
import { RelativeTime } from "./relative-time";

const ACTION_ICON: Partial<
  Record<ApprovalRow["action"], React.ComponentType<{ className?: string }>>
> = {
  modify_protected_path: FileLockIcon,
  access_secret: KeyRoundIcon,
  network_egress: GlobeIcon,
  budget_increase: WalletIcon,
  run_migration: TerminalSquareIcon,
};

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);

/** What exactly is being approved. Approvals are bound to this context (PRD §10.2). */
function ContextDetails({ a }: { a: ApprovalRow }) {
  const c = a.context;
  const path = str(c.path);
  const diff = str(c.diffPreview);
  const host = str(c.host);
  const secret = str(c.secret);
  const env = str(c.environment);
  const reason = str(c.reason);
  const from = num(c.currentUsd);
  const to = num(c.requestedUsd);
  const headSha = str(c.headSha);
  const rows: [string, React.ReactNode][] = [];
  if (path)
    rows.push([
      "Path",
      <code key="p" className="font-mono text-xs break-all">
        {path}
      </code>,
    ]);
  if (host)
    rows.push([
      "Host",
      <code key="h" className="font-mono text-xs break-all">
        {host}
      </code>,
    ]);
  if (secret)
    rows.push([
      "Secret",
      <code key="s" className="font-mono text-xs">
        {secret}
      </code>,
    ]);
  if (env) rows.push(["Environment", env]);
  if (from !== null && to !== null)
    rows.push([
      "Monthly budget",
      <span key="b" className="tabular-nums">
        {formatUsd(from)} → <span className="font-semibold">{formatUsd(to)}</span>
        <span className="text-muted-foreground"> (+{formatUsd(to - from)})</span>
      </span>,
    ]);
  if (headSha)
    rows.push([
      "Commit",
      <code key="c" className="font-mono text-xs">
        {headSha.slice(0, 7)}
      </code>,
    ]);
  if (reason) rows.push(["Reason", reason]);
  if (!rows.length && !diff) return null;
  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground text-xs leading-5">{k}</dt>
              <dd className="min-w-0">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {diff && (
        <pre
          className="bg-muted max-h-48 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
          aria-label="Proposed change"
        >
          {diff.split("\n").map((line, i) => (
            <span
              key={i}
              className={cn(
                "block",
                line.startsWith("+") && "text-success-foreground",
                line.startsWith("-") && "text-danger-foreground",
              )}
            >
              {line}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}

export function blockedReason(a: ApprovalRow, role: Role | undefined, userId: string | undefined) {
  if (a.status === "pending" && Date.parse(a.expiresAt) <= Date.now())
    return "This request expired. The requester has to ask again.";
  if (a.canDecide) return null;
  if (a.status !== "pending") return "Already decided.";
  if (a.requestedBy.type === "person" && a.requestedBy.id === userId)
    return "You can't approve your own request. Another admin or owner must decide.";
  if (!meetsRole(role, a.approverRole) || !can(role, "approval.decide"))
    return `Needs ${ROLE_LABEL[a.approverRole].toLowerCase()} or above. You're ${role ? ROLE_LABEL[role].toLowerCase() : "signed out"}.`;
  return "You can't decide this request.";
}

export function ApprovalCard({
  a,
  role,
  userId,
  nameOf,
}: {
  a: ApprovalRow;
  role: Role | undefined;
  userId: string | undefined;
  nameOf: (id: string | null) => string | null;
}) {
  const router = useRouter();
  const decide = useDecideApproval();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const Icon = ACTION_ICON[a.action] ?? ShieldCheckIcon;
  const reason = blockedReason(a, role, userId);
  const sessionId = a.requestedBy.sessionId ?? str(a.context.sessionId);
  const taskId = str(a.context.taskId);
  const pending = a.status === "pending";

  const open = (kind: "approve" | "reject") => {
    setComment("");
    setError(null);
    setDialog(kind);
  };

  const submit = () => {
    const parsed = ApprovalDecisionInputSchema.safeParse({
      decision: dialog === "approve" ? "approved" : "rejected",
      comment,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the comment");
      return;
    }
    decide.mutate(
      { id: a.id, ...parsed.data },
      {
        onSuccess: () => {
          setDialog(null);
          if (parsed.data.decision === "approved") {
            toast.success("Approved", {
              description:
                sessionId && a.requestedBy.type === "agent"
                  ? "The agent is resuming its session now."
                  : "The requested change is now allowed.",
              action: sessionId
                ? {
                    label: "View session",
                    onClick: () => router.push(`/app/devpilot/sessions/${sessionId}`),
                  }
                : undefined,
            });
          } else {
            toast.success("Rejected", {
              description: sessionId
                ? "The agent was stopped and your reason was recorded."
                : "Your reason was recorded in the audit log.",
            });
          }
        },
        onError: (e) => toast.error("Couldn't record the decision", { description: e.message }),
      },
    );
  };

  return (
    <Card
      className="flex flex-col gap-4 p-4 sm:p-5"
      data-testid="approval-card"
      aria-labelledby={`apr-${a.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="bg-warning-soft text-warning-foreground flex size-9 shrink-0 items-center justify-center rounded-md"
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">
              {APPROVAL_ACTION_LABEL[a.action]}
            </span>
            <h3 id={`apr-${a.id}`} className="font-semibold break-words">
              {a.title}
            </h3>
          </div>
        </div>
        {pending ? (
          <ExpiryCountdown expiresAt={a.expiresAt} />
        ) : (
          <ToneBadge
            tone={
              a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "neutral"
            }
          >
            {a.status === "approved"
              ? "Approved"
              : a.status === "rejected"
                ? "Rejected"
                : "Expired"}
          </ToneBadge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Requested by</span>
        <ActorChip actor={a.requesterResolved} />
        {sessionId && a.requestedBy.type === "agent" && (
          <Link
            href={`/app/devpilot/sessions/${sessionId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:underline"
          >
            <TerminalSquareIcon className="size-3.5" aria-hidden /> session
          </Link>
        )}
        <span className="text-muted-foreground">
          <RelativeTime iso={a.requestedAt} />
        </span>
      </div>

      {taskId && (
        <Link
          href={`/app/devpilot/tasks/${taskId}`}
          className="hover:bg-muted/50 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <ListChecksIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground shrink-0 text-xs">Task</span>
          <span className="truncate font-medium">{a.taskTitle ?? taskId}</span>
        </Link>
      )}

      <ContextDetails a={a} />

      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-xs">
          Needs <Badge variant="outline">{ROLE_LABEL[a.approverRole]}</Badge> or above to decide
        </span>
        {pending ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <GatedButton
              variant="outline"
              onClick={() => open("reject")}
              disabledReason={reason}
              disabled={decide.isPending}
              className="w-full sm:w-auto"
            >
              <XIcon /> Reject
            </GatedButton>
            <GatedButton
              onClick={() => open("approve")}
              disabledReason={reason}
              disabled={decide.isPending}
              className="w-full sm:w-auto"
            >
              <CheckIcon /> Approve
            </GatedButton>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">
            {a.status === "expired" ? (
              "Expired without a decision"
            ) : (
              <>
                {a.status === "approved" ? "Approved" : "Rejected"} by{" "}
                <span className="text-foreground font-medium">
                  {nameOf(a.decidedBy) ?? "a teammate"}
                </span>
                {a.decidedAt && <> · {formatDateTime(a.decidedAt)}</>}
              </>
            )}
          </span>
        )}
      </div>
      {!pending && a.comment && (
        <blockquote className="bg-muted/60 rounded-md px-3 py-2 text-sm">
          &ldquo;{a.comment}&rdquo;
        </blockquote>
      )}
      {pending && reason && <p className="text-muted-foreground text-xs sm:hidden">{reason}</p>}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "approve" ? "Approve this request?" : "Reject this request?"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "approve"
                ? `You're allowing exactly this action: ${APPROVAL_ACTION_LABEL[a.action].toLowerCase()}. It doesn't grant anything broader.`
                : "The requester sees your reason. If an agent asked, its session stops."}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-md p-3 text-sm font-medium break-words">
            {a.title}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`apr-comment-${a.id}`}>
              {dialog === "approve" ? (
                <>
                  Comment <span className="text-muted-foreground font-normal">(optional)</span>
                </>
              ) : (
                "Why are you rejecting it?"
              )}
            </Label>
            <Textarea
              id={`apr-comment-${a.id}`}
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                dialog === "approve"
                  ? "Reviewed the diff; index is created concurrently."
                  : "Use the fixture file instead of calling a live API."
              }
              aria-invalid={!!error}
              aria-describedby={error ? `apr-err-${a.id}` : undefined}
              autoFocus
            />
            {error && (
              <p id={`apr-err-${a.id}`} role="alert" className="text-danger-foreground text-xs">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog === "approve" ? "default" : "destructive"}
              onClick={submit}
              disabled={decide.isPending}
            >
              {dialog === "approve" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
