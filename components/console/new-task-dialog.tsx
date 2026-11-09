"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClients, useCreateTask, useEngineers, useRepositories } from "@/lib/api/hooks";
import { NewTaskInputSchema, type NewTaskInput } from "@/lib/schemas";
import { AGENT_LABEL, PRIORITY_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";

type Draft = {
  orgId: string;
  repositoryId: string;
  type: NewTaskInput["type"];
  title: string;
  description: string;
  criteria: string;
  agent: NewTaskInput["agent"];
  priority: NewTaskInput["priority"];
  assigneeUserId: string;
};

const EMPTY: Draft = {
  orgId: "",
  repositoryId: "",
  type: "bug_fix",
  title: "",
  description: "",
  criteria: "All existing tests pass\nNo new high/critical findings",
  agent: "claude_code",
  priority: "p1",
  assigneeUserId: "",
};

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="text-danger-foreground text-xs" role="alert">
      {msg}
    </p>
  );
}

/** C-02 "New task" dialog. Validates with the same Zod schema the API uses. */
export function NewTaskDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaults?: { orgId?: string; repositoryId?: string };
}) {
  const [d, setD] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clients = useClients();
  const repos = useRepositories({ orgId: d.orgId || undefined });
  const engineers = useEngineers();
  const create = useCreateTask();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      // Reset the form each time the dialog opens, applying any defaults.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setD({ ...EMPTY, orgId: defaults?.orgId ?? "", repositoryId: defaults?.repositoryId ?? "" });
      setErrors({});
    }
  }, [open, defaults]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      orgId: d.orgId,
      repositoryId: d.repositoryId,
      type: d.type,
      title: d.title,
      description: d.description,
      acceptanceCriteria: d.criteria.split("\n").map((s) => s.trim()).filter(Boolean),
      agent: d.agent,
      priority: d.priority,
      assigneeUserId: d.assigneeUserId || null,
    };
    const parsed = NewTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = String(i.path[0]);
        errs[k] ??= i.message;
      });
      setErrors(errs);
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: (task) => {
        toast.success("Task created", { description: `${task.title} · ${task.organizationName}` });
        onOpenChange(false);
        router.push(`/console/tasks/${task.id}`);
      },
      onError: (err) => toast.error("Could not create task", { description: err.message }),
    });
  };

  const err = (k: string) => errors[k];
  const aria = (k: string) => (err(k) ? { "aria-invalid": true, "aria-describedby": `nt-${k}-err` } : {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            The agent works in a sandbox on a branch. Nothing reaches the client until verification passes and you sign off.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2" aria-label="New task">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-org">Client</Label>
            <Select value={d.orgId} onValueChange={(v) => setD((s) => ({ ...s, orgId: v, repositoryId: "" }))}>
              <SelectTrigger id="nt-org" {...aria("orgId")}>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {(clients.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="nt-orgId-err" msg={err("orgId")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-repo">Repository</Label>
            <Select value={d.repositoryId} onValueChange={(v) => set("repositoryId", v)} disabled={!d.orgId}>
              <SelectTrigger id="nt-repo" {...aria("repositoryId")}>
                <SelectValue placeholder={d.orgId ? "Choose a repository" : "Choose a client first"} />
              </SelectTrigger>
              <SelectContent>
                {(repos.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.applicationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="nt-repositoryId-err" msg={err("repositoryId")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-type">Type</Label>
            <Select value={d.type} onValueChange={(v) => set("type", v as Draft["type"])}>
              <SelectTrigger id="nt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_TYPE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-priority">Priority</Label>
            <Select value={d.priority} onValueChange={(v) => set("priority", v as Draft["priority"])}>
              <SelectTrigger id="nt-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nt-title">Title</Label>
            <Input id="nt-title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Patch CVE-2026-1182 in base image" {...aria("title")} />
            <FieldError id="nt-title-err" msg={err("title")} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nt-desc">Description (plain English for the client)</Label>
            <Textarea id="nt-desc" value={d.description} onChange={(e) => set("description", e.target.value)} rows={3} {...aria("description")} />
            <FieldError id="nt-description-err" msg={err("description")} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nt-ac">Acceptance criteria (one per line)</Label>
            <Textarea id="nt-ac" value={d.criteria} onChange={(e) => set("criteria", e.target.value)} rows={3} {...aria("acceptanceCriteria")} />
            <FieldError id="nt-acceptanceCriteria-err" msg={err("acceptanceCriteria")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-agent">Agent</Label>
            <Select value={d.agent} onValueChange={(v) => set("agent", v as Draft["agent"])}>
              <SelectTrigger id="nt-agent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude_code">{AGENT_LABEL.claude_code}</SelectItem>
                <SelectItem value="codex">{AGENT_LABEL.codex}</SelectItem>
                <SelectItem value="devin" disabled>
                  {AGENT_LABEL.devin} (Phase 2)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nt-assignee">Assignee</Label>
            <Select value={d.assigneeUserId || "__me"} onValueChange={(v) => set("assigneeUserId", v === "__me" ? "" : v)}>
              <SelectTrigger id="nt-assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__me">Me</SelectItem>
                {(engineers.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
