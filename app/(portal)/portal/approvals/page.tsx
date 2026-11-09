"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  CheckCheckIcon,
  Loader2Icon,
  PartyPopperIcon,
  ShieldAlertIcon,
  StampIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DataTable, type Column } from "@/components/shared/data-table";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { VerificationBadge } from "@/components/shared/status-badge";
import {
  ApproveDialog,
  RequestChangesDialog,
  type ApprovalSubject,
} from "@/components/portal/approval-dialogs";
import { formatWaiting, ReadOnlyNote, usePortalRole } from "@/components/portal/portal-utils";
import { useApprovals, useApprove } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/domain/format";
import type { ApprovalQueueItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const HIGH_RISK_REASON =
  "High-risk changes (risk ≥ 60, mostly AI-written or P0) must be approved one at a time.";

function subjectOf(it: ApprovalQueueItem): ApprovalSubject {
  return {
    title: it.title,
    prNumber: it.pullRequest?.number ?? null,
    verification: it.latestVerification,
    signOff: it.signOff,
    aiAuthoredPct: it.aiAuthoredPct,
    highRisk: it.highRisk,
  };
}

const prLabel = (it: ApprovalQueueItem) =>
  it.pullRequest ? `PR #${it.pullRequest.number}` : it.id;

function RiskCell({ it }: { it: ApprovalQueueItem }) {
  const score = it.latestVerification?.riskScore;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "font-semibold tabular-nums",
          score === undefined
            ? "text-muted-foreground"
            : score >= 60
              ? "text-danger-foreground"
              : score >= 35
                ? "text-warning-foreground"
                : "text-success-foreground",
        )}
      >
        {score ?? "—"}
      </span>
      {it.highRisk && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="bg-danger-soft text-danger-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
            >
              <ShieldAlertIcon className="size-3" aria-hidden /> High risk
              <span className="sr-only"> — {HIGH_RISK_REASON}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{HIGH_RISK_REASON}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

function SignOffCell({ it }: { it: ApprovalQueueItem }) {
  return it.signOff ? (
    <span className="inline-flex items-center gap-1 text-sm" title={formatDateTime(it.signOff.at)}>
      <StampIcon className="text-success-foreground size-3.5" aria-hidden />
      {it.signOff.by}
    </span>
  ) : (
    <span className="text-muted-foreground text-xs">Not signed off</span>
  );
}

function RowActions({
  it,
  onApprove,
  onRequestChanges,
  disabled,
}: {
  it: ApprovalQueueItem;
  onApprove: () => void;
  onRequestChanges: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={onRequestChanges}
        disabled={disabled}
        aria-label={`Request changes on ${prLabel(it)}`}
      >
        Request changes
      </Button>
      <Button
        size="sm"
        onClick={onApprove}
        disabled={disabled}
        aria-label={`Approve ${prLabel(it)}`}
      >
        <CheckCircle2Icon aria-hidden /> Approve
      </Button>
    </div>
  );
}

export default function ApprovalsPage() {
  const q = useApprovals();
  const role = usePortalRole();
  const approve = useApprove();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState<ApprovalQueueItem | null>(null);
  const [changing, setChanging] = useState<ApprovalQueueItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  const items = useMemo(() => q.data ?? [], [q.data]);
  const selectedItems = items.filter((i) => selected.has(i.id) && !i.highRisk);
  const busy = approve.isPending || bulkPending;

  const confirmOne = (it: ApprovalQueueItem) =>
    approve.mutate(
      { taskId: it.id, decision: "approved", comment: "" },
      {
        onSuccess: () => {
          setApproving(null);
          setSelected((s) => {
            const n = new Set(s);
            n.delete(it.id);
            return n;
          });
          toast.success(`Approved ${prLabel(it)}`, {
            description:
              "Recorded in the evidence trail. It merges in your repository under your branch rules.",
          });
        },
        onError: (err) =>
          toast.error(`Could not approve ${prLabel(it)}`, { description: err.message }),
      },
    );

  const confirmBulk = async () => {
    setBulkPending(true);
    const ok: string[] = [];
    const failed: string[] = [];
    for (const it of selectedItems) {
      try {
        await approve.mutateAsync({ taskId: it.id, decision: "approved", comment: "" });
        ok.push(prLabel(it));
      } catch {
        failed.push(prLabel(it));
      }
    }
    setBulkPending(false);
    setBulkOpen(false);
    setSelected(new Set());
    if (ok.length)
      toast.success(`Approved ${ok.length} change${ok.length === 1 ? "" : "s"}`, {
        description: `${ok.join(", ")} — each merges in your repository under your branch rules.`,
      });
    if (failed.length) toast.error(`Could not approve ${failed.join(", ")}`);
  };

  const requestChanges = (it: ApprovalQueueItem, comment: string) =>
    approve.mutate(
      { taskId: it.id, decision: "changes_requested", comment },
      {
        onSuccess: () => {
          setChanging(null);
          toast.success(`Changes requested on ${prLabel(it)}`, {
            description: "The ForgePilot engineer has your comment.",
          });
        },
        onError: (err) => toast.error("Could not send your request", { description: err.message }),
      },
    );

  const columns: Column<ApprovalQueueItem>[] = [
    {
      id: "title",
      header: "Change",
      sortValue: (it) => it.title.toLowerCase(),
      className: "max-w-[14rem] xl:max-w-[20rem]",
      cell: (it) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/portal/work/${it.id}`}
            className="truncate font-medium hover:underline"
            title={it.title}
          >
            {it.title}
          </Link>
          <span className="text-muted-foreground truncate text-xs">
            {prLabel(it)} · {it.applicationName}
          </span>
          {it.latestVerification && (
            <span className="text-muted-foreground text-xs tabular-nums xl:hidden">
              Tests {it.latestVerification.testsPassed}/{it.latestVerification.testsRun}{" "}
              {it.latestVerification.status}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "risk",
      header: "Risk",
      sortValue: (it) => it.latestVerification?.riskScore ?? null,
      cell: (it) => <RiskCell it={it} />,
    },
    {
      id: "verification",
      header: "Verification",
      cell: (it) => (
        <span className="flex flex-col gap-0.5">
          <VerificationBadge status={it.latestVerification?.status} />
          {it.latestVerification && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {it.latestVerification.testsPassed}/{it.latestVerification.testsRun} tests
            </span>
          )}
        </span>
      ),
      hideBelow: "xl",
    },
    {
      id: "ai",
      header: "AI",
      sortValue: (it) => it.aiAuthoredPct,
      cell: (it) => <AiCodeFlag pct={it.aiAuthoredPct} compact />,
    },
    {
      id: "waiting",
      header: "Waiting",
      align: "right",
      sortValue: (it) => it.waitingHours,
      cell: (it) => (
        <span className={cn(it.waitingHours >= 24 && "text-warning-foreground font-medium")}>
          {formatWaiting(it.waitingHours)}
        </span>
      ),
    },
    {
      id: "signoff",
      header: "Signed off by",
      sortValue: (it) => it.signOff?.by ?? null,
      cell: (it) => <SignOffCell it={it} />,
      hideBelow: "xl",
    },
  ];
  if (role.canApprove)
    columns.push({
      id: "actions",
      header: "Decision",
      align: "right",
      cell: (it) => (
        <RowActions
          it={it}
          disabled={busy}
          onApprove={() => setApproving(it)}
          onRequestChanges={() => setChanging(it)}
        />
      ),
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Approvals"
        description="Pull requests that passed verification and were signed off by a ForgePilot engineer, waiting for your decision. Oldest first."
        meta={<MockDataBadge />}
        actions={
          role.canApprove && items.length > 0 ? (
            <Button onClick={() => setBulkOpen(true)} disabled={selectedItems.length === 0 || busy}>
              <CheckCheckIcon aria-hidden /> Approve selected
              {selectedItems.length ? ` (${selectedItems.length})` : ""}
            </Button>
          ) : undefined
        }
      />
      {!role.canApprove && role.role && <ReadOnlyNote />}
      <QueryState
        query={q}
        loading={<TableSkeleton cols={6} />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={PartyPopperIcon}
            title="You're all caught up"
            description="Nothing is waiting for your approval. New pull requests appear here once they pass verification and an engineer signs off."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/work">See work in progress</Link>
              </Button>
            }
          />
        }
      >
        {(rows) => (
          <>
            {role.canApprove && rows.some((r) => r.highRisk) && (
              <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <ShieldAlertIcon className="text-danger-foreground size-3.5" aria-hidden />{" "}
                {HIGH_RISK_REASON}
              </p>
            )}
            {/* Desktop / tablet */}
            <div className="hidden md:block">
              <DataTable
                caption="Pull requests waiting for approval"
                rows={rows}
                columns={columns}
                getRowId={(it) => it.id}
                rowHref={(it) => `/portal/work/${it.id}`}
                selectable={role.canApprove}
                selected={selected}
                onSelectedChange={setSelected}
                isRowSelectable={(it) => !it.highRisk}
              />
            </div>
            {/* Phone */}
            <ul
              className="flex flex-col gap-3 md:hidden"
              aria-label="Pull requests waiting for approval"
            >
              {rows.map((it) => (
                <li key={it.id}>
                  <Card className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      {role.canApprove && (
                        <Checkbox
                          className="mt-0.5"
                          aria-label={
                            it.highRisk
                              ? `${prLabel(it)} is high risk and cannot be bulk-approved`
                              : `Select ${prLabel(it)}`
                          }
                          disabled={it.highRisk}
                          checked={selected.has(it.id)}
                          onCheckedChange={(v) =>
                            setSelected((s) => {
                              const n = new Set(s);
                              if (v) n.add(it.id);
                              else n.delete(it.id);
                              return n;
                            })
                          }
                        />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Link
                          href={`/portal/work/${it.id}`}
                          className="font-medium hover:underline"
                        >
                          {it.title}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {prLabel(it)} · {it.applicationName} · waiting{" "}
                          {formatWaiting(it.waitingHours)}
                        </span>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground text-xs">Risk</dt>
                        <dd>
                          <RiskCell it={it} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Tests</dt>
                        <dd className="tabular-nums">
                          {it.latestVerification
                            ? `${it.latestVerification.testsPassed}/${it.latestVerification.testsRun} passed`
                            : "Not run"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Signed off by</dt>
                        <dd>
                          <SignOffCell it={it} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">AI-authored</dt>
                        <dd>
                          <AiCodeFlag pct={it.aiAuthoredPct} compact />
                        </dd>
                      </div>
                    </dl>
                    {role.canApprove && (
                      <RowActions
                        it={it}
                        disabled={busy}
                        onApprove={() => setApproving(it)}
                        onRequestChanges={() => setChanging(it)}
                      />
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </QueryState>

      <ApproveDialog
        open={!!approving}
        onOpenChange={(o) => !o && setApproving(null)}
        subject={approving ? subjectOf(approving) : null}
        pending={approve.isPending}
        onConfirm={() => approving && confirmOne(approving)}
      />
      <RequestChangesDialog
        open={!!changing}
        onOpenChange={(o) => !o && setChanging(null)}
        subject={changing ? subjectOf(changing) : null}
        pending={approve.isPending}
        onSubmit={(comment) => changing && requestChanges(changing, comment)}
      />
      <Dialog open={bulkOpen} onOpenChange={(o) => !bulkPending && setBulkOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Approve {selectedItems.length} change{selectedItems.length === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              Each one passed verification and was signed off by a ForgePilot engineer. High-risk
              changes are excluded and must be approved one at a time.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-md border text-sm">
            {selectedItems.map((it) => (
              <li key={it.id} className="flex flex-col gap-0.5 px-3 py-2">
                <span className="font-medium">
                  {prLabel(it)} · {it.title}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  Tests passed ({it.latestVerification?.testsPassed ?? 0}/
                  {it.latestVerification?.testsRun ?? 0}) · Signed off by {it.signOff?.by ?? "—"} ·
                  Risk {it.latestVerification?.riskScore ?? "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            ForgePilot does not merge for you — each PR merges in your repository under your branch
            rules.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkPending}>
              Cancel
            </Button>
            <Button onClick={confirmBulk} disabled={bulkPending || selectedItems.length === 0}>
              {bulkPending ? (
                <Loader2Icon className="animate-spin" aria-hidden />
              ) : (
                <CheckCheckIcon aria-hidden />
              )}
              Confirm approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
