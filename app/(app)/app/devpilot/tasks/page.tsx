"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListChecksIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActorChip } from "@/components/shared/actor-chip";
import { DataTable, FilterBar, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { useAppUI } from "@/components/app/app-ui";
import { PrCell, SourceChip } from "@/components/devpilot/bits";
import { MultiFilter } from "@/components/devpilot/multi-filter";
import { NewTaskButton } from "@/components/devpilot/new-task-button";
import { useUrlFilters } from "@/components/devpilot/use-url-filters";
import { agentActor, formatCost, personActor, SOURCE_SHORT } from "@/components/devpilot/utils";
import { useAgents, useProjects, useRepositories, useTasks } from "@/lib/api/hooks";
import { formatDateTime, formatRelative } from "@/lib/domain/format";
import { TASK_STATUS_LABEL } from "@/lib/domain/workflow";
import { TASK_STATUSES, type TaskListItem, type TaskSource } from "@/lib/schemas";

const KEYS = ["status", "projectId", "repositoryId", "source", "agentId", "q"] as const;

const columns: Column<TaskListItem>[] = [
  {
    id: "title",
    header: "Task",
    sortValue: (t) => t.title.toLowerCase(),
    className: "max-w-[22rem]",
    cell: (t) => (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium" title={t.title}>
          {t.title}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {t.source !== "manual" && <SourceChip source={t.source} sourceRef={t.sourceRef} />}
          <span className="text-muted-foreground font-mono text-[11px]">{t.id}</span>
        </span>
      </div>
    ),
  },
  {
    id: "repo",
    header: "Repository",
    hideBelow: "md",
    sortValue: (t) => t.repositoryName,
    cell: (t) => <span className="font-mono text-xs">{t.repositoryName}</span>,
  },
  {
    id: "status",
    header: "Status",
    sortValue: (t) => TASK_STATUSES.indexOf(t.status),
    cell: (t) => <TaskStatusBadge status={t.status} />,
  },
  {
    id: "agent",
    header: "Agent",
    hideBelow: "xl",
    sortValue: (t) => t.agent?.name ?? null,
    cell: (t) =>
      t.agent ? (
        <ActorChip actor={agentActor(t.agent)} className="text-xs" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "attempts",
    header: "Attempts",
    hideBelow: "xl",
    align: "right",
    sortValue: (t) => t.attempts,
    cell: (t) => t.attempts,
  },
  {
    id: "cost",
    header: "Cost",
    hideBelow: "lg",
    align: "right",
    sortValue: (t) => t.costUsd,
    cell: (t) => formatCost(t.costUsd),
  },
  {
    id: "pr",
    header: "PR",
    sortValue: (t) => t.pullRequest?.number ?? null,
    cell: (t) => <PrCell pr={t.pullRequest} />,
  },
  {
    id: "createdBy",
    header: "Created by",
    hideBelow: "xl",
    sortValue: (t) => t.createdByUser?.name ?? null,
    cell: (t) =>
      t.createdByUser ? (
        <ActorChip actor={personActor(t.createdByUser)} showDetail={false} className="text-xs" />
      ) : (
        <span className="text-muted-foreground text-xs">System</span>
      ),
  },
  {
    id: "created",
    header: "Created",
    hideBelow: "lg",
    sortValue: (t) => t.createdAt,
    cell: (t) => (
      <time
        dateTime={t.createdAt}
        title={formatDateTime(t.createdAt)}
        className="text-muted-foreground text-xs whitespace-nowrap"
        suppressHydrationWarning
      >
        {formatRelative(t.createdAt)}
      </time>
    ),
  },
];

export default function TasksPage() {
  const [f, setF] = useUrlFilters(KEYS);
  const { openNewTask } = useAppUI();
  const newParam = useSearchParams().get("new");

  // ?new=1 opens the New task dialog once, then drops the flag so a refresh doesn't reopen it.
  const opened = useRef(false);
  useEffect(() => {
    if (newParam === "1" && !opened.current) {
      opened.current = true;
      openNewTask();
      setF({ new: null });
    }
  }, [newParam, openNewTask, setF]);

  const [search, setSearch] = useState(f.q);
  useEffect(() => {
    if (search === f.q) return;
    const t = setTimeout(() => setF({ q: search.trim() || null }), 250);
    return () => clearTimeout(t);
  }, [search, f.q, setF]);

  const filters = useMemo(() => Object.fromEntries(Object.entries(f).filter(([, v]) => v)), [f]);
  const tasks = useTasks(filters);
  const projects = useProjects();
  const repos = useRepositories(f.projectId || undefined);
  const agents = useAgents();
  const active = Object.values(f).some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks"
        description="Work delegated to coding agents: from issue to verified pull request. Filters stay in the URL so you can share a view."
        meta={<MockDataBadge />}
        actions={<NewTaskButton />}
      />
      <FilterBar>
        <div className="flex min-w-52 flex-1 flex-col gap-1">
          <Label htmlFor="task-search" className="text-muted-foreground text-xs font-normal">
            Search
          </Label>
          <div className="relative">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="task-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or task id"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <MultiFilter
          label="Status"
          value={f.status}
          onChange={(v) => setF({ status: v || null })}
          options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))}
        />
        <FilterSelect
          label="Project"
          value={f.projectId}
          onChange={(v) => setF({ projectId: v || null, repositoryId: null })}
          options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterSelect
          label="Repository"
          value={f.repositoryId}
          onChange={(v) => setF({ repositoryId: v || null })}
          options={(repos.data ?? []).map((r) => ({ value: r.id, label: r.fullName }))}
        />
        <FilterSelect
          label="Source"
          value={f.source}
          onChange={(v) => setF({ source: v || null })}
          options={(Object.keys(SOURCE_SHORT) as TaskSource[]).map((s) => ({
            value: s,
            label: SOURCE_SHORT[s],
          }))}
        />
        <FilterSelect
          label="Agent"
          value={f.agentId}
          onChange={(v) => setF({ agentId: v || null })}
          options={(agents.data ?? []).map((a) => ({
            value: a.id,
            label: `${a.name} · ${a.model}`,
          }))}
        />
        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setF(Object.fromEntries(KEYS.map((k) => [k, null])));
            }}
          >
            <XIcon /> Clear filters
          </Button>
        )}
      </FilterBar>

      {tasks.isPending ? (
        <TableSkeleton rows={8} cols={6} />
      ) : tasks.error || !tasks.data ? (
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      ) : (
        <>
          <p className="text-muted-foreground -mt-2 text-xs" aria-live="polite">
            {tasks.data.length} {tasks.data.length === 1 ? "task" : "tasks"}
            {active ? " match these filters" : ""}
          </p>
          <DataTable
            rows={tasks.data}
            columns={columns}
            getRowId={(t) => t.id}
            rowHref={(t) => `/app/devpilot/tasks/${t.id}`}
            caption="Agent tasks"
            empty={
              active ? (
                <EmptyState
                  icon={SearchIcon}
                  title="No tasks match these filters"
                  description="Try a different status or clear the filters."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setF(Object.fromEntries(KEYS.map((k) => [k, null])));
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={ListChecksIcon}
                  title="No tasks yet"
                  description="Describe a change, pick a repository and an agent. ForgePilot runs it in an isolated workspace and verifies the PR."
                  action={<NewTaskButton size="sm" label="Create your first task" />}
                />
              )
            }
          />
        </>
      )}
    </div>
  );
}
