"use client";
import {
  AlertOctagonIcon,
  ClipboardListIcon,
  EyeIcon,
  GitPullRequestIcon,
  InboxIcon,
  PlayIcon,
  PlusIcon,
  RocketIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiCardSkeleton } from "@/components/shared/kpi-card";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { QueueCard } from "@/components/console/queue-card";
import { useConsoleUI } from "@/components/console/console-ui";
import { useNow } from "@/components/console/use-now";
import { useSession, useTasks } from "@/lib/api/hooks";
import type { TaskListItem, TaskState } from "@/lib/schemas";

interface Group {
  id: string;
  title: string;
  description: string;
  states: TaskState[];
  icon: LucideIcon;
}

const GROUPS: Group[] = [
  {
    id: "review",
    title: "Awaiting review",
    description: "Verification passed — review the diff and sign off.",
    states: ["awaiting_review"],
    icon: EyeIcon,
  },
  {
    id: "escalated",
    title: "Escalated / changes requested",
    description: "Needs hands-on attention from an engineer.",
    states: ["escalated", "rejected", "failed"],
    icon: AlertOctagonIcon,
  },
  {
    id: "running",
    title: "Running",
    description: "Agent working or verification in progress.",
    states: ["running", "verifying", "retrying"],
    icon: PlayIcon,
  },
  {
    id: "ready",
    title: "Ready to launch",
    description: "Plan approved — launch an agent.",
    states: ["plan_approved"],
    icon: RocketIcon,
  },
  {
    id: "signed",
    title: "Signed off · open PR",
    description: "Signed off — open the pull request for client approval.",
    states: ["signed_off"],
    icon: GitPullRequestIcon,
  },
  {
    id: "planning",
    title: "Planning",
    description: "Review and approve the plan.",
    states: ["created", "planned"],
    icon: ClipboardListIcon,
  },
];

const SLA_ORDER = { breached: 0, at_risk: 1, ok: 2, missed: 3, met: 4 } as const;

function sortBySla(a: TaskListItem, b: TaskListItem) {
  return SLA_ORDER[a.slaRisk] - SLA_ORDER[b.slaRisk] || a.slaDueAt.localeCompare(b.slaDueAt);
}

/** C-01 My queue. Engineers see their tasks; the delivery manager sees everything that needs attention. */
export default function MyQueuePage() {
  const session = useSession();
  const isManager = session.data?.user.role === "fp_manager";
  const tasks = useTasks(isManager ? {} : { mine: true }, { refetchInterval: 5000 });
  const { openNewTask } = useConsoleUI();
  const now = useNow();

  const header = (
    <PageHeader
      title={isManager ? "Team queue" : "My queue"}
      description={
        isManager
          ? "As delivery manager you see every task across the team that needs attention, not just your own."
          : "Tasks assigned to you, grouped by what they need next. Updates every few seconds."
      }
      meta={<MockDataBadge />}
      actions={
        <Button onClick={() => openNewTask()}>
          <PlusIcon /> New task
        </Button>
      }
    />
  );

  if (session.isPending || tasks.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {GROUPS.map((g) => (
            <KpiCardSkeleton key={g.id} />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }
  if (tasks.error || !tasks.data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      </div>
    );
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    tasks: tasks.data.filter((t) => g.states.includes(t.state)).sort(sortBySla),
  }));
  const total = grouped.reduce((s, g) => s + g.tasks.length, 0);
  const atRisk = grouped
    .flatMap((g) => g.tasks)
    .filter((t) => t.slaRisk === "at_risk" || t.slaRisk === "breached").length;

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
        aria-label="Queue counts"
      >
        {grouped.map((g) => (
          <a
            key={g.id}
            href={`#group-${g.id}`}
            className="focus-visible:ring-ring/50 rounded-lg outline-none focus-visible:ring-[3px]"
          >
            <KpiCard
              label={g.title}
              value={g.tasks.length}
              icon={g.icon}
              tone={
                g.id === "escalated" && g.tasks.length > 0
                  ? "danger"
                  : g.id === "review" && g.tasks.length > 0
                    ? "warning"
                    : undefined
              }
              hint={
                g.id === "running"
                  ? `${g.tasks.filter((t) => t.state === "retrying").length} retrying`
                  : g.tasks.some((t) => t.slaRisk === "breached")
                    ? "SLA breached"
                    : undefined
              }
              className="hover:border-primary/40 h-full"
            />
          </a>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={isManager ? "Nothing needs attention" : "Your queue is clear"}
          description="New tasks assigned to you will appear here. You can also create one from a ticket or a scan finding."
          action={
            <Button onClick={() => openNewTask()}>
              <PlusIcon /> New task
            </Button>
          }
        />
      ) : (
        <>
          {atRisk > 0 && (
            <p
              className="text-warning-foreground bg-warning-soft rounded-md px-3 py-2 text-sm"
              role="status"
            >
              {atRisk} {atRisk === 1 ? "task is" : "tasks are"} at risk of missing the SLA — they
              are listed first in each group.
            </p>
          )}
          {grouped
            .filter((g) => g.tasks.length > 0)
            .map((g) => (
              <Section
                key={g.id}
                title={
                  <span
                    id={`group-${g.id}`}
                    className="inline-flex scroll-mt-20 items-center gap-2"
                  >
                    <g.icon className="text-muted-foreground size-4" aria-hidden />
                    {g.title}
                    <span className="text-muted-foreground font-normal tabular-nums">
                      {g.tasks.length}
                    </span>
                  </span>
                }
                description={g.description}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {g.tasks.map((t) => (
                    <QueueCard key={t.id} task={t} showAssignee={isManager} now={now} />
                  ))}
                </div>
              </Section>
            ))}
        </>
      )}
    </div>
  );
}
