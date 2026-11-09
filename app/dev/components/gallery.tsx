"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActorChip } from "@/components/shared/actor-chip";
import { AiCodeFlag } from "@/components/shared/ai-code-flag";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { EvidenceTimeline } from "@/components/shared/evidence-timeline";
import { HealthBreakdown } from "@/components/shared/health-breakdown";
import { HealthPill, HealthScore } from "@/components/shared/health-score";
import { KpiCard } from "@/components/shared/kpi-card";
import { CriticalityBadge, MockDataBadge, SeverityBadge, SlaStatusBadge, TaskTypeBadge } from "@/components/shared/misc";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { SlaMeter } from "@/components/shared/sla-meter";
import { StatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { VerificationSummary } from "@/components/shared/verification-summary";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { TASK_STATES, type DiffFile, type EvidenceItem, type VerificationRun } from "@/lib/schemas";

const ver: VerificationRun = {
  id: "ver_demo",
  agentRunId: "run_demo",
  testsRun: 128,
  testsPassed: 128,
  testsFailed: 0,
  securityFindings: { critical: 0, high: 0, medium: 1 },
  riskScore: 24,
  status: "passed",
  durationMin: 12,
  coveragePct: 71,
  testResults: [
    { name: "retries on 503 with back-off", suite: "integration", status: "passed", durationMs: 840, flaky: false },
    { name: "renders confirmation within 2s", suite: "e2e", status: "passed", durationMs: 2310, flaky: true },
  ],
  artifacts: [
    { kind: "screenshot", label: "Before / after", url: "#" },
    { kind: "log", label: "Full test log", url: "#" },
  ],
  scanners: ["Semgrep", "Trivy"],
};

const ev = (i: number, event: EvidenceItem["event"], actor: EvidenceItem["actorResolved"], payload: Record<string, unknown> = {}): EvidenceItem => ({
  id: `ev_${i}`,
  taskId: "task_demo",
  event,
  actor: { type: actor.type, id: actor.id },
  actorResolved: actor,
  at: new Date(Date.UTC(2026, 10, 8, 9, i * 7)).toISOString().replace(/\.\d{3}Z$/, "Z"),
  payload,
  hash: `a1b2c3d4e5f6${i}0`.padEnd(16, "0"),
  prevHash: i ? `a1b2c3d4e5f6${i - 1}0`.padEnd(16, "0") : null,
  hashValid: true,
});

const people = {
  kabir: { type: "person" as const, id: "u_kabir", name: "Kabir Singh", detail: "Delivery Manager" },
  agent: { type: "agent" as const, id: "claude_code:claude-sonnet", name: "Claude Code", detail: "claude-sonnet" },
  sys: { type: "system" as const, id: "verification-engine", name: "Verification engine", detail: "Tests + security scans" },
  arjun: { type: "person" as const, id: "u_arjun", name: "Arjun Rao", detail: "Senior Engineer" },
};

const records = [
  ev(0, "task_created", people.kabir, { source: "JIRA-1009" }),
  ev(1, "agent_run_started", people.agent, { attempt: 1 }),
  ev(2, "verification_passed", people.sys, { testsPassed: 128, riskScore: 24 }),
  ev(3, "engineer_signed_off", people.arjun, { reviewedDiff: true }),
];

const diff: DiffFile[] = [
  {
    path: "src/lib/http/retry.ts",
    status: "modified",
    additions: 3,
    deletions: 1,
    aiAuthored: true,
    lines: [
      { kind: "hunk", oldNo: null, newNo: null, text: "@@ -10,4 +10,6 @@" },
      { kind: "context", oldNo: 10, newNo: 10, text: "export async function confirm(req) {" },
      { kind: "del", oldNo: 11, newNo: null, text: "  return fetch(URL);" },
      { kind: "add", oldNo: null, newNo: 11, text: "  return withRetry(() => fetch(URL), {" },
      { kind: "add", oldNo: null, newNo: 12, text: "    attempts: 3," },
      { kind: "add", oldNo: null, newNo: 13, text: "  });" },
      { kind: "context", oldNo: 12, newNo: 14, text: "}" },
    ],
  },
];

// Sample due dates relative to page load (module scope keeps render pure).
const LOADED_AT = Date.now();
const SAMPLE_DUE = {
  ok: new Date(LOADED_AT + 3 * 86_400_000).toISOString(),
  atRisk: new Date(LOADED_AT + 5 * 3_600_000).toISOString(),
  breached: new Date(LOADED_AT - 2 * 3_600_000).toISOString(),
  met: new Date(LOADED_AT).toISOString(),
};

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
      <Row title="Buttons (accent = primary actions only)">
        <Button>Approve</Button>
        <Button variant="outline">Request changes</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Stop</Button>
        <Button disabled>Disabled</Button>
      </Row>
      <Row title="StatusBadge — every task state">
        {TASK_STATES.map((s) => (
          <StatusBadge key={s} state={s} />
        ))}
      </Row>
      <Row title="Verification, SLA, type, severity, criticality">
        <VerificationBadge status="passed" />
        <VerificationBadge status="failed" />
        <VerificationBadge status="running" />
        <SlaStatusBadge status="on_track" />
        <SlaStatusBadge status="at_risk" />
        <SlaStatusBadge status="breached" />
        <TaskTypeBadge type="cve_patch" />
        <SeverityBadge severity="critical" />
        <SeverityBadge severity="medium" />
        <CriticalityBadge criticality="critical" />
        <MockDataBadge />
        <Badge variant="info">Info</Badge>
      </Row>
      <Row title="ActorChip — agent vs person vs system">
        <ActorChip actor={people.agent} />
        <ActorChip actor={people.arjun} />
        <ActorChip actor={people.sys} />
      </Row>
      <Row title="AiCodeFlag">
        <AiCodeFlag pct={78} />
        <AiCodeFlag pct={22} />
      </Row>
      <Row title="HealthScore & HealthPill (≥80 green · 60–79 amber · <60 red)">
        <HealthScore score={86} delta={4} />
        <HealthScore score={68} delta={-2} showLabel />
        <HealthScore score={52} delta={0} size={72} />
        <HealthPill score={91} />
        <HealthPill score={66} />
        <HealthPill score={41} />
      </Row>
      <Row title="SlaCountdown">
        <SlaCountdown dueAt={SAMPLE_DUE.ok} risk="ok" />
        <SlaCountdown dueAt={SAMPLE_DUE.atRisk} risk="at_risk" />
        <SlaCountdown dueAt={SAMPLE_DUE.breached} risk="breached" />
        <SlaCountdown dueAt={SAMPLE_DUE.met} risk="met" />
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="SLA met" value="96.4%" delta={1.2} deltaLabel="1.2 pts" hint="target 95%" tone="success" />
        <KpiCard label="Changes delivered" value="14" delta={3} hint="vs previous 30 days" spark={[2, 3, 1, 4, 3, 5, 4, 6]} />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <SlaMeter metPct={96.4} targetPct={95} breaches={0} />
          <SlaMeter metPct={88} targetPct={95} breaches={2} label="Approval turnaround" />
          <SlaMeter metPct={71} targetPct={95} breaches={5} label="Critical CVEs" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>HealthBreakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthBreakdown health={{ score: 72, dependencies: 68, security: 54, buildStability: 88, tests: 61, docs: 83 }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>VerificationSummary</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationSummary verification={ver} detailed />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>EvidenceTimeline</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceTimeline records={records} chainValid />
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
        <EmptyState title="You're all caught up" description="No approvals waiting." />
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
          <span className="text-muted-foreground text-sm">Component gallery (FE-02)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Back to app</Link>
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
