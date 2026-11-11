"use client";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GitPullRequestIcon, XIcon } from "lucide-react";
import { usePullRequests, useRepositories, useSession } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { PullRequestTable } from "@/components/workspace/lists";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "merged", label: "Merged" },
  { value: "closed", label: "Closed" },
];
const AUTHOR_OPTIONS = [
  { value: "agent", label: "AI agent" },
  { value: "person", label: "Person" },
];

export default function PullRequestsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const tab = params.get("filter") === "review" ? "review" : "all";
  const status = tab === "review" ? "" : (params.get("status") ?? "");
  const author = params.get("author") ?? "";
  const repositoryId = params.get("repositoryId") ?? "";
  const prs = usePullRequests({
    status,
    author,
    repositoryId,
    filter: tab === "review" ? "review" : undefined,
  });
  const repos = useRepositories();

  const setParam = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  const filtered = !!(status || author || repositoryId);
  const reviewCount = session.data?.counts.reviewReady;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pull requests"
        description="Agent and human PRs with their ShipSafe verification. Merging always happens in GitHub, after a person reviews."
      />
      <div className="flex flex-col gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) => setParam({ filter: v === "review" ? "review" : "", status: "" })}
        >
          <TabsList>
            <TabsTrigger value="all">All pull requests</TabsTrigger>
            <TabsTrigger value="review">
              Ready for review
              {reviewCount ? (
                <span className="bg-primary text-primary-foreground rounded px-1.5 text-[11px] tabular-nums">
                  {reviewCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "review" && (
          <p className="text-muted-foreground text-sm">
            Open PRs where every ShipSafe check passed. They still need a human review before
            merging in GitHub.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          {tab === "all" && (
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => setParam({ status: v })}
              options={STATUS_OPTIONS}
              allLabel="Any status"
            />
          )}
          <FilterSelect
            label="Author"
            value={author}
            onChange={(v) => setParam({ author: v })}
            options={AUTHOR_OPTIONS}
            allLabel="Agents and people"
          />
          <FilterSelect
            label="Repository"
            value={repositoryId}
            onChange={(v) => setParam({ repositoryId: v })}
            options={(repos.data ?? []).map((r) => ({ value: r.id, label: r.fullName }))}
            allLabel="All repositories"
          />
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParam({ status: "", author: "", repositoryId: "" })}
            >
              <XIcon /> Clear filters
            </Button>
          )}
        </div>
      </div>
      <QueryState query={prs} loading={<TableSkeleton rows={8} cols={6} />}>
        {(rows) => (
          <PullRequestTable
            rows={rows}
            empty={
              <EmptyState
                icon={GitPullRequestIcon}
                title={
                  tab === "review"
                    ? "Nothing waiting for review"
                    : filtered
                      ? "No pull requests match these filters"
                      : "No pull requests yet"
                }
                description={
                  tab === "review"
                    ? "When a PR passes every ShipSafe check, it shows up here for a human to review."
                    : filtered
                      ? "Try clearing a filter."
                      : "Open a PR in a connected repository, or delegate a task to an agent, and ShipSafe will verify it."
                }
                action={
                  filtered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setParam({ status: "", author: "", repositoryId: "" })}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        )}
      </QueryState>
    </div>
  );
}
