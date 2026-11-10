"use client";
import { useEffect, useState } from "react";
import { AlertTriangleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { PermissionNote, errorMessage } from "@/components/settings/common";
import { useChangePlan, usePlans } from "@/lib/api/hooks";
import type { Plan, PlanId } from "@/lib/schemas";
import { formatNumber, formatUsd } from "@/lib/domain/format";
import { isUpgrade, planById } from "@/lib/domain/plans";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "annual";

function price(p: Plan, cycle: Cycle) {
  return cycle === "annual" ? p.priceAnnualMonthlyUsd : p.priceMonthlyUsd;
}
function limit(n: number | null, unit: string) {
  if (n === null) return `Unlimited ${unit}`;
  return `${formatNumber(n)} ${n === 1 ? unit.replace(/s$/, "") : unit}`;
}

export function PlanDialog({
  open,
  onOpenChange,
  current,
  currentCycle,
  canChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: PlanId;
  currentCycle: Cycle;
  canChange: boolean;
}) {
  const plans = usePlans();
  const change = useChangePlan();
  const [cycle, setCycle] = useState<Cycle>(currentCycle);
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCycle(currentCycle);
    setSelected(null);
    setErr(null);
  }, [open, currentCycle]);

  const target = selected ? planById(selected) : null;
  const savePct = Math.max(
    0,
    ...(plans.data ?? []).map((p) =>
      p.priceMonthlyUsd && p.priceAnnualMonthlyUsd !== null
        ? Math.round((1 - p.priceAnnualMonthlyUsd / p.priceMonthlyUsd) * 100)
        : 0,
    ),
  );
  const confirm = () => {
    if (!selected || !target) return;
    setErr(null);
    change.mutate(
      { plan: selected, billingCycle: cycle },
      {
        onSuccess: () => {
          toast.success(`You're on ${target.name} (${cycle})`, {
            description:
              "New limits apply now. The change is prorated on your next invoice (mock checkout).",
          });
          onOpenChange(false);
        },
        onError: (e) => setErr(errorMessage(e, "Couldn't change the plan")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>
            Every plan includes all three modules. Quotas differ; usage beyond them is metered
            transparently and your hard cap still applies.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className="bg-muted inline-flex rounded-lg p-[3px]"
          >
            {(["monthly", "annual"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                onClick={() => setCycle(c)}
                className={cn(
                  "focus-visible:ring-ring/50 rounded-md px-3 py-1 text-sm font-medium outline-none focus-visible:ring-[3px]",
                  cycle === c ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {c === "monthly" ? "Monthly" : "Annual"}
                {c === "annual" && savePct > 0 && (
                  <span className="text-success-foreground ml-1.5 text-xs">
                    save up to {savePct}%
                  </span>
                )}
              </button>
            ))}
          </div>
          {!canChange && (
            <PermissionNote className="max-w-md">
              Only the workspace owner can change the plan. You can compare plans here.
            </PermissionNote>
          )}
        </div>

        {plans.isPending ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : plans.error || !plans.data ? (
          <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {plans.data.map((p) => {
              const isCurrent = p.id === current && cycle === currentCycle;
              const amount = price(p, cycle);
              const isSelected = selected === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border p-4",
                    p.highlighted && "border-primary/50",
                    isSelected && "ring-primary ring-2",
                    p.id === current && "bg-muted/40",
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold">{p.name}</h3>
                      {p.id === current && <Badge variant="neutral">Current</Badge>}
                      {p.highlighted && p.id !== current && <Badge variant="accent">Popular</Badge>}
                    </div>
                    <p className="text-muted-foreground text-xs">{p.tagline}</p>
                  </div>
                  <div>
                    {amount === null ? (
                      <p className="text-xl font-semibold">Custom</p>
                    ) : (
                      <p className="text-xl font-semibold tabular-nums">
                        {formatUsd(amount)}
                        <span className="text-muted-foreground text-xs font-normal"> /mo</span>
                      </p>
                    )}
                    <p className="text-muted-foreground text-[11px]">
                      {amount === null
                        ? "Annual agreement"
                        : cycle === "annual" && amount > 0
                          ? `${formatUsd(amount * 12)} billed yearly`
                          : "Billed monthly"}
                    </p>
                  </div>
                  <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
                    <li>{limit(p.limits.seats, "seats")}</li>
                    <li>{limit(p.limits.repositories, "repositories")}</li>
                    <li>{limit(p.limits.agentMinutes, "agent min")}</li>
                    <li>{limit(p.limits.concurrentSessions, "concurrent sessions")}</li>
                  </ul>
                  <ul className="flex flex-col gap-1 border-t pt-2 text-xs">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-1.5">
                        <CheckIcon
                          className="text-success-foreground mt-0.5 size-3 shrink-0"
                          aria-hidden
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-1">
                    {p.id === "enterprise" ? (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href="mailto:sales@forgepilot.example?subject=ForgePilot%20Enterprise">
                          Talk to sales
                        </a>
                      </Button>
                    ) : isCurrent ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isSelected ? "default" : "outline"}
                        disabled={!canChange}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelected(p.id);
                          setErr(null);
                        }}
                      >
                        Choose {p.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {err && (
          <div
            role="alert"
            className="border-danger/30 bg-danger-soft/50 text-danger-foreground flex items-start gap-2 rounded-md border p-3 text-sm"
          >
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">{err}</p>
              <p className="text-xs opacity-90">
                Remove members or repositories first, or choose a larger plan.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {target ? (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {planById(current).name} ({currentCycle})
                <ArrowRightIcon className="size-3.5" aria-hidden />
                <span className="text-foreground font-medium">
                  {target.name} ({cycle})
                </span>
                {price(target, cycle) !== null && <>· {formatUsd(price(target, cycle)!)}/mo</>}
                {!isUpgrade(current, target.id) && target.id !== current && (
                  <Badge variant="warning">Downgrade</Badge>
                )}
              </span>
            ) : (
              "Choose a plan to see the change."
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={!target || !canChange || change.isPending}>
              {change.isPending ? "Changing…" : "Confirm change"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
