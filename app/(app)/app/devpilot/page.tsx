"use client";
import Link from "next/link";
import {
  ActivityIcon,
  BotIcon,
  CheckCircle2Icon,
  CoinsIcon,
  HandIcon,
  InboxIcon,
  PlayIcon,
  WalletIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { AgentsPanel } from "@/components/devpilot/agents-panel";
import { LiveSessions } from "@/components/devpilot/live-sessions";
import { NewTaskButton } from "@/components/devpilot/new-task-button";
import { TaskCard } from "@/components/devpilot/task-card";
import { formatCost } from "@/components/devpilot/utils";
import { useDevPilotOverview } from "@/lib/api/hooks";
import { formatPct, formatUsd } from "@/lib/domain/format";
import { BOARD_COLUMNS } from "@/lib/domain/workflow";
import type { DevPilotOverview } from "@/lib/schemas";

const PER_COLUMN = 6;

export default function DevPilotCommandCentre() {
  const q = useDevPilotOverview();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agent command centre"
        description="Every task you've delegated to a coding agent, where it is in the loop, and what it costs. Nothing merges without a human."
        meta={<MockDataBadge />}
        actions={<NewTaskButton />}
      />
      {q.isPending ? (
        <Loading />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Content data={q.data} />
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading command centre">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}

function Content({ data }: { data: DevPilotOverview }) {
  const { kpis } = data;
  const total = Object.values(data.board).reduce((s, c) => s + c.length, 0);
  return (
    <>
      <section
        aria-label="Key numbers"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      >
        <KpiCard label="Running" value={kpis.running} icon={PlayIcon} hint="agents working now" />
        <KpiCard
          label="Waiting for input"
          value={kpis.waiting}
          icon={HandIcon}
          tone={kpis.waiting ? "warning" : undefined}
          hint={
            kpis.waiting ? (
              <Link href="/app/approvals" className="hover:underline">
                Open approvals
              </Link>
            ) : (
              "nothing blocked"
            )
          }
        />
        <KpiCard
          label="Ready for review"
          value={kpis.reviewReady}
          icon={InboxIcon}
          tone={kpis.reviewReady ? "success" : undefined}
          hint={
            <Link href="/app/devpilot/tasks?status=review_ready" className="hover:underline">
              verified, needs a human
            </Link>
          }
        />
        <KpiCard
          label="Success rate"
          value={formatPct(kpis.successRatePct)}
          icon={CheckCircle2Icon}
          hint="of finished tasks"
        />
        <KpiCard
          label="Avg cost / session"
          value={formatCost(kpis.avgCostUsd)}
          icon={CoinsIcon}
          hint="last 30 days"
        />
        <KpiCard
          label="Spend (30d)"
          value={formatUsd(kpis.spend30dUsd)}
          icon={WalletIcon}
          hint={
            <Link href="/app/billing" className="hover:underline">
              usage &amp; budget
            </Link>
          }
        />
      </section>

      <Section
        title="Board"
        description={`${total} tasks across the loop. Tasks move to “Ready for review” only after ShipSafe verification passes.`}
        actions={
          <Link href="/app/devpilot/tasks" className="text-primary text-sm hover:underline">
            All tasks
          </Link>
        }
      >
        {total === 0 ? (
          <EmptyState
            icon={BotIcon}
            title="Delegate your first task"
            description="Describe a change, pick a repository and an agent. It works in an isolated workspace, opens a PR, and ShipSafe verifies it before anyone reviews."
            action={<NewTaskButton label="Create a task" />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {BOARD_COLUMNS.map((col) => {
              const items = data.board[col.key] ?? [];
              return (
                <Card
                  key={col.key}
                  className="bg-muted/30 flex min-w-0 flex-col gap-2 p-2.5"
                  aria-labelledby={`col-${col.key}`}
                >
                  <div className="flex items-center justify-between px-1 pt-0.5">
                    <h3
                      id={`col-${col.key}`}
                      className="text-xs font-semibold tracking-wide uppercase"
                    >
                      {col.label}
                    </h3>
                    <span className="text-muted-foreground bg-background rounded-full border px-1.5 text-xs tabular-nums">
                      {items.length}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-xs">
                      {EMPTY_COLUMN[col.key] ?? "Nothing here"}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {items.slice(0, PER_COLUMN).map((t) => (
                        <TaskCard key={t.id} task={t} />
                      ))}
                      {items.length > PER_COLUMN && (
                        <Link
                          href={`/app/devpilot/tasks?status=${col.statuses.join(",")}`}
                          className="text-primary px-1 py-1 text-xs hover:underline"
                        >
                          View all {items.length}
                        </Link>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          title={
            <span className="inline-flex items-center gap-1.5">
              <ActivityIcon className="text-primary size-4" aria-hidden /> Live sessions
            </span>
          }
          description="Updates every few seconds."
          actions={
            <Link href="/app/devpilot/sessions" className="text-primary text-sm hover:underline">
              All sessions
            </Link>
          }
        >
          <LiveSessions sessions={data.liveSessions} />
        </Section>
        <Section title="Agents" description="Runtimes connected to this workspace, last 30 days.">
          <AgentsPanel agents={data.agents} />
        </Section>
      </div>
    </>
  );
}

const EMPTY_COLUMN: Record<string, string> = {
  todo: "No drafts or queued tasks",
  running: "No agents working right now",
  verifying: "Nothing being verified",
  review: "Nothing waiting for review",
  done: "Nothing finished yet",
};
