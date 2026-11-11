import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export function AuthShell({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-6">
          <Link href="/" aria-label="ForgePilot home">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
      <aside className="bg-muted/40 relative hidden flex-col justify-center gap-6 overflow-hidden border-l p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_40%_at_70%_20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
          aria-hidden
        />
        {aside}
      </aside>
    </div>
  );
}

export function AuthAside() {
  return (
    <div className="relative flex max-w-md flex-col gap-6">
      <p className="text-2xl font-semibold tracking-tight">
        “Agents write the first draft. ForgePilot makes sure it&apos;s safe to ship.”
      </p>
      <ul className="text-muted-foreground flex flex-col gap-3 text-sm">
        <li>• Every PR verified with commit-pinned tests and evidence</li>
        <li>• Agents run in isolated workspaces with budgets and approvals</li>
        <li>• Maintenance findings become verified PRs, not backlog</li>
      </ul>
      <p className="text-muted-foreground text-xs">
        Product principle from the ForgePilot PRD, not a customer quote.
      </p>
    </div>
  );
}

export function GithubMark({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    </span>
  );
}
