"use client";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConicalIcon, Loader2Icon, PlayIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRepositories, useStartTestRun, useTestSuites } from "@/lib/api/hooks";
import { NewTestRunInputSchema } from "@/lib/schemas";
import { GuardedButton } from "./guarded-button";
import { usePermission } from "./helpers";

/** Manual verification on a branch (SS-003: pinned to the branch head at start). */
export function RunVerificationDialog({
  open,
  onOpenChange,
  defaultRepositoryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultRepositoryId?: string;
}) {
  const repos = useRepositories();
  const [repositoryId, setRepositoryId] = useState("");
  const [branch, setBranch] = useState("main");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suites = useTestSuites(repositoryId || undefined);
  const start = useStartTestRun();
  const router = useRouter();
  const ids = { repo: useId(), branch: useId(), sim: useId(), err: useId() };

  useEffect(() => {
    if (!open) return;
    // Reset each time the dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRepositoryId(defaultRepositoryId ?? "");
    setBranch("main");
    setSimulateFailure(false);
    setError(null);
  }, [open, defaultRepositoryId]);

  useEffect(() => {
    const repo = repos.data?.find((r) => r.id === repositoryId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (repo) setBranch(repo.defaultBranch);
  }, [repositoryId, repos.data]);

  const enabledSuites = (suites.data ?? []).filter(
    (s) => s.enabled && (!repositoryId || s.repositoryId === repositoryId),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = NewTestRunInputSchema.safeParse({
      repositoryId,
      branch: branch.trim(),
      simulateFailure,
    });
    if (!parsed.success) {
      setError(repositoryId ? "Enter a branch name." : "Choose a repository.");
      return;
    }
    start.mutate(parsed.data, {
      onSuccess: (run) => {
        toast.success("Verification started", {
          description: `Pinned to ${run.headSha.slice(0, 7)} on ${run.branch}. Results appear live.`,
        });
        onOpenChange(false);
        router.push(`/app/shipsafe/runs/${run.id}`);
      },
      onError: (err) => toast.error("Couldn't start the run", { description: err.message }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run verification</DialogTitle>
          <DialogDescription>
            ShipSafe checks out the exact head commit of the branch in an isolated worker and runs
            the enabled suites. Pull requests are verified automatically; use this for branches and
            spot checks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.repo}>Repository</Label>
            <Select
              value={repositoryId}
              onValueChange={(v) => (setRepositoryId(v), setError(null))}
            >
              <SelectTrigger
                id={ids.repo}
                className="w-full"
                aria-invalid={!!error && !repositoryId}
                aria-describedby={error ? ids.err : undefined}
              >
                <SelectValue
                  placeholder={repos.isPending ? "Loading repositories…" : "Choose a repository"}
                />
              </SelectTrigger>
              <SelectContent>
                {repos.data?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.branch}>Branch</Label>
            <Input
              id={ids.branch}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {repositoryId && (
            <div className="bg-muted/50 rounded-md border p-3 text-xs">
              <p className="text-foreground mb-1.5 font-medium">Test plan</p>
              {suites.isPending ? (
                <p className="text-muted-foreground">Loading suites…</p>
              ) : enabledSuites.length ? (
                <ul className="flex flex-col gap-1">
                  {enabledSuites.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="text-muted-foreground shrink-0 font-mono">{s.command}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  No enabled suites for this repository. Add one in Test suites first.
                </p>
              )}
            </div>
          )}
          <div className="flex items-start gap-2.5 rounded-md border border-dashed p-3">
            <Checkbox
              id={ids.sim}
              checked={simulateFailure}
              onCheckedChange={(v) => setSimulateFailure(v === true)}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={ids.sim} className="inline-flex items-center gap-1.5">
                <FlaskConicalIcon className="text-muted-foreground size-3.5" aria-hidden />
                Simulate a failing test (demo)
              </Label>
              <p className="text-muted-foreground text-xs">
                Injects one product-defect failure with screenshot, trace and console evidence so
                you can see how failures are reported.
              </p>
            </div>
          </div>
          {error && (
            <p id={ids.err} role="alert" className="text-danger-foreground text-xs">
              {error}
            </p>
          )}
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <ShieldCheckIcon className="text-success size-3.5" aria-hidden /> Test-scoped secrets
            only. Results never merge anything.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                start.isPending || (!!repositoryId && !suites.isPending && !enabledSuites.length)
              }
            >
              {start.isPending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />} Start run
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Permission-aware trigger button. Disabled buttons explain why. */
export function RunVerificationButton({
  onClick,
  size = "default",
  variant = "default",
}: {
  onClick: () => void;
  size?: "default" | "sm";
  variant?: "default" | "outline";
}) {
  const perm = usePermission("test.run");
  return (
    <GuardedButton
      onClick={onClick}
      size={size}
      variant={variant}
      disabledReason={perm.allowed ? null : perm.reason}
    >
      <PlayIcon /> Run verification
    </GuardedButton>
  );
}
