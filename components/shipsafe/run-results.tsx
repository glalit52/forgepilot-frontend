"use client";
import { useState } from "react";
import Link from "next/link";
import {
  BugIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  RepeatIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EvidenceLinks } from "@/components/shared/run-summary";
import { FailureClassBadge } from "@/components/shared/status-badge";
import type { Bug, TestOutcome, TestRunDetail } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Result = TestRunDetail["results"][number];
type Suite = TestRunDetail["suites"][number];

const ORDER: Record<TestOutcome, number> = { failed: 0, flaky: 1, skipped: 2, passed: 3 };
const OUTCOME_ICON: Record<TestOutcome, { icon: typeof CheckIcon; cls: string; label: string }> = {
  passed: { icon: CheckIcon, cls: "text-success-foreground", label: "Passed" },
  failed: { icon: XIcon, cls: "text-danger-foreground", label: "Failed" },
  flaky: { icon: RepeatIcon, cls: "text-warning-foreground", label: "Flaky" },
  skipped: { icon: SkipForwardIcon, cls: "text-muted-foreground", label: "Skipped" },
};

const TYPE_LABEL: Record<Suite["type"], string> = {
  unit: "Unit",
  playwright: "Playwright",
  api: "API",
};

function ResultRow({ r, bug }: { r: Result; bug?: Bug }) {
  const o = OUTCOME_ICON[r.outcome];
  const Icon = o.icon;
  const bad = r.outcome === "failed" || r.outcome === "flaky";
  return (
    <li className={cn("flex flex-col gap-2 px-3 py-2", bad && "bg-muted/30")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon className={cn("size-3.5 shrink-0", o.cls)} aria-hidden />
        <span className="sr-only">{o.label}:</span>
        <span className="min-w-0 font-mono text-xs break-all">{r.name}</span>
        {r.classification && <FailureClassBadge classification={r.classification} />}
        {r.retries > 0 && (
          <span className="text-muted-foreground text-xs">
            {r.outcome === "flaky"
              ? `passed on retry ${r.retries}`
              : `${r.retries} retr${r.retries === 1 ? "y" : "ies"}`}
          </span>
        )}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {r.durationMs >= 1000 ? `${(r.durationMs / 1000).toFixed(1)}s` : `${r.durationMs}ms`}
        </span>
      </div>
      {bad && (
        <div className="flex flex-col gap-2 pl-5">
          {r.error && (
            <pre className="bg-muted overflow-x-auto rounded p-2 font-mono text-xs whitespace-pre-wrap">
              {r.error}
            </pre>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <EvidenceLinks evidence={r.evidence} />
            {bug ? (
              <Link
                href={`/app/shipsafe/bugs/${bug.id}`}
                className="text-danger-foreground hover:bg-danger-soft inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
              >
                <BugIcon className="size-3.5" aria-hidden /> View bug
              </Link>
            ) : r.classification === "product_defect" ? (
              <span className="text-muted-foreground text-xs">
                No bug filed: bugs are filed for failures on pull requests.
              </span>
            ) : r.classification ? (
              <span className="text-muted-foreground text-xs">
                Not a product defect, so no bug was filed.
              </span>
            ) : null}
          </div>
        </div>
      )}
    </li>
  );
}

function SuiteGroup({
  suite,
  results,
  bugs,
  defaultOpen,
}: {
  suite: Suite;
  results: Result[];
  bugs: Bug[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showPassed, setShowPassed] = useState(false);
  const sorted = [...results].sort((a, b) => ORDER[a.outcome] - ORDER[b.outcome]);
  const bad = sorted.filter((r) => r.outcome !== "passed");
  const visible = showPassed ? sorted : bad;
  const passedHidden = sorted.length - bad.length;
  const id = `suite-${suite.id}`;
  return (
    <li className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="hover:bg-accent/40 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
      >
        {open ? (
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0" aria-hidden />
        )}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="font-medium">{suite.name}</span>
          <Badge variant="outline">{TYPE_LABEL[suite.type]}</Badge>
          {suite.required && <Badge variant="secondary">Required</Badge>}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
          <span className="text-success-foreground">{suite.passed} passed</span>
          <span
            className={
              suite.failed ? "text-danger-foreground font-medium" : "text-muted-foreground"
            }
          >
            {suite.failed} failed
          </span>
          <span
            className={cn(
              "hidden sm:inline",
              suite.flaky ? "text-warning-foreground" : "text-muted-foreground",
            )}
          >
            {suite.flaky} flaky
          </span>
        </span>
      </button>
      {open && (
        <div id={id} className="border-t">
          {!results.length ? (
            <p className="text-muted-foreground px-3 py-3 text-xs">
              No per-test results recorded for this suite in this run.
            </p>
          ) : (
            <>
              {visible.length > 0 ? (
                <ul className="divide-y">
                  {visible.map((r) => (
                    <ResultRow key={r.id} r={r} bug={bugs.find((b) => b.resultId === r.id)} />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground flex items-center gap-1.5 px-3 py-3 text-xs">
                  <CheckIcon className="text-success-foreground size-3.5" aria-hidden /> All{" "}
                  {sorted.length} tests passed.
                </p>
              )}
              {passedHidden > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPassed((v) => !v)}
                  className="text-muted-foreground hover:text-foreground w-full border-t px-3 py-2 text-left text-xs"
                >
                  {showPassed
                    ? "Hide passed tests"
                    : `Show ${passedHidden} passed test${passedHidden === 1 ? "" : "s"}`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** Results grouped by suite, failures first (SS-008/009). */
export function RunResults({ detail }: { detail: TestRunDetail }) {
  const { suites, results, bugs, run } = detail;
  const suiteOrder = [...suites].sort((a, b) => b.failed + b.flaky - (a.failed + a.flaky));
  if (run.status === "running" || run.status === "queued")
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
        Results appear here as soon as the worker reports them.
      </p>
    );
  if (run.status === "errored")
    return (
      <p className="bg-warning-soft text-warning-foreground flex items-start gap-2 rounded-lg p-4 text-sm">
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        The worker failed before tests could report. This is an infrastructure failure, not a result
        about your change.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      {!results.length && run.totals.passed + run.totals.failed > 0 && (
        <p className="text-muted-foreground text-xs">
          Per-test results weren&apos;t retained for this run. The totals above come from the
          worker&apos;s summary.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {suiteOrder.map((s) => (
          <SuiteGroup
            key={s.id}
            suite={s}
            results={results.filter((r) => r.suiteId === s.id)}
            bugs={bugs}
            defaultOpen={s.failed + s.flaky > 0}
          />
        ))}
      </ul>
    </div>
  );
}
