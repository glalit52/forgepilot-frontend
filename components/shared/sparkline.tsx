import { cn } from "@/lib/utils";

/** Tiny inline trend line (pure SVG, no chart lib) for KPI cards. */
export function Sparkline({
  values,
  className,
  width = 96,
  height = 28,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const step = width / (values.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / (max - min || 1)) * (height - 4);
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className={cn("text-primary", className)} aria-hidden>
      <path d={`${d} L${width},${height} L0,${height} Z`} className="fill-current opacity-10" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
