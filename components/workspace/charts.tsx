"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, shortDate } from "@/components/shared/chart";
import type { HealthSnapshot, TrendPoint } from "@/lib/schemas";

/** Verified tasks per week. The current (partial) week is drawn lighter. */
export function NorthStarBars({ data, label }: { data: TrendPoint[]; label: string }) {
  return (
    <div className="h-28 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="22%"
        >
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            {...CHART.tooltip}
            labelFormatter={(d) => `Week ending ${shortDate(String(d))}`}
            formatter={(v) => [v, "Verified tasks"]}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={d.date}
                fill={CHART.series[0]}
                fillOpacity={i === data.length - 1 ? 0.45 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 12-week repository health history with the 80 "healthy" threshold marked. */
export function HealthHistoryChart({ data, label }: { data: HealthSnapshot[]; label: string }) {
  const points = data.slice(-12);
  const min = points.length
    ? Math.max(0, Math.floor((Math.min(...points.map((d) => d.score)) - 10) / 10) * 10)
    : 0;
  return (
    <div className="h-48 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="ws-repo-health" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.series[0]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART.series[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="weekStart"
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
          <ReferenceLine
            y={80}
            stroke={CHART.success}
            strokeDasharray="4 4"
            label={{
              value: "Healthy",
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
          <Tooltip
            {...CHART.tooltip}
            cursor={{ stroke: CHART.grid }}
            labelFormatter={(d) => `Week of ${shortDate(String(d))}`}
            formatter={(v) => [v, "Health score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={CHART.series[0]}
            strokeWidth={2}
            fill="url(#ws-repo-health)"
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
