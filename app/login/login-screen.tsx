"use client";
import { useSearchParams } from "next/navigation";
import { ArrowRightIcon, Building2Icon, FlaskConicalIcon, WrenchIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePersonas } from "@/lib/api/hooks";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { initials } from "@/lib/domain/format";
import { PORTAL_ROLES } from "@/lib/domain/roles";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useSwitchAndGoHome } from "@/components/shell/use-switch-persona";
import { ErrorState } from "@/components/shared/states";
import type { User } from "@/lib/schemas";

const ROLE_BLURB: Record<string, string> = {
  client_admin: "Sees everything, manages team and integrations, can approve.",
  client_approver: "Reviews and approves pull requests.",
  client_viewer: "Read-only: compliance and audit.",
  fp_engineer: "Runs agents, reviews diffs, signs off changes.",
  fp_manager: "Ops dashboard: SLA, workload, margin.",
};

function PersonaButton({
  p,
  onPick,
  disabled,
}: {
  p: User;
  onPick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className="hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-ring/50 group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
      data-testid={`login-${p.id}`}
    >
      <Avatar className="size-9">
        <AvatarFallback>{initials(p.name)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{p.name}</span>
        <span className="text-muted-foreground truncate text-xs">
          {ROLE_LABEL[p.role]}
          {p.title ? ` · ${p.title}` : ""}
        </span>
        <span className="text-muted-foreground mt-0.5 truncate text-xs">{ROLE_BLURB[p.role]}</span>
      </span>
      <ArrowRightIcon
        className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

export function LoginScreen() {
  const personas = usePersonas();
  const { switchTo, pending } = useSwitchAndGoHome();
  const next = useSearchParams().get("next") ?? undefined;
  const orgLabel = (id: string | null) =>
    ({
      org_acme_bank: "Acme Bank",
      org_shield_ins: "Shield Insurance",
      org_payfast: "PayFast Fintech",
    })[id ?? ""] ??
    id ??
    "";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Maintained. Tested. Running.</h1>
          <p className="text-muted-foreground mx-auto max-w-2xl">
            AI agents do the work, ForgePilot engineers verify and sign off every change, and you
            approve and see everything in one place.
          </p>
          <p className="text-warning-foreground mx-auto mt-2 inline-flex items-center gap-1.5 text-xs">
            <FlaskConicalIcon className="size-3.5" aria-hidden /> Mock sign-in — choose a persona.
            All companies and people are fictional.
          </p>
        </div>
        {personas.error ? (
          <ErrorState error={personas.error} onRetry={() => personas.refetch()} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Building2Icon className="text-primary size-4" aria-hidden /> Client portal
              </h2>
              <p className="text-muted-foreground -mt-1 text-sm">
                For your team: approvals, evidence, savings and SLAs.
              </p>
              {personas.isPending
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                : Object.entries(
                    (personas.data ?? [])
                      .filter((p) => PORTAL_ROLES.includes(p.role))
                      .reduce<Record<string, User[]>>(
                        (acc, p) => ({
                          ...acc,
                          [p.orgId ?? ""]: [...(acc[p.orgId ?? ""] ?? []), p],
                        }),
                        {},
                      ),
                  ).map(([org, ps]) => (
                    <div key={org} className="flex flex-col gap-2">
                      <span className="text-muted-foreground text-xs font-medium uppercase">
                        {orgLabel(org)}
                      </span>
                      {ps.map((p) => (
                        <PersonaButton
                          key={p.id}
                          p={p}
                          disabled={pending}
                          onPick={() =>
                            switchTo(p.id, next?.startsWith("/portal") ? next : undefined)
                          }
                        />
                      ))}
                    </div>
                  ))}
            </Card>
            <Card className="flex flex-col gap-3 self-start p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <WrenchIcon className="text-primary size-4" aria-hidden /> ForgePilot console
              </h2>
              <p className="text-muted-foreground -mt-1 text-sm">
                For ForgePilot engineers and delivery managers.
              </p>
              {personas.isPending
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                : (personas.data ?? [])
                    .filter((p) => !PORTAL_ROLES.includes(p.role))
                    .map((p) => (
                      <PersonaButton
                        key={p.id}
                        p={p}
                        disabled={pending}
                        onPick={() =>
                          switchTo(p.id, next?.startsWith("/console") ? next : undefined)
                        }
                      />
                    ))}
            </Card>
          </div>
        )}
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-sm">
          <span>New client?</span>
          <button
            className="text-primary font-medium underline-offset-4 hover:underline"
            disabled={pending}
            onClick={() => switchTo("u_ravi", "/portal/onboarding")}
          >
            Try the onboarding wizard
          </button>
          <span aria-hidden>·</span>
          <a
            className="text-primary font-medium underline-offset-4 hover:underline"
            href="/dev/components"
          >
            Component gallery
          </a>
        </div>
      </main>
    </div>
  );
}
