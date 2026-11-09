"use client";
import { ListChecksIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { RunTable } from "@/components/shipsafe/run-table";
import {
  RunVerificationButton,
  RunVerificationDialog,
} from "@/components/shipsafe/run-verification-dialog";
import { useUrlState } from "@/components/shipsafe/use-url-state";
import { useRepositories, useTestRuns } from "@/lib/api/hooks";
import { RUN_STATUS_LABEL } from "@/lib/domain/status";
import type { TestRunStatus } from "@/lib/schemas";

const KEYS = ["repo", "status", "trigger", "new"] as const;
const STATUSES = Object.keys(RUN_STATUS_LABEL) as TestRunStatus[];

export default function RunsPage() {
  const [f, set] = useUrlState(KEYS);
  const repos = useRepositories();
  const runs = useTestRuns({
    repositoryId: f.repo || undefined,
    status: f.status || undefined,
    trigger: f.trigger || undefined,
  });
  const filtered = !!(f.repo || f.status || f.trigger);
  const open = f.new === "1";
  const setOpen = (o: boolean) => set({ new: o ? "1" : null });
  const running =
    runs.data?.filter((r) => r.status === "running" || r.status === "queued").length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Verification runs"
        description="Every ShipSafe run with its commit pin, trigger and result. Runs triggered by pull requests also publish a GitHub Check Run."
        meta={
          <>
            <MockDataBadge />
            {running > 0 && (
              <span
                className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
                role="status"
              >
                <span className="bg-primary size-1.5 animate-pulse rounded-full" aria-hidden />{" "}
                {running} running now
              </span>
            )}
          </>
        }
        actions={<RunVerificationButton onClick={() => setOpen(true)} />}
      />

      <FilterBar>
        <FilterSelect
          label="Repository"
          value={f.repo}
          onChange={(v) => set({ repo: v })}
          allLabel="All repositories"
          options={(repos.data ?? []).map((r) => ({ value: r.id, label: r.fullName }))}
          className="min-w-52"
        />
        <FilterSelect
          label="Status"
          value={f.status}
          onChange={(v) => set({ status: v })}
          allLabel="Any status"
          options={STATUSES.map((s) => ({ value: s, label: RUN_STATUS_LABEL[s] }))}
        />
        <FilterSelect
          label="Trigger"
          value={f.trigger}
          onChange={(v) => set({ trigger: v })}
          allLabel="Any trigger"
          options={[
            { value: "pr", label: "Pull request" },
            { value: "branch", label: "Branch, schedule or manual" },
          ]}
          className="min-w-48"
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set({ repo: null, status: null, trigger: null })}
          >
            <XIcon /> Clear filters
          </Button>
        )}
        {runs.data && (
          <span
            className="text-muted-foreground ml-auto self-center text-xs tabular-nums"
            aria-live="polite"
          >
            {runs.data.length} run{runs.data.length === 1 ? "" : "s"}
          </span>
        )}
      </FilterBar>

      {runs.isPending ? (
        <TableSkeleton rows={10} cols={6} />
      ) : runs.error ? (
        <ErrorState error={runs.error} onRetry={() => runs.refetch()} />
      ) : (
        <RunTable
          runs={runs.data}
          empty={
            filtered ? (
              <EmptyState
                icon={ListChecksIcon}
                title="No runs match these filters"
                description="Try another repository or status."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => set({ repo: null, status: null, trigger: null })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ListChecksIcon}
                title="No verification runs yet"
                description="Runs start automatically when a pull request opens on a connected repository. You can also run one on a branch now."
                action={<RunVerificationButton size="sm" onClick={() => setOpen(true)} />}
              />
            )
          }
        />
      )}

      <RunVerificationDialog
        open={open}
        onOpenChange={setOpen}
        defaultRepositoryId={f.repo || undefined}
      />
    </div>
  );
}
