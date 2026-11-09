"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, PlusIcon, ShieldCheckIcon, XIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAgents, useCreateTask, usePolicy, useRepositories } from "@/lib/api/hooks";
import { NewTaskInputSchema, type NewTaskInput, type Priority } from "@/lib/schemas";
import { PRIORITY_LABEL } from "@/lib/domain/labels";

type Defaults = Partial<Pick<NewTaskInput, "repositoryId" | "title" | "description" | "agentId">>;

const EMPTY = {
  repositoryId: "",
  title: "",
  description: "",
  criteria: ["", ""],
  constraints: "Keep public APIs backwards compatible",
  priority: "medium" as Priority,
  agentId: "",
  targetBranch: "main",
  budgetUsd: "6",
  timeoutMin: "45",
  launch: true,
};

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="text-danger-foreground text-xs" role="alert">
      {msg}
    </p>
  ) : null;
}

/** DP-001: task with repository, branch, acceptance criteria, constraints, budget and timeout. Vague tasks are flagged. */
export function NewTaskDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaults?: Defaults;
}) {
  const [d, setD] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const repos = useRepositories();
  const agents = useAgents();
  const policy = usePolicy();
  const create = useCreateTask();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    // Reset each time the dialog opens, applying defaults.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD({
      ...EMPTY,
      repositoryId: defaults?.repositoryId ?? "",
      title: defaults?.title ?? "",
      description: defaults?.description ?? "",
      agentId: defaults?.agentId ?? "",
    });
    setErrors({});
  }, [open, defaults]);

  useEffect(() => {
    const first = agents.data?.find((a) => a.status === "active");
    if (!open || d.agentId || !first) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD((s) => ({ ...s, agentId: first.id, budgetUsd: String(first.defaultBudgetUsd) }));
  }, [open, agents.data, d.agentId]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setD((s) => ({ ...s, [k]: v }));
  const criteria = d.criteria.map((c) => c.trim()).filter(Boolean);
  const vague =
    d.description.trim().length > 0 && (d.description.trim().length < 40 || criteria.length < 2);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      repositoryId: d.repositoryId,
      title: d.title,
      description: d.description,
      acceptanceCriteria: criteria,
      constraints: d.constraints
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      priority: d.priority,
      agentId: d.agentId,
      targetBranch: d.targetBranch,
      budgetUsd: Number(d.budgetUsd),
      timeoutMin: Number(d.timeoutMin),
      launch: d.launch,
    };
    const parsed = NewTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] ??= i.message));
      setErrors(errs);
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: (task) => {
        toast.success(d.launch ? "Task created and agent launched" : "Draft task saved", {
          description: task.title,
        });
        onOpenChange(false);
        router.push(`/app/devpilot/tasks/${task.id}`);
      },
      onError: (err) => toast.error("Could not create task", { description: err.message }),
    });
  };

  const aria = (k: string) =>
    errors[k] ? { "aria-invalid": true as const, "aria-describedby": `nt-${k}-err` } : {};
  const protectedPaths = policy.data?.protectedPaths ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            The agent works in an isolated workspace on its own branch. Nothing merges without a
            human.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submit}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          aria-label="New task"
        >
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nt-title">Title</Label>
            <Input
              id="nt-title"
              value={d.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Add idempotency keys to POST /refunds"
              {...aria("title")}
            />
            <Err id="nt-title-err" msg={errors.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-repo">Repository</Label>
            <Select value={d.repositoryId} onValueChange={(v) => set("repositoryId", v)}>
              <SelectTrigger id="nt-repo" {...aria("repositoryId")}>
                <SelectValue placeholder="Choose a repository" />
              </SelectTrigger>
              <SelectContent>
                {(repos.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Err id="nt-repositoryId-err" msg={errors.repositoryId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-agent">Agent</Label>
            <Select value={d.agentId} onValueChange={(v) => set("agentId", v)}>
              <SelectTrigger id="nt-agent" {...aria("agentId")}>
                <SelectValue placeholder="Choose an agent" />
              </SelectTrigger>
              <SelectContent>
                {(agents.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id} disabled={a.status !== "active"}>
                    {a.name} · {a.model}
                    {a.status !== "active" ? " (suspended)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Err id="nt-agentId-err" msg={errors.agentId} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nt-desc">Goal and context</Label>
            <Textarea
              id="nt-desc"
              value={d.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="What should change and why. Link the issue if there is one."
              {...aria("description")}
            />
            <Err id="nt-description-err" msg={errors.description} />
          </div>
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">Acceptance criteria</legend>
            {d.criteria.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Acceptance criterion ${i + 1}`}
                  value={c}
                  onChange={(e) =>
                    set(
                      "criteria",
                      d.criteria.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  placeholder={
                    i === 0
                      ? "e.g. Replayed requests return the original response"
                      : "Another verifiable outcome"
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove criterion ${i + 1}`}
                  onClick={() =>
                    set(
                      "criteria",
                      d.criteria.filter((_, j) => j !== i),
                    )
                  }
                  disabled={d.criteria.length === 1}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => set("criteria", [...d.criteria, ""])}
            >
              <PlusIcon /> Add criterion
            </Button>
            <Err id="nt-acceptanceCriteria-err" msg={errors.acceptanceCriteria} />
            {vague && (
              <p
                className="bg-warning-soft text-warning-foreground flex items-start gap-2 rounded-md p-2 text-xs"
                role="status"
              >
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden /> This looks
                vague. Agents do best with a clear goal and at least two verifiable criteria.
              </p>
            )}
          </fieldset>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nt-constraints">Constraints (one per line)</Label>
            <Textarea
              id="nt-constraints"
              value={d.constraints}
              onChange={(e) => set("constraints", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nt-priority">Priority</Label>
              <Select value={d.priority} onValueChange={(v) => set("priority", v as Priority)}>
                <SelectTrigger id="nt-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nt-branch">Target branch</Label>
              <Input
                id="nt-branch"
                value={d.targetBranch}
                onChange={(e) => set("targetBranch", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nt-budget">Budget (USD)</Label>
              <Input
                id="nt-budget"
                type="number"
                min={0.5}
                step={0.5}
                value={d.budgetUsd}
                onChange={(e) => set("budgetUsd", e.target.value)}
                {...aria("budgetUsd")}
              />
              <Err id="nt-budgetUsd-err" msg={errors.budgetUsd} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nt-timeout">Timeout (min)</Label>
              <Input
                id="nt-timeout"
                type="number"
                min={5}
                max={240}
                value={d.timeoutMin}
                onChange={(e) => set("timeoutMin", e.target.value)}
                {...aria("timeoutMin")}
              />
              <Err id="nt-timeoutMin-err" msg={errors.timeoutMin} />
            </div>
          </div>
          <div className="bg-muted/50 flex flex-col gap-1 rounded-md p-3 text-xs sm:col-span-2">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheckIcon className="text-success size-3.5" aria-hidden /> What the agent will
              be allowed to do
            </span>
            <span className="text-muted-foreground">
              Read and change{" "}
              <b>
                {repos.data?.find((r) => r.id === d.repositoryId)?.fullName ??
                  "the selected repository"}
              </b>{" "}
              on a new branch, run tests in an isolated container, reach{" "}
              {policy.data?.networkAllowlist.length ?? 0} allowlisted hosts, and open a pull
              request.
              {protectedPaths.length
                ? ` Writing ${protectedPaths.join(", ")} pauses for approval.`
                : ""}{" "}
              No production secrets.
            </span>
          </div>
          <DialogFooter className="items-center sm:col-span-2 sm:justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={d.launch} onCheckedChange={(v) => set("launch", v === true)} />{" "}
              Launch the agent now
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : d.launch ? "Create & launch" : "Save draft"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
