import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <path d="M7 17V7h9M7 12h6" className="stroke-primary-foreground" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="16" r="2" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {!compact && <span className="font-semibold tracking-tight">ForgePilot</span>}
    </span>
  );
}
