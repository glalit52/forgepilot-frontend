"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileCheck2Icon,
  FileJsonIcon,
  FileTextIcon,
  Loader2Icon,
  ShieldCheckIcon,
  ShieldXIcon,
  StampIcon,
  UserCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/shared/data-table";
import { EvidenceTimeline } from "@/components/shared/evidence-timeline";
import { FilterSelect } from "@/components/shared/filter-select";
import { MockDataBadge, TaskTypeBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import {
  DateField,
  downloadBlob,
  SearchField,
  StubLabel,
  useUrlParams,
} from "@/components/portal/portal-utils";
import { useContextPanel } from "@/components/shell/context-panel";
import { exportEvidence, useApplications, useEvidence } from "@/lib/api/hooks";
import { formatDate, formatDateTime, formatRelative } from "@/lib/domain/format";
import { TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { TaskTypeSchema, type EvidencePack } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["q", "app", "type", "from", "to"] as const;

function ChainIcon({ valid }: { valid: boolean }) {
  return valid ? (
    <span
      className="text-success-foreground inline-flex items-center gap-1 text-xs"
      title="Hash chain intact"
    >
      <ShieldCheckIcon className="size-4" aria-hidden />
      <span className="sr-only md:not-sr-only">Intact</span>
    </span>
  ) : (
    <span
      className="text-danger-foreground inline-flex items-center gap-1 text-xs"
      title="Hash chain broken"
    >
      <ShieldXIcon className="size-4" aria-hidden />
      <span className="sr-only md:not-sr-only">Broken</span>
    </span>
  );
}

function ScansCell({ p }: { p: EvidencePack }) {
  const v = p.verification;
  if (!v) return null;
  const s = v.securityFindings;
  const bad = s.critical + s.high;
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span
        className={cn(
          "whitespace-nowrap tabular-nums",
          bad ? "text-danger-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {s.critical} crit · {s.high} high · {s.medium} med
      </span>
      {v.scanners.length > 0 && (
        <span className="text-muted-foreground hidden truncate 2xl:inline">
          {v.scanners.join(", ")}
        </span>
      )}
    </span>
  );
}

function PackPanel({ p }: { p: EvidencePack }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={p.task.state} />
        <TaskTypeBadge type={p.task.type} />
        <VerificationBadge status={p.verification?.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Agent + model</dt>
          <dd>{p.agentLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Diff</dt>
          <dd className="tabular-nums">
            {p.diffSummary.files} files ·{" "}
            <span className="text-success-foreground">+{p.diffSummary.additions}</span>{" "}
            <span className="text-danger-foreground">−{p.diffSummary.deletions}</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Engineer sign-off</dt>
          <dd>{p.signOff ? `${p.signOff.by} · ${formatDateTime(p.signOff.at)}` : "Not yet"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Client decision</dt>
          <dd>
            {p.clientApproval
              ? `${p.clientApproval.decision === "approved" ? "Approved" : "Changes requested"} by ${p.clientApproval.by}`
              : "Not yet"}
          </dd>
        </div>
      </dl>
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href={`/portal/work/${p.task.id}#evidence`}>Open task</Link>
      </Button>
      <EvidenceTimeline records={p.records} chainValid={p.chainValid} />
    </div>
  );
}

export default function EvidencePage() {
  const url = useUrlParams();
  const text = url.get("q");
  const app = url.get("app");
  const type = url.get("type");
  const from = url.get("from");
  const to = url.get("to");
  const typeParsed = TaskTypeSchema.safeParse(type);
  const q = useEvidence({
    q: text.trim() || undefined,
    applicationId: app || undefined,
    type: typeParsed.success ? typeParsed.data : undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const apps = useApplications();
  const panel = useContextPanel();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const hasFilters = FILTER_KEYS.some((k) => url.get(k));
  const clear = () => url.set(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));

  const packs = q.data ?? [];
  const visibleSelected = packs.filter((p) => selected.has(p.id));
  const allChecked = packs.length > 0 && packs.every((p) => selected.has(p.id));

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const openPanel = (p: EvidencePack) =>
    panel.open({
      title: p.task.title,
      description: `${p.task.applicationName} · ${p.records.length} evidence records`,
      content: <PackPanel p={p} />,
    });

  const exportJson = async () => {
    const ids = visibleSelected.map((p) => p.id);
    setExporting(true);
    try {
      const data = await exportEvidence(ids);
      downloadBlob(
        `forgepilot-evidence-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(data, null, 2),
        "application/json",
      );
      toast.success(
        `Exported ${data.packs.length} evidence pack${data.packs.length === 1 ? "" : "s"} as JSON`,
      );
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = () =>
    toast.info("PDF export is a stub in this demo", {
      description:
        "The signed PDF evidence report arrives in a later phase. Use Export JSON for the full machine-readable record.",
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Evidence"
        description="One evidence pack per change: who did what (agent or person), tests, scans, sign-off, your approval and a tamper-evident hash chain."
        meta={<MockDataBadge />}
        actions={
          <>
            <Button variant="outline" onClick={exportPdf} disabled={visibleSelected.length === 0}>
              <FileTextIcon aria-hidden /> Export PDF <StubLabel />
            </Button>
            <Button onClick={exportJson} disabled={visibleSelected.length === 0 || exporting}>
              {exporting ? (
                <Loader2Icon className="animate-spin" aria-hidden />
              ) : (
                <FileJsonIcon aria-hidden />
              )}
              Export JSON{visibleSelected.length ? ` (${visibleSelected.length})` : ""}
            </Button>
          </>
        }
      />
      <FilterBar>
        <SearchField
          value={text}
          onChange={(v) => url.set({ q: v })}
          placeholder="Task title or id"
        />
        <FilterSelect
          label="Application"
          value={app}
          onChange={(v) => url.set({ app: v })}
          options={(apps.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          allLabel="All applications"
        />
        <FilterSelect
          label="Change type"
          value={type}
          onChange={(v) => url.set({ type: v })}
          options={TaskTypeSchema.options.map((t) => ({ value: t, label: TASK_TYPE_LABEL[t] }))}
          allLabel="All types"
        />
        <DateField
          label="From"
          value={from}
          max={to || undefined}
          onChange={(v) => url.set({ from: v })}
        />
        <DateField
          label="To"
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
      <QueryState
        query={q}
        loading={<TableSkeleton cols={6} />}
        isEmpty={(d) => d.length === 0}
        empty={
          hasFilters ? (
            <EmptyState
              icon={FileCheck2Icon}
              title="No evidence packs match"
              description="Try a wider date range or clear the search."
              action={
                <Button variant="outline" size="sm" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileCheck2Icon}
              title="No evidence yet"
              description="An evidence pack is created as soon as work starts on a change."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/portal/work">See work</Link>
                </Button>
              }
            />
          )
        }
      >
        {(rows) => (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {rows.length} pack{rows.length === 1 ? "" : "s"} · {visibleSelected.length} selected ·
              click a row to see its full timeline
            </p>
            <div className="rounded-lg border">
              <Table>
                <caption className="sr-only">Evidence packs</caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all evidence packs"
                        checked={allChecked}
                        onCheckedChange={(v) =>
                          setSelected(v ? new Set(rows.map((p) => p.id)) : new Set())
                        }
                      />
                    </TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead className="hidden xl:table-cell">Agent + model</TableHead>
                    <TableHead>Tests · scans</TableHead>
                    <TableHead>Sign-off · approval</TableHead>
                    <TableHead className="hidden text-right xl:table-cell">Diff</TableHead>
                    <TableHead>Chain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const v = p.verification;
                    return (
                      <TableRow
                        key={p.id}
                        data-state={selected.has(p.id) ? "selected" : undefined}
                        className="cursor-pointer"
                        tabIndex={0}
                        aria-label={`Open evidence timeline for ${p.task.title}`}
                        onClick={(e) => {
                          if (
                            (e.target as HTMLElement).closest(
                              "a,button,[role=checkbox],input,label",
                            )
                          )
                            return;
                          openPanel(p);
                        }}
                        onKeyDown={(e) => {
                          if (
                            (e.key === "Enter" || e.key === " ") &&
                            e.target === e.currentTarget
                          ) {
                            e.preventDefault();
                            openPanel(p);
                          }
                        }}
                      >
                        <TableCell className="w-10">
                          <Checkbox
                            aria-label={`Select evidence pack for ${p.task.title}`}
                            checked={selected.has(p.id)}
                            onCheckedChange={(on) => toggle(p.id, !!on)}
                          />
                        </TableCell>
                        <TableCell className="max-w-[14rem] 2xl:max-w-[20rem]">
                          <div className="flex min-w-0 flex-col">
                            <Link
                              href={`/portal/work/${p.task.id}#evidence`}
                              className="truncate font-medium hover:underline"
                              title={p.task.title}
                            >
                              {p.task.title}
                            </Link>
                            <span className="text-muted-foreground truncate text-xs">
                              {p.task.applicationName} · {TASK_TYPE_LABEL[p.task.type]} ·{" "}
                              <time dateTime={p.lastEventAt} title={formatDateTime(p.lastEventAt)}>
                                {formatRelative(p.lastEventAt)}
                              </time>
                            </span>
                            <span className="text-muted-foreground truncate text-xs xl:hidden">
                              {p.agentLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="text-sm whitespace-nowrap">{p.agentLabel}</span>
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-col gap-0.5">
                            {v ? (
                              <span
                                className={cn(
                                  "text-xs font-medium whitespace-nowrap tabular-nums",
                                  v.status === "passed"
                                    ? "text-success-foreground"
                                    : v.status === "failed"
                                      ? "text-danger-foreground"
                                      : "",
                                )}
                              >
                                {v.testsPassed}/{v.testsRun} passed
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not run</span>
                            )}
                            {v && <ScansCell p={p} />}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex max-w-[12rem] flex-col gap-0.5 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <StampIcon
                                className={cn(
                                  "size-3",
                                  p.signOff ? "text-success-foreground" : "text-muted-foreground",
                                )}
                                aria-hidden
                              />
                              {p.signOff ? (
                                <span title={formatDateTime(p.signOff.at)}>{p.signOff.by}</span>
                              ) : (
                                <span className="text-muted-foreground">No sign-off yet</span>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <UserCheckIcon
                                className={cn(
                                  "size-3",
                                  p.clientApproval?.decision === "approved"
                                    ? "text-success-foreground"
                                    : p.clientApproval
                                      ? "text-warning-foreground"
                                      : "text-muted-foreground",
                                )}
                                aria-hidden
                              />
                              {p.clientApproval ? (
                                <span title={formatDate(p.clientApproval.at)}>
                                  {p.clientApproval.decision === "approved"
                                    ? "Approved"
                                    : "Changes requested"}{" "}
                                  · {p.clientApproval.by}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">No client decision</span>
                              )}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-right text-xs tabular-nums xl:table-cell">
                          <span className="text-success-foreground">
                            +{p.diffSummary.additions}
                          </span>{" "}
                          <span className="text-danger-foreground">−{p.diffSummary.deletions}</span>
                          <span className="text-muted-foreground block">
                            {p.diffSummary.files} files
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChainIcon valid={p.chainValid} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
