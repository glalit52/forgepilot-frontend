import Link from "next/link";
import { CheckIcon, CircleDashedIcon, Loader2Icon, MinusIcon, XIcon } from "lucide-react";
import type { LifecycleStep } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** PLAN → EXECUTE → PROPOSE → VERIFY → REMEDIATE → REVIEW → MERGE → MAINTAIN (PRD §10.1). */
export function LifecycleStepper({
  steps,
  className,
}: {
  steps: LifecycleStep[];
  className?: string;
}) {
  return (
    <ol
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8", className)}
      aria-label="Lifecycle"
    >
      {steps.map((s) => {
        const Icon =
          s.state === "done"
            ? CheckIcon
            : s.state === "current"
              ? Loader2Icon
              : s.state === "failed"
                ? XIcon
                : s.state === "skipped"
                  ? MinusIcon
                  : CircleDashedIcon;
        const body = (
          <>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  s.state === "done" && "bg-success text-white",
                  s.state === "current" && "bg-primary text-primary-foreground",
                  s.state === "failed" && "bg-danger text-white",
                  (s.state === "upcoming" || s.state === "skipped") &&
                    "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                <Icon className={cn("size-3", s.state === "current" && "animate-spin")} />
              </span>
              {s.label}
              <span className="sr-only">({s.state})</span>
            </span>
            {s.detail && (
              <span className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-tight">
                {s.detail}
              </span>
            )}
          </>
        );
        return (
          <li
            key={s.key}
            aria-current={s.state === "current" ? "step" : undefined}
            className={cn(
              "flex flex-col rounded-md border p-2",
              s.state === "current" && "border-primary/50 bg-accent/40",
            )}
          >
            {s.href ? (
              <Link href={s.href} className="flex flex-col hover:underline">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
