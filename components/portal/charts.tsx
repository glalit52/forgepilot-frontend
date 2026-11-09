"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/domain/format";

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
};
const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { stroke: "var(--border)", fill: "var(--muted)", fillOpacity: 0.4 },
};

function shortDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** Weekly health score line (0–100). Text summary is provided for screen readers. */
export function HealthTrendChart({
  data,
  height = 220,
  label = "Average health score",
}: {
  data: { weekStart: string; score: number }[];
  height?: number;
  label?: string;
}) {
  const first = data[0];
  const last = data.at(-1);
  const summary =
    first && last
      ? `${label} per week over the last ${data.length} weeks: from ${first.score} (week of ${formatDate(first.weekStart)}) to ${last.score} (week of ${formatDate(last.weekStart)}).`
      : `${label}: no data`;
  return (
    <figure role="img" aria-label={summary} className="m-0">
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="weekStart" tickFormatter={shortDate} {...axis} minTickGap={16} />
            <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} {...axis} width={44} />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(v) => `Week of ${shortDate(String(v))}`}
              formatter={(v) => [v, "Health score"]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "var(--chart-1)", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/** Simple single-series bar chart with a text summary. */
export function SimpleBarChart({
  data,
  valueLabel,
  ariaLabel,
  formatValue = (v) => String(v),
  height = 220,
}: {
  data: { label: string; value: number }[];
  valueLabel: string;
  ariaLabel: string;
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const summary = `${ariaLabel}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(", ") || "no data"}.`;
  return (
    <figure role="img" aria-label={summary} className="m-0">
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={0} />
            <YAxis {...axis} width={56} tickFormatter={(v: number) => formatValue(v)} />
            <Tooltip {...tooltipStyle} formatter={(v) => [formatValue(Number(v)), valueLabel]} />
            <Bar
              dataKey="value"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
