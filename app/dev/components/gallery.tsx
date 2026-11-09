"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActorChip } from "@/components/shared/actor-chip";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { HealthBreakdown } from "@/components/shared/health-breakdown";
import { HealthPill, HealthScore } from "@/components/shared/health-score";
import { KpiCard } from "@/components/shared/kpi-card";
import { LifecycleStepper } from "@/components/shared/lifecycle";
import { LogViewer } from "@/components/shared/log-viewer";
import { CommitSha, MockDataBadge, ModuleBadge, Monogram, PlanBadge } from "@/components/shared/misc";
import { FailureList, RunSummary } from "@/components/shared/run-summary";
import { FailureClassBadge, RunStatusBadge, SessionStatusBadge, SeverityBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UsageMeter } from "@/components/shared/usage-meter";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { TASK_STATUSES, type ActivityItem, type DiffFile, type LifecycleStep, type TestResult, type TestRun } from "@/lib/schemas";

const SHA = "3f9c2a1b7d4e5f60718293a4b5c6d7e8f9012345";
const run: TestRun = {
  id: "run_demo", orgId: "ws", repositoryId: "repo", pullRequestId: "pr", trigger: "pull_request.opened", headSha: SHA, baseSha: "9a8b7c6d5e4f30211234567890abcdef12345678", branch: "fp/task-042-saved-filters",
  environment: { name: "preview", url: "https://pr-412.preview.example", node: "22.11", python: null, worker: "ss-worker-42", region: "us-east" },
  status: "failed", startedAt: "2026-11-09T09:40:00Z", finishedAt: "2026-11-09T09:47:12Z", durationSec: 432, selectedSuites: [], retestOf: null,
  checkRun: { name: "ForgePilot ShipSafe", conclusion: "failure", detailsUrl: "#" }, totals: { passed: 186, failed: 1, flaky: 1, skipped: 2 }, billedBrowserMinutes: 11.5,
};
const results: TestResult[] = [
  { id: "r1", runId: "run_demo", suiteId: "s", name: "billing.spec.ts › updates card on file", outcome: "failed", classification: "product_defect", durationMs: 8400, retries: 0, error: "Expected 'Card updated' toast, received nothing. POST /api/billing/card returned 500.", evidence: [{ kind: "screenshot", label: "Failure screenshot", ref: "a/1.png" }, { kind: "trace", label: "Playwright trace", ref: "a/trace.zip" }, { kind: "console", label: "Browser console", ref: "a/c.log" }], firstFailedAt: null },
  { id: "r2", runId: "run_demo", suiteId: "s", name: "billing.spec.ts › shows invoice history", outcome: "flaky", classification: "flaky", durationMs: 12000, retries: 1, error: "Timed out waiting for selector (passed on retry).", evidence: [], firstFailedAt: null },
];
const actors = {
  agent: { type: "agent" as const, id: "agent_claude", name: "Claude Code", detail: "claude-sonnet" },
  person: { type: "person" as const, id: "u_dev", name: "Dev Patel", detail: "Staff engineer" },
  system: { type: "system" as const, id: "shipsafe", name: "ShipSafe", detail: "Verification" },
};
const activity: ActivityItem[] = [
  { id: "a1", orgId: "ws", actor: { type: "person", id: "u_dev" }, actorResolved: actors.person, action: "task.created", label: "created a task", resource: "task:t1", href: "#", at: "2026-11-09T09:00:00Z", detail: "Add saved filters", ip: null },
  { id: "a2", orgId: "ws", actor: { type: "agent", id: "agent_claude" }, actorResolved: actors.agent, action: "pull_request.opened", label: "opened a pull request", resource: "pr:p1", href: "#", at: "2026-11-09T09:31:00Z", detail: "#412 Add saved filters", ip: null },
  { id: "a3", orgId: "ws", actor: { type: "system", id: "shipsafe" }, actorResolved: actors.system, action: "test.failed", label: "verification failed", resource: "run:r1", href: "#", at: "2026-11-09T09:47:00Z", detail: "186 passed · 1 failed", ip: null },
];
const steps: LifecycleStep[] = [
  { key: "plan", label: "Plan", state: "done", detail: "3 criteria", href: null },
  { key: "execute", label: "Execute", state: "done", detail: null, href: null },
  { key: "propose", label: "Propose", state: "done", detail: "PR #412", href: null },
  { key: "verify", label: "Verify", state: "failed", detail: "1 defect", href: null },
  { key: "remediate", label: "Remediate", state: "current", detail: "Fix task running", href: null },
  { key: "review", label: "Review", state: "upcoming", detail: null, href: null },
  { key: "merge", label: "Merge", state: "upcoming", detail: "In GitHub", href: null },
  { key: "maintain", label: "Maintain", state: "upcoming", detail: null, href: null },
];
const diff: DiffFile[] = [
  { path: "src/lib/http/retry.ts", status: "modified", additions: 3, deletions: 1, aiAuthored: true, lines: [{ kind: "hunk", oldNo: null, newNo: null, text: "@@ -10,4 +10,6 @@" }, { kind: "context", oldNo: 10, newNo: 10, text: "export async function confirm(req) {" }, { kind: "del", oldNo: 11, newNo: null, text: "  return fetch(URL);" }, { kind: "add", oldNo: null, newNo: 11, text: "  return withRetry(() => fetch(URL), { attempts: 3 });" }, { kind: "context", oldNo: 12, newNo: 12, text: "}" }] },
];
const log = [
  { seq: 0, at: "2026-11-09T09:00:00Z", level: "info" as const, text: "Workspace ready · container 2 vCPU / 4 GB · network: allowlist" },
  { seq: 1, at: "2026-11-09T09:00:02Z", level: "tool" as const, text: "edit src/components/Filters.tsx (+18 −6)" },
  { seq: 2, at: "2026-11-09T09:00:05Z", level: "approval" as const, text: "Paused: waiting for approval to write migrations/0042.py" },
  { seq: 3, at: "2026-11-09T09:00:09Z", level: "success" as const, text: "tests: 64 passed" },
];

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

function Specimen() {
  return (
    <div className="flex flex-col gap-6">
      <Row title="Buttons (violet = primary only)">
        <Button>Launch agent</Button>
        <Button variant="outline">Retry with notes</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Cancel session</Button>
        <Button disabled>Disabled</Button>
      </Row>
      <Row title="Task status">{TASK_STATUSES.map((s) => <TaskStatusBadge key={s} status={s} />)}</Row>
      <Row title="Sessions, runs, failure classes, severity">
        <SessionStatusBadge status="running" />
        <SessionStatusBadge status="waiting" />
        <RunStatusBadge status="passed" />
        <RunStatusBadge status="failed" />
        <RunStatusBadge status="errored" />
        <FailureClassBadge classification="product_defect" />
        <FailureClassBadge classification="flaky" />
        <FailureClassBadge classification="infrastructure" />
        <SeverityBadge severity="critical" />
        <SeverityBadge severity="medium" />
      </Row>
      <Row title="Brand & misc">
        <ModuleBadge module="devpilot" />
        <ModuleBadge module="shipsafe" />
        <ModuleBadge module="codekeeper" />
        <PlanBadge plan="team" />
        <MockDataBadge />
        <CommitSha sha={SHA} />
        <Monogram text="GH" />
        <Badge variant="info">Beta</Badge>
        <AiCodeFlag pct={88} />
      </Row>
      <Row title="ActorChip: agent vs person vs system">
        <ActorChip actor={actors.agent} />
        <ActorChip actor={actors.person} />
        <ActorChip actor={actors.system} />
      </Row>
      <Row title="Health (≥80 green · 60–79 amber · <60 red · unknown)">
        <HealthScore score={86} delta={4} />
        <HealthScore score={68} delta={-2} showLabel />
        <HealthScore score={52} size={72} />
        <HealthScore score={null} showLabel />
        <HealthPill score={91} />
        <HealthPill score={66} />
        <HealthPill score={41} />
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Verified tasks" value="38" delta={6} hint="vs last month" spark={[3, 4, 2, 5, 6, 7, 6, 9]} tone="success" />
        <KpiCard label="Execution spend" value="$312" hint="of $400 budget" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <UsageMeter label="Agent runtime" used={4120} limit={6000} projected={7300} unit="min" />
          <UsageMeter label="Browser minutes" used={9100} limit={20000} projected={15000} unit="min" />
          <UsageMeter label="Seats" used={6} limit={null} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>LifecycleStepper</CardTitle>
        </CardHeader>
        <CardContent>
          <LifecycleStepper steps={steps} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>HealthBreakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthBreakdown health={{ score: 74, scoreVersion: "v1.2", dependencies: 68, security: 54, buildStability: 88, tests: 81, docs: null }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>RunSummary & FailureList</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RunSummary run={run} />
          <FailureList results={results} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>LogViewer</CardTitle>
        </CardHeader>
        <CardContent>
          <LogViewer lines={log} live redactions={1} height="h-40" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ActivityTimeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline items={activity} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>DiffViewer</CardTitle>
        </CardHeader>
        <CardContent>
          <DiffViewer files={diff} />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <EmptyState title="No agent sessions yet" description="Delegate a task to watch an agent work." />
        <ErrorState error={new Error("Mock API unavailable")} onRetry={() => {}} />
      </div>
    </div>
  );
}

export function Gallery() {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-muted-foreground text-sm">Component gallery</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to site</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="grid gap-0 xl:grid-cols-2">
        <div className="light bg-background text-foreground p-6" data-theme-panel="light">
          <h2 className="mb-4 font-semibold">Light theme</h2>
          <Specimen />
        </div>
        <div className="dark bg-background text-foreground border-l p-6" data-theme-panel="dark">
          <h2 className="mb-4 font-semibold">Dark theme</h2>
          <Specimen />
        </div>
      </main>
    </div>
  );
}
