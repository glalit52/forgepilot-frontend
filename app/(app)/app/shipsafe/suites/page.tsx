"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { FlaskConicalIcon, InfoIcon, PlusIcon, TimerIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterBar } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { InfoTip, MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { RunStatusBadge } from "@/components/shared/status-badge";
import { GuardedButton } from "@/components/shipsafe/guarded-button";
import { useMemberNames, usePermission } from "@/components/shipsafe/helpers";
import { NewSuiteDialog } from "@/components/shipsafe/new-suite-dialog";
import { useUrlState } from "@/components/shipsafe/use-url-state";
import { useRepositories, useTestSuites, useUpdateSuite, type SuiteRow } from "@/lib/api/hooks";
import type { TestRunStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<SuiteRow["type"], string> = {
  unit: "Unit",
  playwright: "Playwright",
  api: "API",
};

function ToggleField({
  label,
  help,
  checked,
  onChange,
  disabledReason,
  pending,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabledReason: string | null;
  pending: boolean;
}) {
  const id = useId();
  const sw = (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={!!disabledReason || pending}
      aria-describedby={`${id}-help`}
    />
  );
  return (
    <div className="flex items-center gap-2">
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              {sw}
            </span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        sw
      )}
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <span id={`${id}-help`} className="sr-only">
        {help}
      </span>
    </div>
  );
}

function SuiteItem({
  s,
  ownerName,
  canManage,
  reason,
}: {
  s: SuiteRow;
  ownerName: string;
  canManage: boolean;
  reason: string;
}) {
  const update = useUpdateSuite();
  const patch = (p: { enabled?: boolean; required?: boolean }, msg: string) =>
    update.mutate(
      { id: s.id, ...p },
      {
        onSuccess: () => toast.success(msg),
        onError: (e) => toast.error("Couldn't update the suite", { description: e.message }),
      },
    );
  const flakyHigh = s.flakyRatePct >= 4;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start md:justify-between",
        !s.enabled && "opacity-70",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{s.name}</span>
          <Badge variant="outline">{TYPE_LABEL[s.type]}</Badge>
          {s.required && <Badge variant="secondary">Required</Badge>}
          {!s.enabled && <Badge variant="neutral">Disabled</Badge>}
          {s.lastStatus && (
            <RunStatusBadge status={s.lastStatus as TestRunStatus} prefix="Last run" />
          )}
        </div>
        <code className="bg-muted w-fit max-w-full truncate rounded px-1.5 py-0.5 font-mono text-xs">
          {s.command}
        </code>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>
            Env <span className="text-foreground font-mono">{s.environment}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <TimerIcon className="size-3.5" aria-hidden /> {s.timeoutMin} min timeout
          </span>
          <span className="inline-flex items-center gap-1">
            <UserIcon className="size-3.5" aria-hidden /> {ownerName}
          </span>
          <span>{s.testCount} tests</span>
          <span className={cn(flakyHigh && "text-warning-foreground font-medium")}>
            <InfoTip content="Share of this suite’s tests that failed, then passed on retry. Flaky results never become bugs.">
              {s.flakyRatePct}% flaky
            </InfoTip>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground mr-1 text-xs">Runs when changed:</span>
          {s.pathRules.map((p) => (
            <span key={p} className="rounded border px-1.5 py-0.5 font-mono text-[11px]">
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end md:gap-2">
        <ToggleField
          label="Enabled"
          help="Disabled suites are never selected."
          checked={s.enabled}
          onChange={(v) => patch({ enabled: v }, `${s.name} ${v ? "enabled" : "disabled"}`)}
          disabledReason={canManage ? null : reason}
          pending={update.isPending}
        />
        <ToggleField
          label="Required"
          help="A failing required suite fails the Check Run."
          checked={s.required}
          onChange={(v) =>
            patch(
              { required: v },
              `${s.name} is ${v ? "now a required check" : "no longer required"}`,
            )
          }
          disabledReason={canManage ? null : reason}
          pending={update.isPending}
        />
      </div>
    </li>
  );
}

export default function SuitesPage() {
  const [f, set] = useUrlState(["repo"] as const);
  const suites = useTestSuites();
  const repos = useRepositories();
  const name = useMemberNames();
  const perm = usePermission("suite.manage");
  const [open, setOpen] = useState(false);

  const rows = (suites.data ?? []).filter((s) => !f.repo || s.repositoryId === f.repo);
  const groups = new Map<string, { name: string; suites: SuiteRow[] }>();
  rows.forEach((s) => {
    const g = groups.get(s.repositoryId) ?? { name: s.repositoryName, suites: [] };
    g.suites.push(s);
    groups.set(s.repositoryId, g);
  });
  // Repositories without suites still show, so the gap is visible.
  (repos.data ?? [])
    .filter((r) => (!f.repo || r.id === f.repo) && !groups.has(r.id))
    .forEach((r) => groups.set(r.id, { name: r.fullName, suites: [] }));

  const newButton = (
    <GuardedButton onClick={() => setOpen(true)} disabledReason={perm.allowed ? null : perm.reason}>
      <PlusIcon /> New suite
    </GuardedButton>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Test suites"
        description="What ShipSafe runs for each repository: commands, environments, timeouts and ownership. Selection is deterministic: path rules decide which suites run, and every run records why each suite was selected."
        meta={<MockDataBadge />}
        actions={newButton}
      />

      <div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Unit suites run on every change. Other suites run when a changed file matches one of their
          path rules, and the run&apos;s test plan shows the reason, e.g.{" "}
          <span className="font-mono">Changed files match app/**</span>. Required suites decide the
          GitHub Check Run conclusion; merging stays under your branch protection in GitHub.
        </p>
      </div>

      <FilterBar>
        <FilterSelect
          label="Repository"
          value={f.repo}
          onChange={(v) => set({ repo: v })}
          allLabel="All repositories"
          options={(repos.data ?? []).map((r) => ({ value: r.id, label: r.fullName }))}
          className="min-w-52"
        />
      </FilterBar>

      {suites.isPending ? (
        <TableSkeleton rows={8} cols={4} />
      ) : suites.error ? (
        <ErrorState error={suites.error} onRetry={() => suites.refetch()} />
      ) : groups.size === 0 ? (
        <EmptyState
          icon={FlaskConicalIcon}
          title="No repositories connected"
          description="Connect a GitHub repository, then define the suites ShipSafe should run on its pull requests."
          action={
            <Button size="sm" asChild>
              <Link href="/onboarding">Connect GitHub</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([repoId, g]) => (
            <Card key={repoId} className="gap-0 overflow-hidden p-0">
              <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <h2 className="text-sm font-semibold">{g.name}</h2>
                <span className="text-muted-foreground text-xs">
                  {g.suites.length} suite{g.suites.length === 1 ? "" : "s"} ·{" "}
                  {g.suites.filter((s) => s.required).length} required
                </span>
              </div>
              {g.suites.length ? (
                <ul className="divide-y">
                  {g.suites.map((s) => (
                    <SuiteItem
                      key={s.id}
                      s={s}
                      ownerName={name(s.owner)}
                      canManage={perm.allowed}
                      reason={perm.reason}
                    />
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-start gap-2 px-4 py-4 text-sm">
                  <p className="text-muted-foreground">
                    No suites yet, so pull requests here aren&apos;t verified.
                  </p>
                  {perm.allowed && (
                    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                      <PlusIcon /> Add a suite
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <NewSuiteDialog
        open={open}
        onOpenChange={setOpen}
        defaultRepositoryId={f.repo || undefined}
      />
    </div>
  );
}
