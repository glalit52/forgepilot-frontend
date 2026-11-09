"use client";
import Link from "next/link";
import { WrenchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { DateField, useUrlParams } from "@/components/portal/portal-utils";
import { TaskTable } from "@/components/portal/task-table";
import { useApplications, useTasks } from "@/lib/api/hooks";
import { TASK_STATE_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { TaskStateSchema, TaskTypeSchema, type TaskFilters } from "@/lib/schemas";

const FILTER_KEYS = ["app", "type", "state", "from", "to"] as const;

export default function WorkPage() {
  const url = useUrlParams();
  const app = url.get("app");
  const type = url.get("type");
  const state = url.get("state");
  const from = url.get("from");
  const to = url.get("to");

  const typeParsed = TaskTypeSchema.safeParse(type);
  const stateParsed = TaskStateSchema.safeParse(state);
  const filters: TaskFilters = {
    applicationId: app || undefined,
    type: typeParsed.success ? typeParsed.data : undefined,
    state: stateParsed.success ? stateParsed.data : undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const q = useTasks(filters);
  const apps = useApplications();
  const hasFilters = FILTER_KEYS.some((k) => url.get(k));
  const clear = () => url.set(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Work"
        description="Every task and pull request ForgePilot is working on for you: upgrades, CVE patches, bug fixes, enhancements and tests."
        meta={<MockDataBadge />}
      />
      <FilterBar>
        <FilterSelect
          label="Application"
          value={app}
          onChange={(v) => url.set({ app: v })}
          options={(apps.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          allLabel="All applications"
        />
        <FilterSelect
          label="Type"
          value={type}
          onChange={(v) => url.set({ type: v })}
          options={TaskTypeSchema.options.map((t) => ({ value: t, label: TASK_TYPE_LABEL[t] }))}
          allLabel="All types"
        />
        <FilterSelect
          label="State"
          value={state}
          onChange={(v) => url.set({ state: v })}
          options={TaskStateSchema.options.map((s) => ({ value: s, label: TASK_STATE_LABEL[s] }))}
          allLabel="All states"
        />
        <DateField
          label="Created from"
          value={from}
          max={to || undefined}
          onChange={(v) => url.set({ from: v })}
        />
        <DateField
          label="Created to"
          value={to}
          min={from || undefined}
          onChange={(v) => url.set({ to: v })}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear filters
          </Button>
        )}
      </FilterBar>
      <QueryState query={q} loading={<TableSkeleton cols={6} />}>
        {(tasks) => (
          <>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
              {hasFilters ? " match these filters" : ""}
            </p>
            <TaskTable
              tasks={tasks}
              caption="Tasks and pull requests"
              empty={
                hasFilters ? (
                  <EmptyState
                    icon={WrenchIcon}
                    title="No tasks match these filters"
                    description="Try a wider date range or another state."
                    action={
                      <Button variant="outline" size="sm" onClick={clear}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={WrenchIcon}
                    title="No work yet"
                    description="Tasks appear here when ForgePilot plans upgrades, patches and fixes for your applications."
                    action={
                      <Button asChild variant="outline" size="sm">
                        <Link href="/portal/applications">Review application health</Link>
                      </Button>
                    }
                  />
                )
              }
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
