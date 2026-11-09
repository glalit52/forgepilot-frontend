"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpsDashboard } from "@/lib/schemas";
import { formatDate } from "@/lib/domain/format";

// Theme-aware: CSS variables resolve per light/dark theme.
const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const AXIS = {
  stroke: "var(--border)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
} as const;
const TOOLTIP = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
} as const;
const LEGEND = {
  wrapperStyle: { fontSize: 12 },
  iconType: "circle" as const,
  iconSize: 8,
  itemSorter: null,
  // Legend text wears text tokens; the coloured dot carries identity.
  formatter: (value: string) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>,
};

/** Accessible table fallback for every chart. */
function DataTableView({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="text-xs">
      <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 w-fit cursor-pointer rounded outline-none focus-visible:ring-[3px]">
        View as table
      </summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b">
            {head.map((h) => (
              <th key={h} className="py-1 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-3 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function TasksByStateChart({ data }: { data: OpsDashboard["tasksByStateByClient"] }) {
  const keys = data.length ? Object.keys(data[0]).filter((k) => k !== "client") : [];
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-64"
        role="img"
        aria-label={`Stacked bar chart: tasks by state for each client (${keys.join(", ")})`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="client" {...AXIS} />
            <YAxis allowDecimals={false} {...AXIS} axisLine={false} />
            <Tooltip {...TOOLTIP} />
            <Legend {...LEGEND} />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="s"
                fill={SERIES[i % SERIES.length]}
                stroke="var(--card)"
                strokeWidth={2}
                radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={56}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTableView
        caption="Tasks by state per client"
        head={["Client", ...keys]}
        rows={data.map((r) => [String(r.client), ...keys.map((k) => r[k] ?? 0)])}
      />
    </div>
  );
}

export function AgentShareChart({ data }: { data: OpsDashboard["agentShareTrend"] }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-64"
        role="img"
        aria-label="Area chart: share of each week's delivered code written by AI agents, last 8 weeks"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="agentShareFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tickFormatter={(w: string) => formatDate(w).replace(/,? \d{4}$/, "")}
              {...AXIS}
            />
            <YAxis domain={[0, 100]} unit="%" {...AXIS} axisLine={false} />
            <Tooltip
              {...TOOLTIP}
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              labelFormatter={(w) => `Week ending ${formatDate(String(w))}`}
              formatter={(v) => [`${v}%`, "Agent-authored"]}
            />
            <Area
              type="monotone"
              dataKey="agentPct"
              name="Agent-authored"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#agentShareFill)"
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <DataTableView
        caption="Agent share by week"
        head={["Week ending", "Agent %", "Human %"]}
        rows={data.map((r) => [formatDate(r.week), r.agentPct, r.humanPct])}
      />
    </div>
  );
}

export function WorkloadChart({ data }: { data: OpsDashboard["workload"] }) {
  const rows = data.map((w) => ({
    name: w.user.name,
    Active: w.active,
    "Awaiting review": w.awaitingReview,
  }));
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-56"
        role="img"
        aria-label="Bar chart: active and awaiting-review tasks per engineer"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
            barCategoryGap="30%"
            barGap={2}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} {...AXIS} />
            <YAxis type="category" dataKey="name" width={90} {...AXIS} axisLine={false} />
            <Tooltip {...TOOLTIP} />
            <Legend {...LEGEND} />
            <Bar dataKey="Active" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={14} />
            <Bar
              dataKey="Awaiting review"
              fill="var(--chart-3)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTableView
        caption="Engineer workload"
        head={["Engineer", "Active", "Awaiting review"]}
        rows={data.map((w) => [w.user.name, w.active, w.awaitingReview])}
      />
    </div>
  );
}
