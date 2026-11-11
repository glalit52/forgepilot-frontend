import {
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  NetworkIcon,
  PlayCircleIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type { TestResult, TestRun } from "@/lib/schemas";
import { formatDuration } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { CommitSha } from "./misc";
import { FailureClassBadge, RunStatusBadge } from "./status-badge";

const EVIDENCE_ICON = {
  screenshot: ImageIcon,
  trace: PlayCircleIcon,
  console: TerminalSquareIcon,
  network: NetworkIcon,
  log: FileTextIcon,
  video: PlayCircleIcon,
};

/** Totals, commit pins and environment for one ShipSafe run (SS-003). */
export function RunSummary({ run, className }: { run: TestRun; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <RunStatusBadge status={run.status} />
        <span className="text-muted-foreground text-xs">
          head <CommitSha sha={run.headSha} /> · base <CommitSha sha={run.baseSha} /> · {run.branch}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Passed", run.totals.passed, "text-success-foreground"],
          ["Failed", run.totals.failed, run.totals.failed ? "text-danger-foreground" : ""],
          ["Flaky", run.totals.flaky, run.totals.flaky ? "text-warning-foreground" : ""],
          ["Duration", run.durationSec ? formatDuration(run.durationSec) : "running…", ""],
        ].map(([k, v, cls]) => (
          <div key={k as string} className="rounded-md border p-3">
            <dt className="text-muted-foreground text-xs">{k}</dt>
            <dd className={cn("mt-1 text-lg font-semibold tabular-nums", cls as string)}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <GlobeIcon className="size-3.5" aria-hidden /> {run.environment.name}
          {run.environment.url ? ` · ${run.environment.url}` : ""}
        </span>
        <span>
          {run.environment.node
            ? `Node ${run.environment.node}`
            : run.environment.python
              ? `Python ${run.environment.python}`
              : ""}
        </span>
        <span>
          {run.environment.worker} · {run.environment.region}
        </span>
      </p>
      {run.infraError && (
        <p className="bg-warning-soft text-warning-foreground rounded-md p-3 text-sm" role="status">
          {run.infraError}
        </p>
      )}
    </div>
  );
}

export function EvidenceLinks({ evidence }: { evidence: TestResult["evidence"] }) {
  if (!evidence.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {evidence.map((e) => {
        const Icon = EVIDENCE_ICON[e.kind];
        return (
          <a
            key={e.ref}
            href={`#${e.ref}`}
            onClick={(ev) => ev.preventDefault()}
            className="hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
            title={`${e.ref} (mock artifact)`}
          >
            <Icon className="size-3.5" aria-hidden /> {e.label}
          </a>
        );
      })}
    </div>
  );
}

/** Failing and flaky results with classification, error and evidence. */
export function FailureList({ results }: { results: (TestResult & { suiteName?: string })[] }) {
  const bad = results.filter((r) => r.outcome === "failed" || r.outcome === "flaky");
  if (!bad.length) return null;
  return (
    <ul className="flex flex-col gap-3">
      {bad.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            {r.classification && <FailureClassBadge classification={r.classification} />}
            <span className="font-mono text-sm">{r.name}</span>
            {r.suiteName && <span className="text-muted-foreground text-xs">· {r.suiteName}</span>}
            {r.retries > 0 && (
              <span className="text-muted-foreground text-xs">· passed on retry {r.retries}</span>
            )}
          </div>
          {r.error && (
            <pre className="bg-muted overflow-x-auto rounded p-2 font-mono text-xs whitespace-pre-wrap">
              {r.error}
            </pre>
          )}
          <EvidenceLinks evidence={r.evidence} />
        </li>
      ))}
    </ul>
  );
}
