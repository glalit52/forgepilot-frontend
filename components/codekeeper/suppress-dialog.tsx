"use client";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useFindingAction } from "@/lib/api/hooks";
import { FindingActionInputSchema } from "@/lib/schemas";
import { formatDate } from "@/lib/domain/format";

/** CK-011: suppress with a reason and an expiry, capped by workspace policy. */
export function SuppressDialog({
  open,
  onOpenChange,
  findingId,
  findingTitle,
  maxDays,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  findingId: string;
  findingTitle: string;
  maxDays: number;
}) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(String(Math.min(30, maxDays)));
  const [errors, setErrors] = useState<{ reason?: string; days?: string }>({});
  const action = useFindingAction(findingId);

  // Mounted fresh each time the dialog opens, so this is "now" at open time.
  const [openedAt] = useState(() => Date.now());

  const n = Number(days);
  const until =
    Number.isFinite(n) && n > 0
      ? formatDate(new Date(openedAt + n * 86_400_000).toISOString())
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = FindingActionInputSchema.safeParse({
      action: "suppress",
      reason,
      expiresInDays: n,
    });
    const errs: typeof errors = {};
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] === "reason" ? "reason" : "days";
        errs[k] ??=
          k === "days" ? `Enter a whole number of days between 1 and ${maxDays}` : i.message;
      });
    }
    if (!errs.days && n > maxDays)
      errs.days = `Your workspace policy allows at most ${maxDays} days`;
    setErrors(errs);
    if (Object.keys(errs).length || !parsed.success) return;
    action.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Finding suppressed", {
          description: `Hidden from the queue until ${until}. It reopens automatically if still detected.`,
        });
        onOpenChange(false);
      },
      onError: (err) => toast.error("Couldn't suppress the finding", { description: err.message }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Suppress finding</DialogTitle>
            <DialogDescription>
              {findingTitle}. Suppressions are recorded in the audit log and expire, so nothing
              stays hidden forever.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suppress-reason">Reason</Label>
            <Textarea
              id="suppress-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Only used in a build script; not reachable at runtime."
              aria-invalid={!!errors.reason}
              aria-describedby={errors.reason ? "suppress-reason-err" : undefined}
              rows={3}
            />
            {errors.reason && (
              <p id="suppress-reason-err" role="alert" className="text-danger-foreground text-xs">
                {errors.reason}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suppress-days">Expires after (days)</Label>
            <Input
              id="suppress-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxDays}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              aria-invalid={!!errors.days}
              aria-describedby="suppress-days-help"
              className="w-32"
            />
            <p
              id="suppress-days-help"
              className={
                errors.days ? "text-danger-foreground text-xs" : "text-muted-foreground text-xs"
              }
              role={errors.days ? "alert" : undefined}
            >
              {errors.days ??
                `Up to ${maxDays} days by workspace policy.${until ? ` Expires ${until}.` : ""}`}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={action.isPending}>
              {action.isPending ? "Saving…" : "Confirm suppression"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
