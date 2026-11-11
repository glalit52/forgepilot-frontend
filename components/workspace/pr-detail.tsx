"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BugIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleIcon,
  ExternalLinkIcon,
  GitMergeIcon,
  HelpCircleIcon,
  Loader2Icon,
  MessageSquareIcon,
  RotateCcwIcon,
  ThumbsUpIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Bug, PolicyCheck, PullRequestDetail, Role } from "@/lib/schemas";
import { useBug, useBugAction, useReviewPullRequest, useSimulateMerge } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { formatDateTime } from "@/lib/domain/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CommitSha } from "@/components/shared/misc";
import {
  RunStatusBadge,
  SeverityBadge,
  TaskStatusBadge,
  ToneBadge,
} from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { GatedButton } from "./gated-button";
import { REVIEW_STATE_LABEL } from "./lists";
import { RelativeTime } from "./relative-time";

// ---------------------------------------------------------------- release policy

const CHECK_ICON: Record<
  PolicyCheck["status"],
  { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }
> = {
  passed: { icon: CheckCircle2Icon, cls: "text-success-foreground", label: "Passed" },
  failed: { icon: XCircleIcon, cls: "text-danger-foreground", label: "Failed" },
  pending: { icon: CircleDashedIcon, cls: "text-warning-foreground", label: "Pending" },
  missing: { icon: HelpCircleIcon, cls: "text-muted-foreground", label: "Missing" },
};

export function ReleasePolicy({ checks }: { checks: PolicyCheck[] }) {
  const required = checks.filter((c) => c.required);
  const optional = checks.filter((c) => !c.required);
  const passed = required.filter((c) => c.status === "passed").length;
  const group = (title: string, list: PolicyCheck[]) =>
    list.length > 0 && (
      <div className="flex flex-col gap-1">
        <h3 className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {title}
        </h3>
        <ul className="flex flex-col">
          {list.map((c) => {
            const s = CHECK_ICON[c.status];
            const Icon = s.icon;
            return (
              <li key={c.name} className="flex items-start gap-2.5 py-1.5">
                <Icon className={cn("mt-0.5 size-4 shrink-0", s.cls)} aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {c.name}
                    <span className="sr-only"> — {s.label}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{c.detail}</span>
                </span>
                <span className={cn("shrink-0 text-xs font-medium", s.cls)} aria-hidden>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Release policy</CardTitle>
        <span className="text-muted-foreground text-xs tabular-nums">
          {passed}/{required.length} required passed
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {group("Required", required)}
        {group("Optional", optional)}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- merge status banner

export function MergeBanner({ d }: { d: PullRequestDetail }) {
  const pr = d.pullRequest;
  if (pr.status === "merged")
    return (
      <div
        className="border-primary/30 bg-accent/40 flex items-start gap-3 rounded-lg border p-4"
        role="status"
      >
        <GitMergeIcon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">Merged in GitHub</p>
          <p className="text-muted-foreground text-xs">
            {pr.mergedAt ? formatDateTime(pr.mergedAt) : ""} · CodeKeeper will rescan{" "}
            {d.repository.fullName} on its next scheduled scan.
          </p>
        </div>
      </div>
    );
  if (pr.status === "closed")
    return (
      <div className="bg-muted flex items-start gap-3 rounded-lg p-4 text-sm" role="status">
        <XCircleIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
        <p>This pull request was closed without merging.</p>
      </div>
    );
  if (d.mergeable)
    return (
      <div
        className="border-success/30 bg-success-soft/50 flex items-start gap-3 rounded-lg border p-4"
        role="status"
      >
        <CheckCircle2Icon className="text-success-foreground mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">Verified and approved — ready to merge in GitHub</p>
          <p className="text-muted-foreground text-xs">
            Every required check passed and a person approved it. ForgePilot never merges for you.
          </p>
        </div>
      </div>
    );
  return (
    <div
      className="border-warning/30 bg-warning-soft/40 flex items-start gap-3 rounded-lg border p-4"
      role="status"
    >
      <CircleDashedIcon className="text-warning-foreground mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">Not ready to merge</p>
        <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
          {d.mergeBlockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bugs and the fix loop

type LoopState = "done" | "current" | "failed" | "upcoming";
function LoopStep({
  state,
  title,
  children,
}: {
  state: LoopState;
  title: string;
  children?: React.ReactNode;
}) {
  const Icon =
    state === "done"
      ? CheckCircle2Icon
      : state === "current"
        ? Loader2Icon
        : state === "failed"
          ? XCircleIcon
          : CircleIcon;
  return (
    <li className="flex min-w-0 flex-1 items-start gap-2">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          state === "done" && "text-success-foreground",
          state === "current" && "text-primary animate-spin",
          state === "failed" && "text-danger-foreground",
          state === "upcoming" && "text-muted-foreground",
        )}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium">
          {title}
          <span className="sr-only"> ({state})</span>
        </span>
        <span className="text-muted-foreground text-xs">{children}</span>
      </span>
    </li>
  );
}

function BugCard({ bug, d, role }: { bug: Bug; d: PullRequestDetail; role: Role | undefined }) {
  const router = useRouter();
  const detail = useBug(bug.id);
  const action = useBugAction(bug.id);
  const fixTask = detail.data?.task ?? null;
  const live = detail.data?.bug ?? bug;
  const retest = [...d.runs]
    .filter((r) => Date.parse(r.startedAt) > Date.parse(bug.createdAt) && r.id !== bug.runId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const isOpen = live.status === "open";
  const blocked = !can(role, "bug.manage")
    ? "Viewers can't create fix tasks. Ask for the Member role."
    : d.pullRequest.status !== "open"
      ? "The pull request is no longer open."
      : null;

  const create = () =>
    action.mutate(
      { action: "create_fix_task" },
      {
        onSuccess: (res) => {
          const t = res.task;
          toast.success("Fix task created", {
            description:
              "An agent is fixing it on the PR branch. ShipSafe retests the new commit automatically.",
            action: t
              ? { label: "Open task", onClick: () => router.push(`/app/devpilot/tasks/${t.id}`) }
              : undefined,
          });
        },
        onError: (e) => toast.error("Couldn't create the fix task", { description: e.message }),
      },
    );

  const fixState: LoopState = !fixTask
    ? "upcoming"
    : fixTask.status === "failed" || fixTask.status === "cancelled"
      ? "failed"
      : ["review_ready", "completed"].includes(fixTask.status) || fixTask.status === "verifying"
        ? "done"
        : "current";
  const retestState: LoopState =
    live.status === "resolved"
      ? "done"
      : retest && (retest.status === "running" || retest.status === "queued")
        ? "current"
        : retest && retest.status === "failed"
          ? "failed"
          : fixTask?.status === "verifying"
            ? "current"
            : "upcoming";

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={live.severity} />
            <Link href={`/app/shipsafe/bugs/${bug.id}`} className="font-medium hover:underline">
              {live.title}
            </Link>
          </span>
          <span className="text-muted-foreground text-xs">
            Found on <CommitSha sha={live.commitSha} /> · <RelativeTime iso={live.createdAt} /> ·{" "}
            {live.suspectedCause}
          </span>
        </div>
        <ToneBadge
          tone={
            live.status === "open"
              ? "danger"
              : live.status === "fix_in_progress"
                ? "accent"
                : live.status === "resolved"
                  ? "success"
                  : "neutral"
          }
          pulse={live.status === "fix_in_progress"}
        >
          {live.status === "open"
            ? "Open"
            : live.status === "fix_in_progress"
              ? "Fix in progress"
              : live.status === "resolved"
                ? "Resolved"
                : "Won't fix"}
        </ToneBadge>
      </div>

      <ol
        className="bg-muted/40 flex flex-col gap-3 rounded-md p-3 sm:flex-row sm:items-start"
        aria-label="Fix loop"
      >
        <LoopStep state="done" title="1. Bug found">
          <Link href={`/app/shipsafe/runs/${bug.runId}`} className="hover:underline">
            Failing run
          </Link>
        </LoopStep>
        <ArrowRightIcon
          className="text-muted-foreground mt-0.5 hidden size-4 shrink-0 sm:block"
          aria-hidden
        />
        <LoopStep state={fixState} title="2. Fix task">
          {fixTask ? (
            <span className="flex flex-col items-start gap-1">
              <Link href={`/app/devpilot/tasks/${fixTask.id}`} className="hover:underline">
                {fixTask.title}
              </Link>
              <TaskStatusBadge status={fixTask.status} />
            </span>
          ) : (
            "Not started"
          )}
        </LoopStep>
        <ArrowRightIcon
          className="text-muted-foreground mt-0.5 hidden size-4 shrink-0 sm:block"
          aria-hidden
        />
        <LoopStep state={retestState} title="3. Retest">
          {retest ? (
            <span className="flex flex-col items-start gap-1">
              <Link href={`/app/shipsafe/runs/${retest.id}`} className="hover:underline">
                Run on {retest.headSha.slice(0, 7)}
              </Link>
              <RunStatusBadge status={retest.status} />
            </span>
          ) : live.status === "resolved" ? (
            "Verified fixed"
          ) : (
            "After the fix is pushed"
          )}
        </LoopStep>
      </ol>

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <GatedButton
            size="sm"
            onClick={create}
            disabled={action.isPending}
            disabledReason={blocked}
          >
            <WrenchIcon /> {action.isPending ? "Creating…" : "Create fix task"}
          </GatedButton>
          <span className="text-muted-foreground text-xs">
            Keeps the commit, logs and failing test as context. Retries are capped by policy.
          </span>
        </div>
      )}
    </li>
  );
}

export function BugsSection({ d, role }: { d: PullRequestDetail; role: Role | undefined }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BugIcon className="size-4" aria-hidden /> Linked bugs
        </CardTitle>
        <span className="text-muted-foreground text-xs">
          Product defects only. Flaky and infra failures never become bugs.
        </span>
      </CardHeader>
      <CardContent>
        {d.bugs.length ? (
          <ul className="flex flex-col gap-3">
            {d.bugs.map((b) => (
              <BugCard key={b.id} bug={b} d={d} role={role} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="text-success-foreground size-4" aria-hidden /> No product
            defects linked to this PR.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- review panel

export function ReviewPanel({ d, role }: { d: PullRequestDetail; role: Role | undefined }) {
  const pr = d.pullRequest;
  const review = useReviewPullRequest(pr.id);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<"approved" | "changes_requested" | null>(null);
  const blocked = !can(role, "pr.review")
    ? "Viewers can't review pull requests."
    : pr.status !== "open"
      ? `This PR is ${pr.status}.`
      : null;

  const submit = (decision: "approved" | "changes_requested") => {
    if (decision === "changes_requested" && comment.trim().length < 3) {
      toast.error("Say what needs to change", {
        description: "Add a short comment so the author (or agent) knows what to fix.",
      });
      return;
    }
    setPending(decision);
    review.mutate(
      { decision, comment: comment.trim() },
      {
        onSuccess: () => {
          toast.success(decision === "approved" ? "PR approved" : "Changes requested", {
            description: "Your review was recorded and mirrored to GitHub.",
          });
          setComment("");
        },
        onError: (e) => toast.error("Couldn't record the review", { description: e.message }),
        onSettled: () => setPending(null),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquareIcon className="size-4" aria-hidden /> Review
        </CardTitle>
        <ToneBadge
          tone={
            pr.reviewState === "approved"
              ? "success"
              : pr.reviewState === "changes_requested"
                ? "danger"
                : "warning"
          }
        >
          {REVIEW_STATE_LABEL[pr.reviewState]}
        </ToneBadge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">
          Mirrors the GitHub review. You can also review in GitHub; both stay in sync.
          {!pr.requiredChecksMet &&
            pr.status === "open" &&
            " Required checks haven't all passed yet."}
        </p>
        {pr.status === "open" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-comment" className="text-xs">
              Comment{" "}
              <span className="text-muted-foreground font-normal">
                (required to request changes)
              </span>
            </Label>
            <Textarea
              id="review-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Looks good. Thanks for the regression test."
              disabled={!!blocked}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <GatedButton
            size="sm"
            onClick={() => submit("approved")}
            disabled={review.isPending}
            disabledReason={blocked}
          >
            <ThumbsUpIcon /> {pending === "approved" ? "Approving…" : "Approve PR"}
          </GatedButton>
          <GatedButton
            size="sm"
            variant="outline"
            onClick={() => submit("changes_requested")}
            disabled={review.isPending}
            disabledReason={blocked}
          >
            <RotateCcwIcon /> {pending === "changes_requested" ? "Sending…" : "Request changes"}
          </GatedButton>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- merge panel

export function MergePanel({ d, role }: { d: PullRequestDetail; role: Role | undefined }) {
  const pr = d.pullRequest;
  const merge = useSimulateMerge(pr.id);
  const blocked = !can(role, "pr.review")
    ? "Viewers can't simulate merges."
    : pr.status !== "open"
      ? `This PR is ${pr.status}.`
      : !d.mergeable
        ? "Blocked until every required check passes and a person approves."
        : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitMergeIcon className="size-4" aria-hidden /> Merge
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Merging happens in GitHub, under your branch protection rules. ForgePilot never merges
          automatically, even when every check passes.
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <a href={pr.url} target="_blank" rel="noreferrer">
            <ExternalLinkIcon /> Open in GitHub
          </a>
        </Button>
        {pr.status === "open" && !d.mergeable && d.mergeBlockers.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">Merge blockers</span>
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {d.mergeBlockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {pr.status === "open" && (
          <div className="flex flex-col gap-1.5 border-t pt-3">
            <Badge variant="warning" className="w-fit">
              Demo only
            </Badge>
            <GatedButton
              size="sm"
              variant="secondary"
              className="w-fit"
              disabled={merge.isPending}
              disabledReason={blocked}
              onClick={() =>
                merge.mutate(undefined, {
                  onSuccess: () =>
                    toast.success(`PR #${pr.number} merged (simulated)`, {
                      description:
                        "We replayed the GitHub merge webhook. The linked task is now complete.",
                    }),
                  onError: (e) => toast.error("Merge refused", { description: e.message }),
                })
              }
            >
              <GitMergeIcon /> Simulate GitHub merge (demo)
            </GatedButton>
            <span className="text-muted-foreground text-xs">
              Pretends GitHub sent a merge event, so you can see the loop close.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
