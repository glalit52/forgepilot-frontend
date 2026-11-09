import { cn } from "@/lib/utils";

export function Logo({ className, area }: { className?: string; area?: "portal" | "console" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect width="24" height="24" rx="6" className="fill-primary" />
        <path
          d="M7 17V7h9M7 12h6"
          className="stroke-primary-foreground"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="17" cy="16" r="2" className="fill-primary-foreground" />
      </svg>
      <span className="font-semibold tracking-tight">ForgePilot</span>
      {area && (
        <span className="text-muted-foreground rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          {area === "portal" ? "Portal" : "Console"}
        </span>
      )}
    </span>
  );
}
