import { SparklesIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const AI_HEAVY_THRESHOLD = 50;

/** Badge when a PR is mostly AI-written ("AI-authored 78%"). Mostly-AI PRs get stricter checks (P1-10). */
export function AiCodeFlag({ pct, className, compact }: { pct: number; className?: string; compact?: boolean }) {
  const heavy = pct >= AI_HEAVY_THRESHOLD;
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums",
        heavy ? "border-primary/30 bg-accent text-accent-foreground" : "text-muted-foreground",
        className,
      )}
    >
      <SparklesIcon className="size-3" aria-hidden />
      {compact ? `${pct}%` : `AI-authored ${pct}%`}
    </span>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="rounded-md">
          {badge}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {heavy
          ? "Mostly AI-written. Stricter checks applied: full regression suite, extra security scan and mandatory engineer review."
          : "Mostly human-written or small AI contribution."}
      </TooltipContent>
    </Tooltip>
  );
}
