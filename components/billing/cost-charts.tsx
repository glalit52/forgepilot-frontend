"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, shortDate } from "@/components/shared/chart";
import { formatUsd } from "@/lib/domain/format";

const cents = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
/** Billing shows cents; elsewhere whole dollars are enough. */
export function money(n: number) {
  return cents.format(n);
}

export function DailyCostChart({ data }: { data: { date: string; costUsd: number }[] }) {
  if (!data.length)
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No metered usage in the last 30 days.
      </p>
    );
  const total = data.reduce((s, d) => s + d.costUsd, 0);
  const peak = data.reduce((m, d) => (d.costUsd > m.costUsd ? d : m), data[0]);
  const avg = total / data.length;
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="h-56 w-full"
        role="img"
        aria-label={`Daily metered cost over the last ${data.length} days. Total ${formatUsd(total)}, average ${formatUsd(avg)} a day, peak ${formatUsd(peak.costUsd)} on ${shortDate(peak.date)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={CHART.tick}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v}`}
              tick={CHART.tick}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              {...CHART.tooltip}
              labelFormatter={(l) => shortDate(String(l))}
              formatter={(v) => [money(Number(v)), "Cost"]}
            />
            <Bar dataKey="costUsd" fill={CHART.series[0]} radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-muted-foreground text-xs">
        {money(total)} over {data.length} days · about {money(avg)} a day · busiest day{" "}
        {shortDate(peak.date)} ({money(peak.costUsd)}).
      </figcaption>
    </figure>
  );
}

/** Ranked horizontal bars; plain HTML so it reads well with a screen reader. */
export function BreakdownBars({
  rows,
  label,
  empty,
}: {
  rows: { key: string; label: string; costUsd: number; hint?: string }[];
  label: string;
  empty: string;
}) {
  if (!rows.length) return <p className="text-muted-foreground py-6 text-sm">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.costUsd), 0.01);
  const total = rows.reduce((s, r) => s + r.costUsd, 0);
  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {rows.map((r, i) => (
        <li key={r.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              {r.label}
              {r.hint && <span className="text-muted-foreground text-xs"> · {r.hint}</span>}
            </span>
            <span className="shrink-0 tabular-nums">
              {money(r.costUsd)}
              <span className="text-muted-foreground text-xs">
                {" "}
                · {total ? Math.round((r.costUsd / total) * 100) : 0}%
              </span>
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(r.costUsd / max) * 100}%`,
                background: CHART.series[i % CHART.series.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
