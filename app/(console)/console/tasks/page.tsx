"use client";
import { useMemo } from "react";
import { ListTodoIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, FilterBar } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { useConsoleUI } from "@/components/console/console-ui";
import { taskColumns } from "@/components/console/task-columns";
import { useUrlFilters } from "@/components/console/use-url-filters";
import { useClients, useEngineers, useTasks } from "@/lib/api/hooks";
import {
  AgentKindSchema,
  TASK_STATES,
  TaskTypeSchema,
  type AgentKind,
  type TaskFilters,
  type TaskState,
  type TaskType,
} from "@/lib/schemas";
import { AGENT_LABEL, TASK_STATE_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";

const KEYS = ["client", "state", "type", "assignee", "agent", "sla"] as const;

const SLA_OPTIONS = [
  { value: "at_risk_or_breached", label: "At risk or breached" },
  { value: "breached", label: "Breached" },
  { value: "at_risk", label: "At risk" },
  { value: "ok", label: "On track" },
  { value: "met", label: "Met" },
  { value: "missed", label: "Missed" },
];

/** C-02 All tasks across clients. Filters live in the URL. */
export default function TasksPage() {
  const { values, set, clear, active } = useUrlFilters(KEYS);
  const { openNewTask } = useConsoleUI();
  const clients = useClients();
  const engineers = useEngineers();

  const filters: TaskFilters = {
    orgId: values.client || undefined,
    state: (TASK_STATES as readonly string[]).includes(values.state)
      ? (values.state as TaskState)
      : undefined,
    type: TaskTypeSchema.safeParse(values.type).success ? (values.type as TaskType) : undefined,
    assigneeUserId: values.assignee || undefined,
    agent: AgentKindSchema.safeParse(values.agent).success
      ? (values.agent as AgentKind)
      : undefined,
  };
  const tasks = useTasks(filters, { refetchInterval: 10_000 });

  const rows = useMemo(() => {
    const list = tasks.data ?? [];
    if (!values.sla) return list;
    if (values.sla === "at_risk_or_breached")
      return list.filter((t) => t.slaRisk === "at_risk" || t.slaRisk === "breached");
    return list.filter((t) => t.slaRisk === values.sla);
  }, [tasks.data, values.sla]);

  const columns = useMemo(() => taskColumns(), []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks"
        description="Every task across all clients. Filters are saved in the URL so you can share a view."
        meta={<MockDataBadge />}
        actions={
          <Button onClick={() => openNewTask()}>
            <PlusIcon /> New task
          </Button>
        }
      />
      <FilterBar>
        <FilterSelect
          label="Client"
          value={values.client}
          onChange={(v) => set("client", v)}
          options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          label="State"
          value={values.state}
          onChange={(v) => set("state", v)}
          options={TASK_STATES.map((s) => ({ value: s, label: TASK_STATE_LABEL[s] }))}
        />
        <FilterSelect
          label="Type"
          value={values.type}
          onChange={(v) => set("type", v)}
          options={TaskTypeSchema.options.map((t) => ({ value: t, label: TASK_TYPE_LABEL[t] }))}
        />
        <FilterSelect
          label="Assignee"
          value={values.assignee}
          onChange={(v) => set("assignee", v)}
          options={(engineers.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
        />
        <FilterSelect
          label="Agent"
          value={values.agent}
          onChange={(v) => set("agent", v)}
          options={AgentKindSchema.options.map((a) => ({ value: a, label: AGENT_LABEL[a] }))}
        />
        <FilterSelect
          label="SLA risk"
          value={values.sla}
          onChange={(v) => set("sla", v)}
          options={SLA_OPTIONS}
        />
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <XIcon /> Clear filters
          </Button>
        )}
      </FilterBar>

      {tasks.isPending ? (
        <TableSkeleton rows={8} cols={7} />
      ) : tasks.error ? (
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      ) : (
        <>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {rows.length} {rows.length === 1 ? "task" : "tasks"}
            {active > 0 ? " match these filters" : ""}
          </p>
          <DataTable
            caption="Tasks"
            rows={rows}
            columns={columns}
            getRowId={(t) => t.id}
            rowHref={(t) => `/console/tasks/${t.id}`}
            initialSort={{ id: "sla", dir: "asc" }}
            empty={
              <EmptyState
                icon={ListTodoIcon}
                title={active > 0 ? "No tasks match these filters" : "No tasks yet"}
                description={
                  active > 0
                    ? "Try removing a filter."
                    : "Create the first task from a ticket or a scan finding."
                }
                action={
                  active > 0 ? (
                    <Button variant="outline" onClick={clear}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button onClick={() => openNewTask()}>
                      <PlusIcon /> New task
                    </Button>
                  )
                }
              />
            }
          />
        </>
      )}
    </div>
  );
}
