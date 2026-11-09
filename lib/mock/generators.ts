/** Deterministic generators for things the seed data doesn't store: live logs, diffs, repo lists. */
import type { AgentRun, DiffFile, DiffLine, GitRepoCandidate, LogLine, Repository, Task } from "@/lib/schemas";
import { toIso } from "./evidence";

export const LOG_INTERVAL_MS = 1400;

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const FILES_BY_LANG: Record<string, string[]> = {
  java: ["src/main/java/com/acme/service/Handler.java", "src/main/java/com/acme/config/AppConfig.java", "src/test/java/com/acme/service/HandlerTest.java", "pom.xml"],
  dotnet: ["src/Api/Controllers/PolicyController.cs", "src/Api/Program.cs", "tests/Api.Tests/PolicyControllerTests.cs", "src/Api/Api.csproj"],
  typescript: ["src/server/routes/confirm.ts", "src/lib/http/retry.ts", "src/lib/http/retry.test.ts", "package.json"],
  python: ["app/rules/engine.py", "app/api/routes.py", "tests/test_engine.py", "pyproject.toml"],
  go: ["internal/handler/handler.go", "cmd/server/main.go", "internal/handler/handler_test.go", "go.mod"],
  kotlin: ["src/main/kotlin/App.kt", "src/test/kotlin/AppTest.kt", "build.gradle.kts", "README.md"],
};

function filesFor(repo: Repository) {
  return FILES_BY_LANG[repo.language] ?? FILES_BY_LANG.typescript;
}

/**
 * Live log for a run. Lines appear one every LOG_INTERVAL_MS since the run started;
 * when the run is over, the full log (with a closing line) is returned.
 */
export function generateLog(task: Task, repo: Repository, run: AgentRun, now: number): LogLine[] {
  const files = filesFor(repo);
  const start = Date.parse(run.startedAt);
  const human = task.manualTakeoverBy ? " (engineer driving)" : "";
  const intro: [LogLine["level"], string][] = [
    ["info", `Sandbox ready · ${repo.language} toolchain · branch fp/${task.id}${human}`],
    ["info", `Agent ${run.agent} (${run.model}) attempt #${run.attempt} started`],
    ["tool", `git clone ${repo.url} --branch ${repo.defaultBranch}`],
    ["info", `Loaded client context graph: 412 symbols, 37 prior changes`],
    ["info", `Plan: ${task.plan.steps.join(" → ")}`],
    ...(run.notes ? ([["warn", `Engineer notes for this attempt: ${run.notes}`]] as [LogLine["level"], string][]) : []),
  ];
  const loop: [LogLine["level"], string][] = [
    ["tool", `read ${files[0]}`],
    ["tool", `grep -rn "${task.type === "cve_patch" ? "openssl" : "timeout"}" src/`],
    ["tool", `edit ${files[0]} (+12 −4)`],
    ["tool", `edit ${files[1]} (+3 −1)`],
    ["tool", `run unit tests (${files[2]})`],
    ["success", `unit tests: 48 passed`],
    ["tool", `edit ${files[2]} (+26 −0) — new tests for acceptance criteria`],
    ["tool", `run build`],
    ["info", `Checking acceptance criterion: "${task.plan.acceptanceCriteria[0] ?? "tests pass"}"`],
    ["warn", `Deprecation warning in ${files[3]} — leaving for a follow-up task`],
    ["tool", `run full test suite`],
    ["success", `full suite: all passing`],
  ];
  const outro: [LogLine["level"], string][] = [
    ["info", "Self-review of diff complete; preparing hand-off to verification"],
    [run.outcome === "verification_failed" ? "warn" : "success", "Agent finished. Handing to verification gate."],
  ];
  const finished = run.outcome !== "running";
  const end = finished ? (run.durationSec ? start + run.durationSec * 1000 : now) : now;
  const elapsedLines = Math.floor((Math.min(now, end) - start) / LOG_INTERVAL_MS) + 1;

  const all: [LogLine["level"], string][] = [...intro];
  const loopCount = finished ? loop.length : Math.max(0, elapsedLines - intro.length);
  for (let i = 0; i < loopCount; i++) all.push(loop[i % loop.length]);
  if (finished) all.push(...outro);
  const visible = finished ? all : all.slice(0, Math.max(1, elapsedLines));
  return visible.slice(-400).map(([level, text], i) => ({
    seq: i,
    at: toIso(start + i * LOG_INTERVAL_MS),
    level,
    text,
  }));
}

function hunk(oldStart: number, lines: [DiffLine["kind"], string][]): DiffLine[] {
  let o = oldStart;
  let n = oldStart;
  const out: DiffLine[] = [{ kind: "hunk", oldNo: null, newNo: null, text: `@@ -${oldStart},${lines.length} +${oldStart},${lines.length} @@` }];
  for (const [kind, text] of lines) {
    if (kind === "context") out.push({ kind, oldNo: o++, newNo: n++, text });
    else if (kind === "del") out.push({ kind, oldNo: o++, newNo: null, text });
    else out.push({ kind: "add", oldNo: null, newNo: n++, text });
  }
  return out;
}

export function generateDiff(task: Task, repo: Repository): DiffFile[] {
  const files = filesFor(repo);
  const h = hashStr(task.id);
  const isTs = repo.language === "typescript";
  const mainLines: [DiffLine["kind"], string][] = isTs
    ? [
        ["context", "export async function confirmPayment(req: Request) {"],
        ["del", "  const res = await fetch(BANK_URL, { body: req.body });"],
        ["add", "  const res = await withRetry(() => fetch(BANK_URL, { body: req.body }), {"],
        ["add", "    attempts: 3,"],
        ["add", "    backoffMs: 400,"],
        ["add", "  });"],
        ["context", "  if (!res.ok) {"],
        ["del", "    throw new Error('timeout');"],
        ["add", "    return pendingConfirmation(req.id); // show progress, never a dead end"],
        ["context", "  }"],
      ]
    : [
        ["context", "public Result handle(Request request) {"],
        ["del", "    var client = new LegacyClient(config.timeout());"],
        ["add", "    var client = clientFactory.create(config.timeout(), RetryPolicy.exponential(3));"],
        ["context", "    var response = client.send(request);"],
        ["add", "    auditLog.record(request.id(), response.status());"],
        ["context", "    return Result.from(response);"],
        ["context", "}"],
      ];
  const testLines: [DiffLine["kind"], string][] = [
    ["context", ""],
    ["add", isTs ? "it('retries on 503 then succeeds', async () => {" : "@Test void retriesOn503ThenSucceeds() {"],
    ["add", isTs ? "  mockBank.failTimes(2).thenOk();" : "    bank.failTimes(2).thenOk();"],
    ["add", isTs ? "  expect(await confirmPayment(req)).toMatchObject({ ok: true });" : "    assertThat(handler.handle(req).ok()).isTrue();"],
    ["add", isTs ? "});" : "}"],
  ];
  const depLines: [DiffLine["kind"], string][] =
    task.type === "dependency_upgrade" || task.type === "cve_patch"
      ? [
          ["del", `    "version": "${2 + (h % 3)}.${h % 10}.${h % 7}"`],
          ["add", `    "version": "${3 + (h % 3)}.${(h + 3) % 10}.0"`],
        ]
      : [["add", "    // no dependency changes"]];
  return [
    { path: files[0], status: "modified", additions: mainLines.filter((l) => l[0] === "add").length, deletions: mainLines.filter((l) => l[0] === "del").length, aiAuthored: true, lines: hunk(40 + (h % 30), mainLines) },
    { path: files[2], status: "modified", additions: testLines.filter((l) => l[0] === "add").length, deletions: 0, aiAuthored: true, lines: hunk(110, testLines) },
    { path: files[3], status: "modified", additions: 1, deletions: depLines.filter((l) => l[0] === "del").length, aiAuthored: task.aiAuthoredPct > 50, lines: hunk(12, depLines) },
  ];
}

export function diffStats(files: DiffFile[]) {
  return {
    files: files.length,
    additions: files.reduce((s, f) => s + f.additions, 0),
    deletions: files.reduce((s, f) => s + f.deletions, 0),
  };
}

export function flakyTestsFor(repo: Repository) {
  const names = ["CheckoutFlowTest.completesWithin2s", "SessionTest.refreshKeepsUser", "BatchJobTest.runsAtCutoff", "WebhookTest.retriesOnTimeout"];
  return names.slice(0, repo.flakyTests).map((name, i) => ({
    name,
    failureRatePct: 4 + ((hashStr(repo.id) + i * 7) % 18),
    lastSeen: repo.lastScanAt,
  }));
}

export function gitCandidates(provider: string, account: string, now: number): GitRepoCandidate[] {
  const slug = account.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "acme";
  const list: [string, GitRepoCandidate["language"]][] = [
    ["core-banking-api", "java"],
    ["customer-portal-web", "typescript"],
    ["mobile-bff", "typescript"],
    ["claims-intake-service", "dotnet"],
    ["risk-scoring", "python"],
    ["notifications-worker", "go"],
    ["legacy-batch-jobs", "java"],
    ["design-system", "typescript"],
  ];
  return list.map(([name, language], i) => ({
    fullName: `${slug}/${name}`,
    language,
    defaultBranch: i === 6 ? "master" : "main",
    private: i !== 7,
    lastPushAt: toIso(now - (i + 1) * 86_400_000 * (provider === "github" ? 1 : 2)),
  }));
}
