import { cn } from "@/lib/utils";

/** Projects carry a colour name; map it to a theme chart token (works in light and dark). */
const COLOR: Record<string, string> = {
  violet: "bg-[var(--chart-1)]",
  teal: "bg-[var(--chart-2)]",
  sky: "bg-[var(--info)]",
  amber: "bg-[var(--chart-3)]",
  rose: "bg-[var(--chart-4)]",
  lime: "bg-[var(--chart-5)]",
};

export function ProjectSwatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-sm",
        COLOR[color] ?? "bg-primary",
        className,
      )}
      aria-hidden
    />
  );
}
