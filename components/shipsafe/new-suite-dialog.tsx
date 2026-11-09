"use client";
import { useEffect, useId, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSuite, useRepositories } from "@/lib/api/hooks";
import { TestSuiteInputSchema, type TestSuiteInput } from "@/lib/schemas";

const TYPES: {
  value: TestSuiteInput["type"];
  label: string;
  command: string;
  env: string;
  hint: string;
}[] = [
  {
    value: "unit",
    label: "Unit",
    command: "pnpm test",
    env: "ci-sandbox",
    hint: "Fast, no browser. Runs in a sandbox with no network.",
  },
  {
    value: "playwright",
    label: "Playwright (browser)",
    command: "pnpm exec playwright test",
    env: "preview",
    hint: "Runs against the PR preview. Captures screenshots, traces, console and network.",
  },
  {
    value: "api",
    label: "API checks",
    command: "pnpm test:api",
    env: "ci-sandbox",
    hint: "HTTP requests with assertions against the service under test.",
  },
];
const ENVIRONMENTS = [
  { value: "ci-sandbox", label: "CI sandbox (isolated, no network)" },
  { value: "preview", label: "PR preview environment" },
  { value: "staging", label: "Shared staging" },
];

const EMPTY = {
  repositoryId: "",
  name: "",
  type: "playwright" as TestSuiteInput["type"],
  command: TYPES[1].command,
  environment: "preview",
  pathRules: "src/**",
  timeoutMin: "15",
  required: false,
};

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="text-danger-foreground text-xs" role="alert">
      {msg}
    </p>
  ) : null;
}

/** PRD §7.5 Test suite manager: define what runs, where and when (SS-005). */
export function NewSuiteDialog({
  open,
  onOpenChange,
  defaultRepositoryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultRepositoryId?: string;
}) {
  const repos = useRepositories();
  const create = useCreateSuite();
  const [d, setD] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = useId();
  const f = (k: string) => `${id}-${k}`;

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD({ ...EMPTY, repositoryId: defaultRepositoryId ?? "" });
    setErrors({});
  }, [open, defaultRepositoryId]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const typeInfo = TYPES.find((t) => t.value === d.type)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = TestSuiteInputSchema.safeParse({
      repositoryId: d.repositoryId,
      name: d.name,
      type: d.type,
      command: d.command,
      environment: d.environment,
      pathRules: d.pathRules
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      timeoutMin: Number(d.timeoutMin),
      required: d.required,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach(
        (i) =>
          (errs[String(i.path[0])] ??=
            i.path[0] === "timeoutMin"
              ? "Timeout must be a whole number between 1 and 120 minutes"
              : i.message),
      );
      setErrors(errs);
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: (s) => {
        toast.success(`Suite “${s.name}” created`, {
          description: "It's enabled and will be selected when changed files match its path rules.",
        });
        onOpenChange(false);
      },
      onError: (err) => toast.error("Couldn't create the suite", { description: err.message }),
    });
  };

  const described = (k: string) =>
    errors[k] ? { "aria-invalid": true, "aria-describedby": f(`${k}-err`) } : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New test suite</DialogTitle>
          <DialogDescription>
            Tell ShipSafe what to run, where, and which file changes should trigger it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={f("repo")}>Repository</Label>
              <Select value={d.repositoryId} onValueChange={(v) => set("repositoryId", v)}>
                <SelectTrigger id={f("repo")} className="w-full" {...described("repositoryId")}>
                  <SelectValue placeholder="Choose a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos.data?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Err id={f("repositoryId-err")} msg={errors.repositoryId} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={f("name")}>Name</Label>
              <Input
                id={f("name")}
                value={d.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Checkout flow (Playwright)"
                {...described("name")}
              />
              <Err id={f("name-err")} msg={errors.name} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={f("type")}>Type</Label>
              <Select
                value={d.type}
                onValueChange={(v) => {
                  const t = TYPES.find((x) => x.value === v)!;
                  setD((s) => ({ ...s, type: t.value, command: t.command, environment: t.env }));
                }}
              >
                <SelectTrigger id={f("type")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{typeInfo.hint}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={f("env")}>Environment</Label>
              <Select value={d.environment} onValueChange={(v) => set("environment", v)}>
                <SelectTrigger id={f("env")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Secrets are injected by reference and scoped to tests only.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={f("cmd")}>Command</Label>
            <Input
              id={f("cmd")}
              value={d.command}
              onChange={(e) => set("command", e.target.value)}
              className="font-mono"
              spellCheck={false}
              autoComplete="off"
              {...described("command")}
            />
            <Err id={f("command-err")} msg={errors.command} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={f("rules")}>Path rules</Label>
              <Textarea
                id={f("rules")}
                value={d.pathRules}
                onChange={(e) => set("pathRules", e.target.value)}
                rows={3}
                className="font-mono text-xs"
                spellCheck={false}
                {...described("pathRules")}
                aria-describedby={errors.pathRules ? f("pathRules-err") : f("rules-hint")}
              />
              <p id={f("rules-hint")} className="text-muted-foreground text-xs">
                One glob per line. The suite runs when a changed file matches, and the run records
                which rule matched.
              </p>
              <Err id={f("pathRules-err")} msg={errors.pathRules} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={f("timeout")}>Timeout (min)</Label>
              <Input
                id={f("timeout")}
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={d.timeoutMin}
                onChange={(e) => set("timeoutMin", e.target.value)}
                {...described("timeoutMin")}
              />
              <Err id={f("timeoutMin-err")} msg={errors.timeoutMin} />
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={f("req")}>Required check</Label>
              <p className="text-muted-foreground text-xs">
                A failure here makes the GitHub Check Run fail. Your branch protection decides
                whether that blocks merging.
              </p>
            </div>
            <Switch
              id={f("req")}
              checked={d.required}
              onCheckedChange={(v) => set("required", v)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />} Create
              suite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
