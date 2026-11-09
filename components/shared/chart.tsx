/** Theme-aware chart tokens for Recharts (CSS variables follow light/dark). */
export const CHART = {
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
  series: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"],
  success: "var(--success)",
  danger: "var(--danger)",
  warning: "var(--warning)",
  tooltip: {
    contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 },
    labelStyle: { color: "var(--muted-foreground)" },
    cursor: { fill: "var(--muted)", opacity: 0.4 },
  },
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
};

export function shortDate(d: string) {
  const dt = new Date(d + (d.length === 10 ? "T12:00:00Z" : ""));
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(dt);
}
