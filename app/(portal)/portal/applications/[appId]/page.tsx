"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileCheck2Icon,
  FolderGit2Icon,
  ShieldCheckIcon,
  ShieldXIcon,
  WrenchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthBreakdown } from "@/components/shared/health-breakdown";
import { HealthPill, HealthScore } from "@/components/shared/health-score";
import {
  CriticalityBadge,
  MockDataBadge,
  SeverityBadge,
  SlaStatusBadge,
} from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
  QueryState,
  TableSkeleton,
} from "@/components/shared/states";
import { StatusBadge, ToneBadge, VerificationBadge } from "@/components/shared/status-badge";
import { HealthTrendChart } from "@/components/portal/charts";
import { downloadBlob, Meta, StubLabel, useUrlParams } from "@/components/portal/portal-utils";
import { TaskTable } from "@/components/portal/task-table";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { useApplication, useEvidence } from "@/lib/api/hooks";
import { formatDate, formatDateTime, formatRelative } from "@/lib/domain/format";
import { HEALTH_DIMENSION_LABEL, LANGUAGE_LABEL, repoName, TIER_LABEL } from "@/lib/domain/labels";
import type { ApplicationDetail } from "@/lib/schemas";

const TABS = ["health", "work", "repositories", "evidence"] as const;
type Tab = (typeof TABS)[number];

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const FINDING_STATUS_LABEL = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
} as const;

/** Phase 1 stub: a plain-text report generated in the browser, clearly marked as such. */
function downloadHealthReportStub(d: ApplicationDetail) {
  const a = d.application;
  const lines = [
    "FORGEPILOT HEALTH REPORT — STUB (Phase 1 demo; the PDF report is not built yet)",
    "Generated from mock data. Not for distribution.",
    "",
    `Application: ${a.name} (${d.organization.name})`,
    `Generated: ${new Date().toISOString()}`,
    `Health score: ${d.health.score}/100 (change over 4 weeks: ${a.healthDelta >= 0 ? "+" : ""}${a.healthDelta})`,
    "",
    "Dimensions:",
    ...(["dependencies", "security", "buildStability", "tests", "docs"] as const).map(
      (k) => `  - ${HEALTH_DIMENSION_LABEL[k]}: ${d.health[k]}`,
    ),
    "",
    `Open findings (${d.findings.filter((f) => f.status !== "resolved").length}):`,
    ...d.findings
      .filter((f) => f.status !== "resolved")
      .map(
        (f) =>
          `  - [${f.severity.toUpperCase()}] ${f.title} (${f.repositoryName}) — ${f.recommendation}`,
      ),
  ];
  downloadBlob(`health-report-${a.id}-STUB.txt`, lines.join("\n"), "text/plain");
  toast.info("Health report stub downloaded", {
    description:
      "The branded PDF report arrives in a later phase. This is a plain-text stub from demo data.",
  });
}

function HealthTab({ d }: { d: ApplicationDetail }) {
  const findings = [...d.findings].sort(
    (a, b) =>
      Number(a.status === "resolved") - Number(b.status === "resolved") ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  const history = d.history.map((h) => ({ weekStart: h.weekStart, score: h.score }));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle>Health score</CardTitle>
            <CardDescription>Weighted across five dimensions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <HealthScore
              score={d.health.score}
              delta={d.application.healthDelta}
              size={88}
              showLabel
            />
            <HealthBreakdown health={d.health} />
          </CardContent>
        </Card>
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader>
            <CardTitle>12-week history</CardTitle>
            <CardDescription>Weekly health score for {d.application.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length ? (
              <HealthTrendChart data={history} label={`${d.application.name} health score`} />
            ) : (
              <EmptyState
                title="No history yet"
                description="History builds up after the first weekly scan."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>What the scans found and what ForgePilot recommends</CardDescription>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <EmptyState
              icon={ShieldCheckIcon}
              title="No findings"
              description="The latest scans found nothing to fix."
            />
          ) : (
            <ul className="flex flex-col divide-y">
              {findings.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 md:flex-row md:items-start md:gap-4"
                >
                  <div className="flex shrink-0 items-center gap-2 md:w-24">
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{f.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {HEALTH_DIMENSION_LABEL[f.dimension]} · {f.repositoryName} · detected{" "}
                      {formatDate(f.detectedAt)}
                    </span>
                    <span className="text-sm">
                      <span className="text-muted-foreground">Recommendation: </span>
                      {f.recommendation}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <ToneBadge
                      tone={
                        f.status === "resolved"
                          ? "success"
                          : f.status === "in_progress"
                            ? "info"
                            : "warning"
                      }
                    >
                      {FINDING_STATUS_LABEL[f.status]}
                    </ToneBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RepositoriesTab({ d }: { d: ApplicationDetail }) {
  if (!d.repositories.length)
    return (
      <EmptyState
        icon={FolderGit2Icon}
        title="No repositories mapped"
        description="Map a repository to this application so ForgePilot can scan and maintain it."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/settings?tab=integrations">Check Git integration</Link>
          </Button>
        }
      />
    );
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {d.repositories.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 truncate font-mono text-sm font-medium hover:underline"
              >
                {repoName(r.url)}
                <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                <span className="sr-only">(opens your Git provider in a new tab)</span>
              </a>
              <span className="text-muted-foreground text-xs">
                {LANGUAGE_LABEL[r.language] ?? r.language} · {r.defaultBranch}
              </span>
            </div>
            <HealthPill score={r.health.score} />
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <Meta label="Coverage">
              <span className="tabular-nums">{r.coveragePct}%</span>
            </Meta>
            <Meta label="Flaky tests">
              {r.flakyTests > 0 ? (
                <Badge variant="warning">{r.flakyTests} flaky</Badge>
              ) : (
                <Badge variant="success">None</Badge>
              )}
            </Meta>
            <Meta label="Last scan">
              <time dateTime={r.lastScanAt} title={formatDateTime(r.lastScanAt)}>
                {formatRelative(r.lastScanAt)}
              </time>
            </Meta>
          </dl>
        </Card>
      ))}
    </div>
  );
}

function EvidenceTab({ appId }: { appId: string }) {
  const q = useEvidence({ applicationId: appId });
  return (
    <QueryState
      query={q}
      loading={<TableSkeleton rows={4} cols={4} />}
      isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState
          icon={FileCheck2Icon}
          title="No evidence yet"
          description="Evidence packs appear as soon as work starts on this application."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/evidence">Open evidence library</Link>
            </Button>
          }
        />
      }
    >
      {(packs) => (
        <ul className="flex flex-col divide-y rounded-lg border">
          {packs.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/portal/work/${p.task.id}#evidence`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {p.task.title}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {p.agentLabel} · {p.records.length} records · last event{" "}
                  {formatRelative(p.lastEventAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge state={p.task.state} />
                <VerificationBadge status={p.verification?.status} />
                {p.chainValid ? (
                  <span className="text-success-foreground inline-flex items-center gap-1 text-xs">
                    <ShieldCheckIcon className="size-3.5" aria-hidden /> Chain intact
                  </span>
                ) : (
                  <span className="text-danger-foreground inline-flex items-center gap-1 text-xs">
                    <ShieldXIcon className="size-3.5" aria-hidden /> Chain broken
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}

export default function ApplicationDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const q = useApplication(appId);
  const url = useUrlParams();
  const tabParam = url.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : "health";
  useBreadcrumbLabel(appId, q.data?.application.name);

  if (q.isPending) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const a = d.application;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={a.name}
        description={a.description}
        meta={
          <>
            <CriticalityBadge criticality={a.criticality} />
            <SlaStatusBadge status={a.slaStatus} />
            <MockDataBadge />
          </>
        }
        actions={
          <Button variant="outline" onClick={() => downloadHealthReportStub(d)}>
            <DownloadIcon aria-hidden /> Download health report <StubLabel />
          </Button>
        }
      />
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-4">
        <Meta label="Owners">
          {d.owners.length ? (
            d.owners.map((o) => o.name).join(", ")
          ) : (
            <span className="text-muted-foreground">No owner set</span>
          )}
        </Meta>
        <Meta label="Tier">{a.tier ? TIER_LABEL[a.tier] : TIER_LABEL[d.organization.tier]}</Meta>
        <Meta label="Environments">
          <span className="flex flex-wrap gap-1">
            {a.environments.map((e) => (
              <Badge key={e} variant="outline">
                {e}
              </Badge>
            ))}
          </span>
        </Meta>
        <Meta label="Open tasks">
          <span className="tabular-nums">{a.openTasks}</span>
        </Meta>
      </dl>
      <Tabs value={tab} onValueChange={(v) => url.set({ tab: v === "health" ? null : v })}>
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="work">
            <WrenchIcon aria-hidden /> Work
            <span className="text-muted-foreground text-xs tabular-nums">{d.tasks.length}</span>
          </TabsTrigger>
          <TabsTrigger value="repositories">
            Repositories{" "}
            <span className="text-muted-foreground text-xs tabular-nums">
              {d.repositories.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>
        <TabsContent value="health">
          <HealthTab d={d} />
        </TabsContent>
        <TabsContent value="work">
          <TaskTable
            tasks={d.tasks}
            showApp={false}
            caption={`Tasks for ${a.name}`}
            empty={
              <EmptyState
                icon={WrenchIcon}
                title="No work for this application yet"
                description="Tasks appear here when ForgePilot plans upgrades, patches or fixes."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/portal/work">See all work</Link>
                  </Button>
                }
              />
            }
          />
        </TabsContent>
        <TabsContent value="repositories">
          <RepositoriesTab d={d} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceTab appId={a.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
