"use client";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldError, errorMessage } from "@/components/settings/common";
import { useUpdateBudget } from "@/lib/api/hooks";
import { BudgetInputSchema, type Billing } from "@/lib/schemas";
import { formatUsd } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const THRESHOLD_CHOICES = [50, 75, 80, 90, 100];

export function BudgetDialog({
  open,
  onOpenChange,
  spend,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  spend: Billing["spend"];
}) {
  const id = useId();
  const update = useUpdateBudget();
  const [amount, setAmount] = useState("");
  const [hardCap, setHardCap] = useState(true);
  const [alerts, setAlerts] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount(String(spend.budgetUsd));
    setHardCap(spend.hardCap);
    setAlerts(spend.alertAtPct);
    setErrors({});
  }, [open, spend]);

  const choices = [...new Set([...THRESHOLD_CHOICES, ...alerts])].sort((a, b) => a - b);
  const n = Number(amount);
  const belowSpend = amount !== "" && Number.isFinite(n) && n < spend.usageCostUsd;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = BudgetInputSchema.safeParse({
      monthlyLimitUsd: amount === "" ? undefined : Number(amount),
      hardCap,
      alertAtPct: [...alerts].sort((a, b) => a - b),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] ??= i.message));
      if (errs.alertAtPct) errs.alertAtPct = "Choose up to 5 thresholds.";
      setErrors(errs);
      return;
    }
    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: (b) => {
        toast.success(`Monthly budget set to ${formatUsd(b.spend.budgetUsd)}`, {
          description: b.spend.hardCap
            ? "Work pauses when the cap is reached."
            : "Alerts only — work continues past the budget.",
        });
        onOpenChange(false);
      },
      onError: (e) => setErrors({ form: errorMessage(e, "Couldn't save the budget") }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Set execution budget</DialogTitle>
            <DialogDescription>
              Covers metered agent runtime, browser minutes and storage this month. Your plan
              subscription is separate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-amount`}>Monthly limit (USD)</Label>
            <Input
              id={`${id}-amount`}
              type="number"
              inputMode="decimal"
              min={0}
              step={10}
              autoFocus
              value={amount}
              aria-invalid={!!errors.monthlyLimitUsd}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Spent so far: {formatUsd(spend.usageCostUsd)} · projected{" "}
              {formatUsd(spend.projectedUsd)} by period end.
            </p>
            {belowSpend && (
              <p className="text-warning-foreground text-xs">
                This is below what you&apos;ve already spent
                {hardCap ? " — new sessions will pause immediately." : "."}
              </p>
            )}
            <FieldError message={errors.monthlyLimitUsd} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor={`${id}-cap`}>Hard cap</Label>
              <p className="text-muted-foreground mt-1 text-xs">
                When on, agent sessions and test runs pause at 100% until you raise the budget. When
                off, you only get alerts.
              </p>
            </div>
            <Switch id={`${id}-cap`} checked={hardCap} onCheckedChange={setHardCap} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Alert me at</legend>
            <div className="flex flex-wrap gap-1.5">
              {choices.map((pct) => {
                const on = alerts.includes(pct);
                return (
                  <button
                    key={pct}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setAlerts((a) => (on ? a.filter((x) => x !== pct) : [...a, pct]))
                    }
                    className={cn(
                      "focus-visible:ring-ring/50 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums outline-none focus-visible:ring-[3px]",
                      on
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "hover:bg-accent",
                    )}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              Up to 5 thresholds. Alerts go to owners by email and to Slack if connected.
            </p>
            <FieldError message={errors.alertAtPct} />
          </fieldset>
          <FieldError message={errors.form} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
