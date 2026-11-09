import { CheckCircle2Icon, FileTextIcon, ImageIcon, PackageIcon, ShieldIcon, XCircleIcon } from "lucide-react";
import type { VerificationRun } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { EmptyState } from "./states";
import { VerificationBadge } from "./status-badge";

function riskTone(score: number) {
  return score >= 60 ? "text-danger-foreground" : score >= 35 ? "text-warning-foreground" : "text-success-foreground";
}

/** Tests passed/failed, scans, risk score, links to screenshots/logs. */
export function VerificationSummary({
  verification,
  detailed = false,
  className,
}: {
  verification: VerificationRun | null;
  detailed?: boolean;
  className?: string;
}) {
  if (!verification)
    return (
      <EmptyState
        title="Not verified yet"
        description="Every change runs the full test suite and security scans before an engineer can sign off."
        className={className}
      />
    );
  const v = verification;
  const sec = v.securityFindings;
  const artifactIcon = { screenshot: ImageIcon, log: FileTextIcon, sbom: PackageIcon, report: FileTextIcon };
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge status={v.status} />
        {v.scanners.length > 0 && <span className="text-muted-foreground text-xs">Scanners: {v.scanners.join(", ")}</span>}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border p-3">
          <dt className="text-muted-foreground text-xs">Tests</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {v.testsPassed}/{v.testsRun}
            <span className="text-muted-foreground ml-1 text-xs font-normal">passed</span>
          </dd>
          {v.testsFailed > 0 && <dd className="text-danger-foreground text-xs">{v.testsFailed} failed</dd>}
        </div>
        <div className="rounded-md border p-3">
          <dt className="text-muted-foreground flex items-center gap-1 text-xs">
            <ShieldIcon className="size-3" aria-hidden /> Security
          </dt>
          <dd className="mt-1 text-sm tabular-nums">
            <span className={cn(sec.critical && "text-danger-foreground font-semibold")}>{sec.critical} critical</span>
            {" · "}
            <span className={cn(sec.high && "text-danger-foreground font-semibold")}>{sec.high} high</span>
            {" · "}
            {sec.medium} med
          </dd>
        </div>
        <div className="rounded-md border p-3">
          <dt className="text-muted-foreground text-xs">Risk score</dt>
          <dd className={cn("mt-1 text-lg font-semibold tabular-nums", riskTone(v.riskScore))}>{v.riskScore}</dd>
        </div>
        <div className="rounded-md border p-3">
          <dt className="text-muted-foreground text-xs">Duration{v.coveragePct !== undefined ? " · coverage" : ""}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {v.durationMin}m
            {v.coveragePct !== undefined && <span className="text-muted-foreground ml-1 text-xs font-normal">· {v.coveragePct}%</span>}
          </dd>
        </div>
      </dl>
      {v.artifacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {v.artifacts.map((a) => {
            const Icon = artifactIcon[a.kind];
            return (
              <a
                key={a.label}
                href={a.url}
                onClick={(e) => e.preventDefault()}
                className="hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
                title="Mock artifact"
              >
                <Icon className="size-3.5" aria-hidden />
                {a.label}
              </a>
            );
          })}
        </div>
      )}
      {detailed && v.testResults.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <caption className="sr-only">Per-test results</caption>
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Test</th>
                <th className="px-3 py-2 text-left font-medium">Suite</th>
                <th className="px-3 py-2 text-right font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {v.testResults.map((t) => (
                <tr key={t.name} className="border-t">
                  <td className="px-3 py-2">
                    {t.name}
                    {t.flaky && <span className="bg-warning-soft text-warning-foreground ml-2 rounded px-1 text-[10px]">flaky</span>}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">{t.suite}</td>
                  <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">{(t.durationMs / 1000).toFixed(2)}s</td>
                  <td className="px-3 py-2">
                    {t.status === "passed" ? (
                      <span className="text-success-foreground inline-flex items-center gap-1"><CheckCircle2Icon className="size-3.5" aria-hidden />Passed</span>
                    ) : (
                      <span className="text-danger-foreground inline-flex items-center gap-1"><XCircleIcon className="size-3.5" aria-hidden />{t.status === "failed" ? "Failed" : "Skipped"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
