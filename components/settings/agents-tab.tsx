"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { BotIcon, PauseCircleIcon, PlayCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState, QueryState } from "@/components/shared/states";
import { Monogram } from "@/components/shared/misc";
import { useAgents, useUpdateAgent } from "@/lib/api/hooks";
import type { Agent, SessionInfo } from "@/lib/schemas";
import { can } from "@/lib/domain/permissions";
import { PROVIDER_LABEL } from "@/lib/domain/labels";
import { providerById } from "@/lib/domain/integrations";
import { FieldError, PermissionNote, errorMessage } from "./common";

export function AgentsTab({ session }: { session: SessionInfo }) {
  const query = useAgents();
  const canManage = can(session.role, "agent.manage");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Defaults applied to new DevPilot tasks. Each task can lower its own budget and timeout;
        policies decide which runtimes are allowed at all. Suspending a runtime stops new sessions
        from launching on it.
      </p>
      {!canManage && (
        <PermissionNote>
          Only owners and admins can change runtimes or suspend an agent.
        </PermissionNote>
      )}
      <QueryState
        query={query}
        loading={
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={BotIcon}
            title="No agent runtimes yet"
            description="Connect Claude Code or OpenAI Codex with your own API key to start running tasks."
            action={
              <Button asChild size="sm">
                <Link href="/app/integrations">Connect an agent</Link>
              </Button>
            }
          />
        }
      >
        {(agents) => (
          <div className="grid gap-4 lg:grid-cols-2">
            {agents.map((a) => (
              <AgentCard
                key={`${a.id}:${a.maxConcurrent}:${a.defaultBudgetUsd}:${a.defaultTimeoutMin}`}
                agent={a}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}

function AgentCard({ agent: a, canManage }: { agent: Agent; canManage: boolean }) {
  const id = useId();
  const update = useUpdateAgent();
  const [form, setForm] = useState({
    maxConcurrent: String(a.maxConcurrent),
    defaultBudgetUsd: String(a.defaultBudgetUsd),
    defaultTimeoutMin: String(a.defaultTimeoutMin),
  });
  const [err, setErr] = useState<string | null>(null);
  const suspended = a.status === "suspended";
  const dirty =
    Number(form.maxConcurrent) !== a.maxConcurrent ||
    Number(form.defaultBudgetUsd) !== a.defaultBudgetUsd ||
    Number(form.defaultTimeoutMin) !== a.defaultTimeoutMin;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const maxConcurrent = Number(form.maxConcurrent);
    const defaultBudgetUsd = Number(form.defaultBudgetUsd);
    const defaultTimeoutMin = Number(form.defaultTimeoutMin);
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 50)
      return setErr("Max concurrent sessions must be a whole number from 1 to 50.");
    if (!(defaultBudgetUsd >= 0.5 && defaultBudgetUsd <= 200))
      return setErr("Default budget must be between $0.50 and $200.");
    if (!(defaultTimeoutMin >= 5 && defaultTimeoutMin <= 240))
      return setErr("Default timeout must be between 5 and 240 minutes.");
    setErr(null);
    update.mutate(
      { id: a.id, maxConcurrent, defaultBudgetUsd, defaultTimeoutMin },
      {
        onSuccess: () => toast.success(`${a.name} defaults saved`),
        onError: (e) => setErr(errorMessage(e)),
      },
    );
  };

  const toggle = (active: boolean) =>
    update.mutate(
      { id: a.id, status: active ? "active" : "suspended" },
      {
        onSuccess: () =>
          toast.success(active ? `${a.name} resumed` : `${a.name} suspended`, {
            description: active
              ? "New sessions can launch on this runtime again."
              : "No new sessions will launch. Running sessions finish their current step.",
          }),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );

  const field = (key: keyof typeof form, label: string, suffix: string, step = "1") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${key}`} className="text-xs">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`${id}-${key}`}
          type="number"
          inputMode="decimal"
          step={step}
          min={0}
          value={form[key]}
          disabled={!canManage}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="pr-12 tabular-nums"
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
          {suffix}
        </span>
      </div>
    </div>
  );

  return (
    <Card className={suspended ? "border-warning/40" : undefined}>
      <form onSubmit={save}>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Monogram
              text={providerById(a.provider)?.monogram ?? a.name.slice(0, 2).toUpperCase()}
            />
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {a.name}
                <Badge variant={suspended ? "warning" : "success"}>
                  {suspended ? (
                    <>
                      <PauseCircleIcon aria-hidden /> Suspended
                    </>
                  ) : (
                    <>
                      <PlayCircleIcon aria-hidden /> Active
                    </>
                  )}
                </Badge>
              </h3>
              <p className="text-muted-foreground text-xs">
                {PROVIDER_LABEL[a.provider]} · model <code className="font-mono">{a.model}</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${id}-active`} className="text-xs font-normal">
              {suspended ? "Suspended" : "Active"}
            </Label>
            <Switch
              id={`${id}-active`}
              checked={!suspended}
              disabled={!canManage || update.isPending}
              onCheckedChange={toggle}
              aria-label={suspended ? `Resume ${a.name}` : `Suspend ${a.name}`}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {field("maxConcurrent", "Max concurrent", "sessions")}
          {field("defaultBudgetUsd", "Default budget", "USD", "0.5")}
          {field("defaultTimeoutMin", "Default timeout", "min")}
          <div className="sm:col-span-3">
            <FieldError message={err} />
          </div>
        </CardContent>
        {canManage && (
          <CardFooter className="justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Agent cost is provider-reported on your own key.
            </p>
            <Button type="submit" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? "Saving…" : "Save defaults"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
