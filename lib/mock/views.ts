/**
 * Read models: turn raw mock entities into the API response shapes in
 * lib/schemas/api.ts. Every number here is computed from the mock data —
 * nothing is hard-coded (product rule 5).
 */
import type {
  ActivityItem,
  ApplicationSummary,
  AttentionItem,
  ClientSummary,
  EvidenceItem,
  EvidencePack,
  EvidenceRecord,
  MockDb,
  OpsDashboard,
  PortalOverview,
  RepositorySummary,
  ResolvedActor,
  SavingsReport,
  SlaReport,
  SlaStatus,
  Task,
  TaskListItem,
  User,
} from "@/lib/schemas";
import { AGENT_LABEL, ROLE_LABEL, TASK_STATE_LABEL, repoName } from "@/lib/domain/labels";
import { DONE_STATES, isOpenTask } from "@/lib/domain/status";
import { hoursBetween, percentile, taskSlaRisk } from "@/lib/domain/sla";
import { verifyChain } from "@/lib/domain/hash";
import { generateDiff, diffStats } from "./generators";

const DAY = 86_400_000;

// ---------------------------------------------------------------- actors & evidence
const SYSTEM_NAMES: Record<string, [string, string]> = {
  "verification-engine": ["Verification engine", "Tests + security scans"],
  forgepilot: ["ForgePilot", "Platform"],
  "client-git": ["Client Git", "Your branch rules"],
  scanner: ["Health scanner", "Repository scan"],
};

export function resolveActor(db: MockDb, actor: EvidenceRecord["actor"]): ResolvedActor {
  if (actor.type === "person") {
    const u = db.users.find((x) => x.id === actor.id);
    return {
      type: "person",
      id: actor.id,
      name: u?.name ?? actor.id,
      detail: u ? (u.title ? `${u.title}` : ROLE_LABEL[u.role]) : "Unknown person",
    };
  }
  if (actor.type === "agent") {
    const [kind, model] = actor.id.split(":");
    const label = AGENT_LABEL[kind as keyof typeof AGENT_LABEL] ?? kind;
    return { type: "agent", id: actor.id, name: label, detail: model ?? "" };
  }
  const [name, detail] = SYSTEM_NAMES[actor.id] ?? [actor.id, "System"];
  return { type: "system", id: actor.id, name, detail };
}

export function evidenceFor(db: MockDb, taskId: string): { items: EvidenceItem[]; chainValid: boolean } {
  const records = db.evidenceRecords
    .filter((e) => e.taskId === taskId)
    .sort((a, b) => a.at.localeCompare(b.at));
  // Chain order is insertion order (not time order) — verify on insertion order.
  const inserted = db.evidenceRecords.filter((e) => e.taskId === taskId);
  const validity = verifyChain(inserted);
  const validById = new Map(inserted.map((r, i) => [r.id, validity[i]]));
  const items = records.map((r) => ({
    ...r,
    actorResolved: resolveActor(db, r.actor),
    hashValid: validById.get(r.id) ?? false,
  }));
  return { items, chainValid: validity.every(Boolean) };
}

function eventAt(db: MockDb, taskId: string, event: EvidenceRecord["event"]): string | null {
  const recs = db.evidenceRecords.filter((e) => e.taskId === taskId && e.event === event);
  return recs.length ? recs[recs.length - 1].at : null;
}

/** When the change was handed to the client (PR opened). */
export function deliveredAt(db: MockDb, taskId: string) {
  return eventAt(db, taskId, "pr_opened");
}

export function signOffFor(db: MockDb, taskId: string) {
  const rec = [...db.evidenceRecords]
    .reverse()
    .find((e) => e.taskId === taskId && e.event === "engineer_signed_off");
  if (!rec) return null;
  return { by: resolveActor(db, rec.actor).name, at: rec.at };
}

// ---------------------------------------------------------------- tasks
export function taskListItem(db: MockDb, task: Task, now = Date.now()): TaskListItem {
  const app = db.applications.find((a) => a.id === task.applicationId);
  const org = db.organizations.find((o) => o.id === task.orgId);
  const repo = db.repositories.find((r) => r.id === task.repositoryId);
  const runs = db.agentRuns.filter((r) => r.taskId === task.id).sort((a, b) => a.attempt - b.attempt);
  const latestRun = runs.at(-1) ?? null;
  const latestVerification = latestRun
    ? (db.verificationRuns.filter((v) => v.agentRunId === latestRun.id).at(-1) ?? null)
    : null;
  const evidence = evidenceFor(db, task.id).items;
  return {
    ...task,
    applicationName: app?.name ?? task.applicationId,
    organizationName: org?.name ?? task.orgId,
    repositoryName: repo ? repoName(repo.url) : task.repositoryId,
    assignee: db.users.find((u) => u.id === task.assigneeUserId) ?? null,
    latestRun,
    latestVerification,
    pullRequest: db.pullRequests.find((p) => p.taskId === task.id) ?? null,
    slaRisk: taskSlaRisk(task.state, task.slaDueAt, now, deliveredAt(db, task.id)),
    lastEvent: evidence.at(-1) ?? null,
    attempts: runs.length,
  };
}

export function slaMetPct(items: Pick<TaskListItem, "slaRisk">[]) {
  const judged = items.filter((t) => ["met", "missed", "breached"].includes(t.slaRisk));
  if (!judged.length) return 100;
  return Math.round((judged.filter((t) => t.slaRisk === "met").length / judged.length) * 1000) / 10;
}

function slaStatusFrom(items: TaskListItem[], targetPct: number): SlaStatus {
  if (items.some((t) => t.slaRisk === "breached")) return "breached";
  if (items.some((t) => t.slaRisk === "at_risk") || slaMetPct(items) < targetPct) return "at_risk";
  return "on_track";
}

// ---------------------------------------------------------------- applications
export function appHealth(db: MockDb, appId: string) {
  const repos = db.repositories.filter((r) => r.applicationId === appId);
  const avg = (k: keyof (typeof repos)[number]["health"]) =>
    repos.length ? Math.round(repos.reduce((s, r) => s + r.health[k], 0) / repos.length) : 0;
  return {
    score: avg("score"),
    dependencies: avg("dependencies"),
    security: avg("security"),
    buildStability: avg("buildStability"),
    tests: avg("tests"),
    docs: avg("docs"),
  };
}

export function applicationSummary(db: MockDb, appId: string, now = Date.now()): ApplicationSummary {
  const app = db.applications.find((a) => a.id === appId)!;
  const repos = db.repositories.filter((r) => r.applicationId === appId);
  const tasks = db.tasks.filter((t) => t.applicationId === appId).map((t) => taskListItem(db, t, now));
  const hist = db.healthHistory.filter((h) => h.applicationId === appId).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const health = appHealth(db, appId).score;
  const fourWeeksAgo = hist.at(-5)?.score ?? health;
  const contract = db.contracts.find((c) => c.orgId === app.orgId);
  return {
    ...app,
    organizationName: db.organizations.find((o) => o.id === app.orgId)?.name ?? "",
    repoCount: repos.length,
    healthScore: health,
    healthDelta: health - fourWeeksAgo,
    openTasks: tasks.filter((t) => isOpenTask(t.state)).length,
    slaStatus: slaStatusFrom(tasks, contract?.slaTargets.slaMetTargetPct ?? 95),
    languages: [...new Set(repos.map((r) => r.language))],
  };
}

export function repositorySummary(db: MockDb, repoId: string): RepositorySummary {
  const repo = db.repositories.find((r) => r.id === repoId)!;
  const app = db.applications.find((a) => a.id === repo.applicationId)!;
  const org = db.organizations.find((o) => o.id === app.orgId)!;
  const findings = db.findings.filter((f) => f.repositoryId === repoId && f.status !== "resolved");
  return {
    ...repo,
    name: repoName(repo.url),
    applicationName: app.name,
    organizationId: org.id,
    organizationName: org.name,
    openFindings: findings.length,
    criticalFindings: findings.filter((f) => f.severity === "critical").length,
    scanRunning: db.scans.some((s) => s.repositoryId === repoId && s.status === "running"),
  };
}

// ---------------------------------------------------------------- activity & overview
export function activityFor(db: MockDb, orgIds: string[], limit = 10): ActivityItem[] {
  const tasks = new Map(db.tasks.filter((t) => orgIds.includes(t.orgId)).map((t) => [t.id, t]));
  return db.evidenceRecords
    .filter((e) => tasks.has(e.taskId))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((e) => {
      const t = tasks.get(e.taskId)!;
      return {
        ...e,
        actorResolved: resolveActor(db, e.actor),
        hashValid: true,
        taskTitle: t.title,
        applicationName: db.applications.find((a) => a.id === t.applicationId)?.name ?? "",
        href: `/portal/work/${t.id}`,
      };
    });
}

function weeklyBuckets(now: number, weeks: number) {
  return Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * 7 * DAY;
    return { start: end - 7 * DAY, end };
  });
}

export function portalOverview(db: MockDb, orgId: string, now = Date.now()): PortalOverview {
  const apps = db.applications.filter((a) => a.orgId === orgId);
  const contract = db.contracts.find((c) => c.orgId === orgId);
  const items = db.tasks.filter((t) => t.orgId === orgId).map((t) => taskListItem(db, t, now));
  const delivered = items
    .map((t) => ({ t, at: deliveredAt(db, t.id) }))
    .filter((x): x is { t: TaskListItem; at: string } => x.at !== null);
  const inWindow = (at: string, from: number, to: number) => {
    const ms = Date.parse(at);
    return ms > from && ms <= to;
  };
  const last30 = delivered.filter((x) => inWindow(x.at, now - 30 * DAY, now));
  const prev30 = delivered.filter((x) => inWindow(x.at, now - 60 * DAY, now - 30 * DAY));
  const weeks = weeklyBuckets(now, 8);
  const savings = savingsReportFor(db, orgId, "last30", now);
  const prevSavings = savingsReportFor(db, orgId, "prev30", now);
  const openApprovals = items.filter((t) => t.state === "pr_open");

  // Health trend: average app score per week.
  const byWeek = new Map<string, number[]>();
  db.healthHistory
    .filter((h) => apps.some((a) => a.id === h.applicationId))
    .forEach((h) => byWeek.set(h.weekStart, [...(byWeek.get(h.weekStart) ?? []), h.score]));
  const healthTrend = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([weekStart, scores]) => ({
      weekStart,
      score: Math.round(scores.reduce((s, x) => s + x, 0) / scores.length),
    }));

  const attention: AttentionItem[] = [];
  openApprovals.forEach((t) =>
    attention.push({
      id: `apr_${t.id}`,
      kind: "approval",
      title: `Approve PR #${t.pullRequest?.number ?? ""}: ${t.title}`,
      detail: `${t.applicationName} · waiting ${Math.max(0, Math.round(hoursBetween(t.pullRequest?.openedAt ?? t.createdAt, now)))}h`,
      href: `/portal/work/${t.id}`,
      severity: "warning",
    }),
  );
  items
    .filter((t) => t.slaRisk === "at_risk" || t.slaRisk === "breached")
    .forEach((t) =>
      attention.push({
        id: `sla_${t.id}`,
        kind: "sla_risk",
        title: `${t.slaRisk === "breached" ? "SLA breached" : "SLA at risk"}: ${t.title}`,
        detail: `${t.applicationName} · ${TASK_STATE_LABEL[t.state]}`,
        href: `/portal/work/${t.id}`,
        severity: t.slaRisk === "breached" ? "danger" : "warning",
      }),
    );
  const repoIds = new Set(db.repositories.filter((r) => apps.some((a) => a.id === r.applicationId)).map((r) => r.id));
  db.findings
    .filter((f) => repoIds.has(f.repositoryId) && f.severity === "critical" && f.status !== "resolved")
    .forEach((f) => {
      const repo = db.repositories.find((r) => r.id === f.repositoryId)!;
      const app = apps.find((a) => a.id === repo.applicationId)!;
      attention.push({
        id: `cve_${f.id}`,
        kind: "critical_cve",
        title: f.title,
        detail: `${app.name} · ${repoName(repo.url)}`,
        href: `/portal/applications/${app.id}`,
        severity: "danger",
      });
    });
  db.integrations
    .filter((i) => i.orgId === orgId && i.status === "error")
    .forEach((i) =>
      attention.push({
        id: `int_${i.id}`,
        kind: "integration_error",
        title: `Integration needs attention: ${i.providerId}`,
        detail: i.error ?? "Connection error",
        href: "/portal/settings?tab=integrations",
        severity: "info",
      }),
    );
  const order = { danger: 0, warning: 1, info: 2 } as const;
  attention.sort((a, b) => order[a.severity] - order[b.severity]);

  const metNow = slaMetPct(items);
  const prevItems = items.filter((t) => Date.parse(t.slaDueAt) < now - 30 * DAY);
  return {
    kpis: {
      applicationsCovered: { value: apps.length, previous: null, spark: [] },
      slaMetPct: {
        value: metNow,
        previous: prevItems.length ? slaMetPct(prevItems) : null,
        spark: [],
        target: contract?.slaTargets.slaMetTargetPct ?? 95,
      },
      changesDelivered: {
        value: last30.length,
        previous: prev30.length,
        spark: weeks.map((w) => delivered.filter((x) => inWindow(x.at, w.start, w.end)).length),
      },
      estimatedSavingUsd: {
        value: savings.totals.savingUsd,
        previous: prevSavings.totals.savingUsd,
        spark: [],
        pct: savings.totals.savingPct,
      },
      openApprovals: { value: openApprovals.length, previous: null, spark: [] },
    },
    healthTrend,
    attention: attention.slice(0, 8),
    activity: activityFor(db, [orgId], 10),
  };
}

// ---------------------------------------------------------------- evidence packs
export function evidencePack(db: MockDb, task: Task, now = Date.now()): EvidencePack {
  const item = taskListItem(db, task, now);
  const { items, chainValid } = evidenceFor(db, task.id);
  const approval = db.approvals.filter((a) => a.taskId === task.id).at(-1);
  const repo = db.repositories.find((r) => r.id === task.repositoryId)!;
  const passedVer = db.verificationRuns
    .filter((v) => db.agentRuns.some((r) => r.id === v.agentRunId && r.taskId === task.id))
    .at(-1);
  return {
    id: `pack_${task.id}`,
    task: item,
    records: items,
    chainValid,
    verification: passedVer ?? null,
    agentLabel: item.latestRun ? `${AGENT_LABEL[item.latestRun.agent]} · ${item.latestRun.model}` : AGENT_LABEL[task.agent],
    signOff: signOffFor(db, task.id),
    clientApproval: approval
      ? {
          by: db.users.find((u) => u.id === approval.approverUserId)?.name ?? approval.approverUserId,
          at: approval.at,
          decision: approval.decision,
        }
      : null,
    diffSummary: diffStats(generateDiff(task, repo)),
    lastEventAt: items.at(-1)?.at ?? task.createdAt,
  };
}

// ---------------------------------------------------------------- reports
function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function savingsReportFor(
  db: MockDb,
  orgId: string,
  month: string | "last30" | "prev30",
  now = Date.now(),
): SavingsReport {
  const contract = db.contracts.find((c) => c.orgId === orgId);
  const apps = db.applications.filter((a) => a.orgId === orgId);
  const tasks = db.tasks.filter((t) => t.orgId === orgId);
  const delivered = tasks
    .map((t) => ({ t, at: deliveredAt(db, t.id) }))
    .filter((x): x is { t: Task; at: string } => x.at !== null);
  const months = [...new Set(delivered.map((x) => monthKey(x.at)))].sort().reverse();
  const inPeriod = (at: string) => {
    const ms = Date.parse(at);
    if (month === "last30") return ms > now - 30 * DAY && ms <= now;
    if (month === "prev30") return ms > now - 60 * DAY && ms <= now - 30 * DAY;
    return monthKey(at) === month;
  };
  const chosen = delivered.filter((x) => inPeriod(x.at));
  const rate = contract?.priorVendorHourlyRateUsd ?? 0;
  const types = ["cve_patch", "dependency_upgrade", "bug_fix", "enhancement", "test_coverage"] as const;
  const byType = types.map((type) => {
    const ts = chosen.filter((x) => x.t.type === type);
    const hours = ts.reduce((s, x) => s + x.t.estimatedHours, 0);
    return { type, count: ts.length, hours, priorVendorCostUsd: hours * rate };
  });
  const hours = byType.reduce((s, x) => s + x.hours, 0);
  const baselineHours = (contract?.priorVendorBaselineHoursPerAppMonthly ?? 0) * apps.length;
  const baselineCostUsd = baselineHours * rate;
  const priorVendorCostUsd = hours * rate + baselineCostUsd;
  const fee = (contract?.pricePerAppMonthlyUsd ?? 0) * apps.length;
  const savingUsd = priorVendorCostUsd - fee;
  return {
    month: month === "last30" || month === "prev30" ? month : month,
    availableMonths: months,
    byType,
    totals: {
      tasks: chosen.length,
      hours,
      priorVendorRateUsd: rate,
      priorVendorCostUsd,
      baselineHours,
      baselineCostUsd,
      forgePilotFeeUsd: fee,
      savingUsd,
      savingPct: priorVendorCostUsd > 0 ? Math.round((savingUsd / priorVendorCostUsd) * 1000) / 10 : 0,
      applications: apps.length,
      pricePerAppMonthlyUsd: contract?.pricePerAppMonthlyUsd ?? 0,
    },
    agentSharePct: chosen.length
      ? Math.round(chosen.reduce((s, x) => s + x.t.aiAuthoredPct, 0) / chosen.length)
      : 0,
  };
}

export function slaReportFor(db: MockDb, orgId: string, now = Date.now()): SlaReport {
  const contract = db.contracts.find((c) => c.orgId === orgId);
  const targets = contract?.slaTargets ?? {
    criticalCvePatchHours: 72,
    verificationMinutesP90: 15,
    approvalTurnaroundHours: 48,
    slaMetTargetPct: 95,
  };
  const tasks = db.tasks.filter((t) => t.orgId === orgId);
  const items = tasks.map((t) => taskListItem(db, t, now));

  const cveHours = tasks
    .filter((t) => t.type === "cve_patch")
    .map((t) => ({ t, at: deliveredAt(db, t.id) }))
    .filter((x) => x.at)
    .map((x) => hoursBetween(x.t.createdAt, x.at!));
  const runIds = new Set(db.agentRuns.filter((r) => tasks.some((t) => t.id === r.taskId)).map((r) => r.id));
  const verMins = db.verificationRuns
    .filter((v) => runIds.has(v.agentRunId) && v.status !== "running")
    .map((v) => v.durationMin);
  const approvalHours = db.approvals
    .filter((a) => tasks.some((t) => t.id === a.taskId))
    .map((a) => {
      const pr = db.pullRequests.find((p) => p.taskId === a.taskId);
      return pr ? hoursBetween(pr.openedAt, a.at) : null;
    })
    .filter((x): x is number => x !== null && x >= 0);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);
  const p90 = percentile(verMins, 90);
  const met = slaMetPct(items);
  const cveMax = cveHours.length ? Math.round(Math.max(...cveHours) * 10) / 10 : null;

  const breaches = items
    .filter((t) => t.slaRisk === "missed" || t.slaRisk === "breached")
    .map((t) => {
      const attempts = t.attempts;
      const reason =
        t.state === "failed"
          ? (t.escalationReason ?? "Blocked; needs client decision")
          : attempts > 1
            ? `Verification failed ${attempts - 1}× before passing`
            : t.state === "pr_open" || t.state === "rejected"
              ? "Waiting on client approval past due date"
              : t.state === "escalated"
                ? (t.escalationReason ?? "Escalated to engineer")
                : "Work started late against due date";
      return {
        taskId: t.id,
        title: t.title,
        applicationName: t.applicationName,
        dueAt: t.slaDueAt,
        resolvedAt: deliveredAt(db, t.id),
        reason,
      };
    });

  return {
    metrics: [
      { key: "slaMet", label: "Tasks delivered within SLA", unit: "pct", target: targets.slaMetTargetPct, actual: met, lowerIsBetter: false, met: met >= targets.slaMetTargetPct, samples: items.filter((t) => ["met", "missed", "breached"].includes(t.slaRisk)).length },
      { key: "cvePatch", label: "Critical CVE patched (worst case)", unit: "hours", target: targets.criticalCvePatchHours, actual: cveMax, lowerIsBetter: true, met: cveMax === null ? null : cveMax <= targets.criticalCvePatchHours, samples: cveHours.length },
      { key: "verification", label: "Verification time (p90)", unit: "minutes", target: targets.verificationMinutesP90, actual: p90, lowerIsBetter: true, met: p90 === null ? null : p90 <= targets.verificationMinutesP90, samples: verMins.length },
      { key: "approval", label: "Client approval turnaround (avg)", unit: "hours", target: targets.approvalTurnaroundHours, actual: avg(approvalHours), lowerIsBetter: true, met: approvalHours.length ? (avg(approvalHours) ?? 0) <= targets.approvalTurnaroundHours : null, samples: approvalHours.length },
    ],
    breaches,
    slaMetPct: met,
    breachCount: breaches.length,
  };
}

// ---------------------------------------------------------------- console
export function clientSummary(db: MockDb, orgId: string, includeMargin: boolean, now = Date.now()): ClientSummary {
  const org = db.organizations.find((o) => o.id === orgId)!;
  const contract = db.contracts.find((c) => c.orgId === orgId);
  const apps = db.applications.filter((a) => a.orgId === orgId);
  const items = db.tasks.filter((t) => t.orgId === orgId).map((t) => taskListItem(db, t, now));
  const monthlyFee = (contract?.pricePerAppMonthlyUsd ?? 0) * apps.length;
  const runCost30 = db.agentRuns
    .filter((r) => items.some((t) => t.id === r.taskId) && Date.parse(r.startedAt) > now - 30 * DAY)
    .reduce((s, r) => s + r.costUsd, 0);
  const engineerCost = engineerCostShare(db, orgId);
  const margin = monthlyFee > 0 ? ((monthlyFee - runCost30 - engineerCost) / monthlyFee) * 100 : 0;
  const scores = apps.map((a) => appHealth(db, a.id).score);
  return {
    ...org,
    applications: apps.length,
    arrUsd: monthlyFee * 12,
    slaMetPct: slaMetPct(items),
    slaStatus: slaStatusFrom(items, contract?.slaTargets.slaMetTargetPct ?? 95),
    openTasks: items.filter((t) => isOpenTask(t.state)).length,
    marginPct: includeMargin ? Math.round(margin * 10) / 10 : null,
    avgHealth: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0,
  };
}

/** Engineer cost allocated by share of tasks touched in the last 30 days. */
function engineerCostShare(db: MockDb, orgId: string) {
  const engineers = db.users.filter((u) => u.role === "fp_engineer" || u.role === "fp_manager");
  const monthly = (db.meta.fpEngineerMonthlyCostUsd ?? 9000) * engineers.length;
  const total = db.tasks.length || 1;
  const mine = db.tasks.filter((t) => t.orgId === orgId).length;
  return (monthly * mine) / total;
}

export function opsDashboard(db: MockDb, now = Date.now()): OpsDashboard {
  const items = db.tasks.map((t) => taskListItem(db, t, now));
  const delivered = (from: number, to: number) =>
    items.filter((t) => {
      const at = deliveredAt(db, t.id);
      return at && Date.parse(at) > from && Date.parse(at) <= to;
    });
  const week = delivered(now - 7 * DAY, now);
  const prevWeek = delivered(now - 14 * DAY, now - 7 * DAY);
  const recent = delivered(now - 30 * DAY, now);
  const runs30 = db.agentRuns.filter((r) => Date.parse(r.startedAt) > now - 30 * DAY);
  const tasksWithRuns = new Set(runs30.map((r) => r.taskId));
  const revenue = db.organizations.reduce((s, o) => {
    const c = db.contracts.find((x) => x.orgId === o.id);
    return s + (c?.pricePerAppMonthlyUsd ?? 0) * db.applications.filter((a) => a.orgId === o.id).length;
  }, 0);
  const engineers = db.users.filter((u) => u.role === "fp_engineer" || u.role === "fp_manager");
  const cost = runs30.reduce((s, r) => s + r.costUsd, 0) + (db.meta.fpEngineerMonthlyCostUsd ?? 9000) * engineers.length;

  const stateGroups: [string, (s: Task["state"]) => boolean][] = [
    ["Planning", (s) => ["created", "planned", "plan_approved"].includes(s)],
    ["Agent work", (s) => ["running", "verifying", "retrying"].includes(s)],
    ["Needs engineer", (s) => ["escalated", "awaiting_review"].includes(s)],
    ["With client", (s) => ["signed_off", "pr_open"].includes(s)],
    ["Done", (s) => DONE_STATES.includes(s)],
  ];
  const tasksByStateByClient = db.organizations.map((o) => {
    const row: Record<string, string | number> = { client: o.name.replace(" (demo)", "") };
    stateGroups.forEach(([label, fn]) => {
      row[label] = items.filter((t) => t.orgId === o.id && fn(t.state)).length;
    });
    return row;
  });

  const weeks = weeklyBuckets(now, 8);
  const agentShareTrend = weeks.map((w) => {
    const ts = items.filter((t) => {
      const at = deliveredAt(db, t.id) ?? t.createdAt;
      return Date.parse(at) > w.start && Date.parse(at) <= w.end;
    });
    const agentPct = ts.length ? Math.round(ts.reduce((s, t) => s + t.aiAuthoredPct, 0) / ts.length) : 0;
    return {
      week: new Date(w.end).toISOString().slice(0, 10),
      agentPct,
      humanPct: ts.length ? 100 - agentPct : 0,
    };
  });

  const agents = ["claude_code", "codex", "devin"] as const;
  return {
    kpis: {
      slaMetPct: slaMetPct(items),
      tasksCompletedWeek: week.length,
      tasksCompletedPrevWeek: prevWeek.length,
      agentSharePct: recent.length
        ? Math.round(recent.reduce((s, t) => s + t.aiAuthoredPct, 0) / recent.length)
        : 0,
      avgCostPerTaskUsd: tasksWithRuns.size
        ? Math.round((runs30.reduce((s, r) => s + r.costUsd, 0) / tasksWithRuns.size) * 100) / 100
        : 0,
      grossMarginPct: revenue ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0,
      escalations: items.filter((t) => t.state === "escalated").length,
    },
    tasksByStateByClient,
    agentShareTrend,
    slaRisk: items
      .filter((t) => t.slaRisk === "at_risk" || t.slaRisk === "breached")
      .sort((a, b) => a.slaDueAt.localeCompare(b.slaDueAt)),
    workload: db.users
      .filter((u): u is User => u.role === "fp_engineer")
      .map((user) => ({
        user,
        active: items.filter((t) => t.assigneeUserId === user.id && isOpenTask(t.state)).length,
        awaitingReview: items.filter((t) => t.assigneeUserId === user.id && t.state === "awaiting_review").length,
      })),
    costByAgent: agents.map((agent) => {
      const rs = db.agentRuns.filter((r) => r.agent === agent && r.outcome !== "running");
      return {
        agent,
        runs: rs.length,
        costUsd: Math.round(rs.reduce((s, r) => s + r.costUsd, 0) * 100) / 100,
        successPct: rs.length ? Math.round((rs.filter((r) => r.outcome === "success").length / rs.length) * 100) : 0,
      };
    }),
  };
}
