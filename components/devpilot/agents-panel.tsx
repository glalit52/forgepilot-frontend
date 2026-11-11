"use client";
import Link from "next/link";
import { BotIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { ToneBadge } from "@/components/shared/status-badge";
import type { DevPilotOverview } from "@/lib/schemas";
import { formatPct } from "@/lib/domain/format";
import { PROVIDER_LABEL } from "@/lib/domain/labels";
import { formatCost } from "./utils";

type AgentRow = DevPilotOverview["agents"][number];

/** Configured runtimes with 30-day activity (PRD §9.6). */
export function AgentsPanel({ agents }: { agents: AgentRow[] }) {
  if (!agents.length)
    return (
      <EmptyState
        icon={BotIcon}
        title="No coding agents connected"
        description="Connect Claude Code, Codex or another runtime to start delegating tasks."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/app/integrations">Connect an agent</Link>
          </Button>
        }
      />
    );
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y rounded-lg border" aria-label="Agent runtimes">
        {agents.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-md"
                  aria-hidden
                >
                  <BotIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {PROVIDER_LABEL[a.provider]} · <span className="font-mono">{a.model}</span> · up
                    to {a.maxConcurrent} concurrent
                  </p>
                </div>
              </div>
              {a.status === "active" ? (
                <ToneBadge tone={a.running ? "accent" : "success"} pulse={a.running > 0}>
                  {a.running ? `${a.running} running` : "Active"}
                </ToneBadge>
              ) : (
                <ToneBadge tone="neutral">Suspended</ToneBadge>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Sessions (30d)</dt>
                <dd className="font-medium tabular-nums">{a.sessions30d}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Success</dt>
                <dd className="font-medium tabular-nums">
                  {a.sessions30d ? formatPct(a.successRatePct) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cost (30d)</dt>
                <dd className="font-medium tabular-nums">{formatCost(a.costUsd30d)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Don&apos;t rank providers on raw success rate. Each runtime gets a different mix of tasks,
          so compare them by task type and complexity in{" "}
          <Link href="/app/analytics" className="text-primary hover:underline">
            Analytics
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
