"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, shortDate } from "@/components/shared/chart";
import type { TrendPoint } from "@/lib/schemas";

/** Workspace average health over the last 12 weeks. */
export function HealthTrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  const min = Math.max(0, Math.floor((Math.min(...data.map((d) => d.value)) - 10) / 10) * 10);
  return (
    <div className="h-44 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="ck-health" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.series[0]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART.series[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[min, 100]}
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            {...CHART.tooltip}
            cursor={{ stroke: CHART.grid }}
            labelFormatter={(d) => `Week of ${shortDate(String(d))}`}
            formatter={(v) => [v, "Average health"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.series[0]}
            strokeWidth={2}
            fill="url(#ck-health)"
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars for a categorical count breakdown. Each bar can carry its own colour. */
export function CountBarChart({
  data,
  label,
  height,
}: {
  data: { key: string; label: string; count: number; color: string }[];
  label: string;
  height?: number;
}) {
  return (
    <div
      className="w-full"
      style={{ height: height ?? Math.max(120, data.length * 34 + 16) }}
      role="img"
      aria-label={label}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            width={128}
          />
          <Tooltip {...CHART.tooltip} formatter={(v) => [v, "Open findings"]} />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            isAnimationActive={false}
            label={{ position: "right", fill: "var(--muted-foreground)", fontSize: 11 }}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
