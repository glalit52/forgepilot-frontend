"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BugIcon, ChevronRightIcon, TableIcon, LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHART, shortDate } from "@/components/shared/chart";
import { FailureClassBadge, RunStatusBadge } from "@/components/shared/status-badge";
import type { ShipSafeOverview, TestRunStatus } from "@/lib/schemas";
import { FAILURE_CLASS_HELP } from "@/lib/domain/status";
import { formatPct } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { passRateTone } from "./helpers";

type Trend = ShipSafeOverview["passRateTrend"];

function summarise(trend: Trend) {
  const active = trend.filter((d) => d.runs > 0);
  const runs = active.reduce((s, d) => s + d.runs, 0);
  const passed = active.reduce((s, d) => s + (d.passRatePct / 100) * d.runs, 0);
  const worst = active.reduce<Trend[number] | null>(
    (w, d) => (!w || d.passRatePct < w.passRatePct ? d : w),
    null,
  );
  return {
    runs,
    avg: runs ? Math.round((passed / runs) * 1000) / 10 : null,
    worst,
    activeDays: active.length,
  };
}

/**
 * 30-day pass rate (line) with run volume (bars) as a second, aligned chart.
 * Two charts instead of a dual axis: the scales mean different things.
 */
export function PassRateTrend({ trend }: { trend: Trend }) {
  const [asTable, setAsTable] = useState(false);
  const data = trend.map((d) => ({ ...d, rate: d.runs ? d.passRatePct : null }));
  const s = summarise(trend);
  const summary = s.runs
    ? `Over the last 30 days, ${s.runs} completed runs passed ${formatPct(s.avg ?? 0, 1)} of the time on average${s.worst && s.worst.passRatePct < 100 ? `. Lowest day: ${shortDate(s.worst.date)} at ${formatPct(s.worst.passRatePct)} (${s.worst.runs} runs)` : ""}.`
    : "No completed runs in the last 30 days.";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs" id="trend-summary">
          {summary}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
        >
          {asTable ? <LineChartIcon /> : <TableIcon />} {asTable ? "Chart" : "Table"}
        </Button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <caption className="sr-only">Daily pass rate and run volume, last 30 days</caption>
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Date</th>
                <th className="px-3 py-1.5 text-right font-medium">Completed runs</th>
                <th className="px-3 py-1.5 text-right font-medium">Pass rate</th>
              </tr>
            </thead>
            <tbody>
              {[...trend].reverse().map((d) => (
                <tr key={d.date} className="border-t">
                  <td className="px-3 py-1.5">{shortDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.runs}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.runs ? formatPct(d.passRatePct, 1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Pass rate trend chart. ${summary}`}
          aria-describedby="trend-summary"
        >
          <div className="text-muted-foreground mb-1 flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-3 rounded"
                style={{ background: CHART.series[0] }}
                aria-hidden
              />{" "}
              Pass rate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-muted-foreground/40 inline-block size-2 rounded-sm" aria-hidden />{" "}
              Completed runs per day
            </span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                syncId="ss-trend"
                margin={{ top: 6, right: 8, bottom: 0, left: -12 }}
              >
                <CartesianGrid stroke={CHART.grid} vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 80, 100]}
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  width={44}
                />
                <ReferenceLine
                  y={80}
                  stroke={CHART.axis}
                  strokeDasharray="2 4"
                  strokeOpacity={0.5}
                />
                <Tooltip
                  {...CHART.tooltip}
                  cursor={{ stroke: CHART.axis, strokeOpacity: 0.4 }}
                  labelFormatter={(l) => shortDate(String(l))}
                  formatter={(v, _n, p) => [
                    v === null || v === undefined
                      ? "No runs"
                      : `${v}% of ${(p.payload as { runs: number }).runs} runs`,
                    "Pass rate",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={CHART.series[0]}
                  strokeWidth={2}
                  dot={{ r: 2.5, strokeWidth: 0, fill: CHART.series[0] }}
                  activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                syncId="ss-trend"
                margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
                barCategoryGap={2}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  {...CHART.tooltip}
                  labelFormatter={(l) => shortDate(String(l))}
                  formatter={(v) => [String(v), "Completed runs"]}
                />
                <Bar
                  dataKey="runs"
                  fill="var(--muted-foreground)"
                  fillOpacity={0.4}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/** Failure classes (SS-009). Only product defects become bugs. */
export function FailureBreakdown({
  breakdown,
}: {
  breakdown: ShipSafeOverview["failureBreakdown"];
}) {
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  const max = Math.max(1, ...breakdown.map((b) => b.count));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5" aria-label="Failures by classification">
        {breakdown.map((b) => {
          const defect = b.classification === "product_defect";
          return (
            <li key={b.classification} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <FailureClassBadge classification={b.classification} />
                  {defect && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                      <BugIcon className="size-3" aria-hidden /> becomes a bug
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {b.count}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    {total ? formatPct((b.count / total) * 100) : ""}
                  </span>
                </span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                <div
                  className={cn(
                    "h-full rounded-full",
                    defect ? "bg-danger" : "bg-muted-foreground/45",
                  )}
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {FAILURE_CLASS_HELP[b.classification]}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="bg-muted/60 rounded-md p-2.5 text-xs leading-relaxed">
        <span className="font-medium">Only product defects become bugs.</span> Test, environment,
        flaky and infrastructure failures are tracked so you can fix the noise, but they are never
        filed against your change.
      </p>
    </div>
  );
}

export function RepoPassRates({
  repositories,
}: {
  repositories: ShipSafeOverview["repositories"];
}) {
  const rows = [...repositories].sort((a, b) => a.passRatePct - b.passRatePct);
  return (
    <ul className="divide-y rounded-lg border" aria-label="Pass rate by repository">
      {rows.map((r) => {
        const tone = passRateTone(r.passRatePct, r.runs);
        return (
          <li key={r.repositoryId}>
            <Link
              href={`/app/shipsafe/runs?repo=${r.repositoryId}`}
              className="hover:bg-accent/50 focus-visible:ring-ring/50 flex items-center gap-3 px-3 py-2.5 focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      tone === "success" && "text-success-foreground",
                      tone === "warning" && "text-warning-foreground",
                      tone === "danger" && "text-danger-foreground",
                    )}
                  >
                    {r.runs ? formatPct(r.passRatePct, 1) : "—"}
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                  <div
                    className={cn(
                      "h-full rounded-full",
                      tone === "success"
                        ? "bg-success"
                        : tone === "warning"
                          ? "bg-warning"
                          : tone === "danger"
                            ? "bg-danger"
                            : "bg-neutral",
                    )}
                    style={{ width: `${r.runs ? r.passRatePct : 0}%` }}
                  />
                </div>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {r.runs} completed runs
                  {r.lastStatus && (
                    <>
                      · last <RunStatusBadge status={r.lastStatus as TestRunStatus} />
                    </>
                  )}
                </span>
              </div>
              <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
