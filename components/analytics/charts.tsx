"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, shortDate } from "@/components/shared/chart";
import { formatUsd } from "@/lib/domain/format";
import type { Analytics } from "@/lib/schemas";

/** Verified tasks per week (North Star, PRD §3.3). */
export function NorthStarChart({ data, label }: { data: Analytics["northStar"]; label: string }) {
  return (
    <div className="h-52 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
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
            labelFormatter={(d) => `Week ending ${shortDate(String(d))}`}
            formatter={(v) => [v, "Verified tasks"]}
          />
          <Bar
            dataKey="value"
            fill={CHART.series[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Daily spend, agent runtime vs browser test minutes, stacked. */
export function SpendChart({ data, label }: { data: Analytics["spendByDay"]; label: string }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v) => formatUsd(Number(v))}
          />
          <Tooltip
            {...CHART.tooltip}
            labelFormatter={(d) => shortDate(String(d))}
            formatter={(v, name) => [formatUsd(Number(v), true), name]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          />
          <Bar
            dataKey="agentUsd"
            name="Agent runtime"
            stackId="spend"
            fill={CHART.series[0]}
            isAnimationActive={false}
            stroke="var(--card)"
            strokeWidth={1}
          />
          <Bar
            dataKey="browserUsd"
            name="Browser tests"
            stackId="spend"
            fill={CHART.series[1]}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            stroke="var(--card)"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two labelled horizontal bars, for simple A vs B comparisons. */
export function CompareBars({
  items,
  label,
}: {
  items: { label: string; pct: number; detail: string; color: string }[];
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3" role="img" aria-label={label}>
      {items.map((i) => (
        <div key={i.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: i.color }}
                aria-hidden
              />
              {i.label}
            </span>
            <span className="tabular-nums">
              <span className="font-semibold">{Math.round(i.pct)}%</span>{" "}
              <span className="text-muted-foreground text-xs">{i.detail}</span>
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, i.pct))}%`, background: i.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
