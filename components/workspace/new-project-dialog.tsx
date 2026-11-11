"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";
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
import { useCreateProject } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { NewProjectInputSchema } from "@/lib/schemas";

/** Create a project. A 402 from the API means the plan's project limit is reached. */
export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState<string | null>(null);
  const create = useCreateProject();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    // Reset the form each time it opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName("");
    setDescription("");
    setError(null);
    setPlanLimit(null);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = NewProjectInputSchema.safeParse({ name, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setError(null);
    create.mutate(parsed.data, {
      onSuccess: (p) => {
        toast.success(`Project "${p.name}" created`, {
          description: "Connect a repository to start verifying its pull requests.",
        });
        onOpenChange(false);
        router.push(`/app/projects/${p.id}`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 402) setPlanLimit(err.message);
        else toast.error("Couldn't create the project", { description: err.message });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              A project groups the repositories that make up one product, with shared budgets and
              reporting.
            </DialogDescription>
          </DialogHeader>
          {planLimit && (
            <div
              role="alert"
              className="border-primary/30 bg-accent/40 flex flex-col items-start gap-2 rounded-lg border p-4"
            >
              <p className="text-sm font-medium">
                You&apos;ve reached your plan&apos;s project limit
              </p>
              <p className="text-muted-foreground text-sm">{planLimit}</p>
              <Button asChild size="sm">
                <Link href="/app/billing?upgrade=1">
                  <SparklesIcon /> See upgrade options
                </Link>
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer portal"
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "project-name-error" : undefined}
            />
            {error && (
              <p id="project-name-error" role="alert" className="text-danger-foreground text-xs">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this product does and who it's for"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
