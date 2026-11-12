"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  BotIcon,
  BuildingIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  GitBranchIcon,
  HeartPulseIcon,
  Loader2Icon,
  LockIcon,
  RadarIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAuthOptions,
  useConnectRepositories,
  useCreateWorkspace,
  useFirstRun,
  useGithubRepositories,
  useInstallGithub,
  useProjects,
  useRepoConfig,
  useRepositories,
  useRepository,
  useSession,
  useSessionStatus,
  useTestRun,
} from "@/lib/api/hooks";
import {
  CreateWorkspaceInputSchema,
  type CreateWorkspaceInput,
  type WorkspaceKind,
} from "@/lib/schemas";
import { USE_CASE_LABEL } from "@/lib/domain/labels";
import { formatDuration, formatRelative } from "@/lib/domain/format";
import { HealthScore } from "@/components/shared/health-score";
import { CommitSha } from "@/components/shared/misc";
import { RunStatusBadge } from "@/components/shared/status-badge";
import { GithubMark } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

const STEPS = [
  "Workspace",
  "Install GitHub App",
  "Repositories",
  "Discovery",
  "First run",
] as const;

const SCOPE_COPY: Record<string, string> = {
  "contents:read": "Read code in the repositories you select, to understand them and run tests",
  "pull_requests:write": "Open pull requests for agent and maintenance changes (never merge)",
  "checks:write": "Post ShipSafe results as GitHub Check Runs",
  "issues:read": "Import issues as DevPilot tasks",
};

function Stepper({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Setup progress">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className="flex flex-col gap-1.5"
          aria-current={i === step ? "step" : undefined}
        >
          <span
            className={cn("h-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")}
            aria-hidden
          />
          <span
            className={cn(
              "text-xs",
              i === step ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {i + 1}. {s}
            {i < step && <span className="sr-only"> (done)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function useTimer() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.round((now - start) / 1000);
}

export function OnboardingWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const status = useSessionStatus();
  // Only ask for the full session once a workspace exists (avoids an expected 403 for brand-new accounts).
  const session = useSession({ enabled: !!status.data?.hasWorkspace });
  const hasWorkspace = !!status.data?.hasWorkspace;
  const wantsNew = params.get("new") === "1";
  const [step, setStep] = useState<number | null>(null);
  const [account, setAccount] = useState("");
  const [repoIds, setRepoIds] = useState<string[]>([]);
  const elapsed = useTimer();

  // Decide the starting step once we know whether the user has a workspace.
  useEffect(() => {
    if (step !== null || status.isPending || (hasWorkspace && session.isPending)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(hasWorkspace && !wantsNew ? 1 : 0);
    if (session.data) setAccount(session.data.workspace.slug);
  }, [status.isPending, session.isPending, session.data, hasWorkspace, wantsNew, step]);

  if (step === null)
    return (
      <div
        className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm"
        aria-busy="true"
      >
        <Loader2Icon className="size-4 animate-spin" aria-hidden /> Preparing setup…
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {step === 0 ? "Create your workspace" : "Connect your code"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Most teams see their first verified result in under 15 minutes.
          </p>
        </div>
        <span
          className="text-muted-foreground inline-flex items-center gap-1.5 text-xs tabular-nums"
          aria-live="off"
        >
          <ClockIcon className="size-3.5" aria-hidden /> {formatDuration(elapsed)} so far
        </span>
      </div>
      <Stepper step={step} />
      {step === 0 && (
        <WorkspaceStep
          onDone={(slug) => {
            setAccount(slug);
            setStep(1);
          }}
        />
      )}
      {step === 1 && (
        <GithubStep account={account} setAccount={setAccount} onDone={() => setStep(2)} />
      )}
      {step === 2 && (
        <ReposStep
          account={account}
          onDone={(ids) => {
            setRepoIds(ids);
            setStep(3);
          }}
        />
      )}
      {step === 3 && <DiscoveryStep repoIds={repoIds} onDone={() => setStep(4)} />}
      {step === 4 && (
        <FirstRunStep repoIds={repoIds} elapsed={elapsed} onFinish={() => router.push("/app")} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 1. workspace
function WorkspaceStep({ onDone }: { onDone: (slug: string) => void }) {
  const [d, setD] = useState<CreateWorkspaceInput>({
    name: "",
    kind: "team",
    useCase: "ship_ai_code_safely",
  });
  const [error, setError] = useState<string | null>(null);
  const create = useCreateWorkspace();
  const kinds: {
    kind: WorkspaceKind;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    text: string;
  }[] = [
    { kind: "personal", icon: UserIcon, title: "Just me", text: "Personal projects and side work" },
    {
      kind: "team",
      icon: UsersIcon,
      title: "My team",
      text: "Shared projects, roles and approvals",
    },
    { kind: "agency", icon: BuildingIcon, title: "Agency", text: "Client projects in one place" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Who is this workspace for?</CardTitle>
        <CardDescription>You can invite teammates and change this later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          aria-label="Create workspace"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const r = CreateWorkspaceInputSchema.safeParse(d);
            if (!r.success) return setError(r.error.issues[0]?.message ?? "Check the form");
            setError(null);
            create.mutate(r.data, {
              onSuccess: (o) => {
                toast.success(`${o.name} is ready`, {
                  description: "Team features are free for 14 days.",
                });
                onDone(o.slug);
              },
              onError: (err) =>
                toast.error("Could not create the workspace", { description: err.message }),
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              placeholder="e.g. Acme Engineering"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "ws-name-err" : undefined}
            />
            {error && (
              <p id="ws-name-err" role="alert" className="text-danger-foreground text-xs">
                {error}
              </p>
            )}
          </div>
          <div
            role="radiogroup"
            aria-label="Workspace type"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {kinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={d.kind === k.kind}
                onClick={() =>
                  setD({
                    ...d,
                    kind: k.kind,
                    useCase:
                      k.kind === "agency"
                        ? "agency_client_repos"
                        : k.kind === "personal"
                          ? "personal_projects"
                          : d.useCase,
                  })
                }
                className={cn(
                  "focus-visible:ring-ring/50 flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left focus-visible:ring-[3px] focus-visible:outline-none",
                  d.kind === k.kind ? "border-primary bg-accent/50" : "hover:bg-accent/30",
                )}
              >
                <k.icon className="text-primary size-5" />
                <span className="font-medium">{k.title}</span>
                <span className="text-muted-foreground text-xs">{k.text}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-use">What do you want to do first?</Label>
            <Select
              value={d.useCase}
              onValueChange={(v) => setD({ ...d, useCase: v as CreateWorkspaceInput["useCase"] })}
            >
              <SelectTrigger id="ws-use">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USE_CASE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="self-end" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create workspace"} <ArrowRightIcon />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- 2. github app
function GithubStep({
  account,
  setAccount,
  onDone,
}: {
  account: string;
  setAccount: (a: string) => void;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const install = useInstallGithub();
  const scopes = Object.keys(SCOPE_COPY);
  // Real backend: installing happens on github.com, which sends the user back here
  // with ?installation_id=…; that id is what links the installation to this workspace.
  const installUrl = useAuthOptions().data?.githubAppInstallUrl ?? null;
  const installationId = Number(useSearchParams().get("installation_id")) || null;
  const { mutate: linkInstallation, isIdle: notLinkedYet } = install;
  useEffect(() => {
    if (!installationId || !notLinkedYet) return;
    linkInstallation(
      { account: account.trim() || "github", installationId },
      {
        onSuccess: (i) => {
          toast.success("GitHub App installed", { description: `Connected to ${i.account}` });
          onDone();
        },
        onError: (e) => toast.error("Installation failed", { description: e.message }),
      },
    );
  }, [installationId, notLinkedYet, linkInstallation, account, onDone]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GithubMark /> Install the ForgePilot GitHub App
        </CardTitle>
        <CardDescription>
          Here is exactly what ForgePilot will be able to do, before you go to GitHub.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ul className="flex flex-col gap-3">
          {scopes.map((s) => (
            <li key={s} className="flex gap-3">
              <ShieldCheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="text-sm">
                {SCOPE_COPY[s]}{" "}
                <code className="text-muted-foreground ml-1 font-mono text-xs">{s}</code>
              </span>
            </li>
          ))}
        </ul>
        <div className="bg-muted/50 flex gap-3 rounded-lg p-3 text-sm">
          <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground">
            ForgePilot <b className="text-foreground">cannot merge</b>, change branch protection or
            read secrets. You choose which repositories it can see, and you can revoke access from
            GitHub at any time.
          </span>
        </div>
        {installUrl ? (
          <Button className="self-start" asChild disabled={install.isPending}>
            <a href={installUrl}>
              <GithubMark /> {install.isPending ? "Linking installation…" : "Install GitHub App"}
            </a>
          </Button>
        ) : (
          <Button className="self-start" onClick={() => setOpen(true)}>
            <GithubMark /> Install GitHub App
          </Button>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install ForgePilot on GitHub</DialogTitle>
            <DialogDescription>
              Mock of GitHub&apos;s installation screen. In production this happens on github.com.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gh-account">Install on account or organization</Label>
              <Input id="gh-account" value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1 font-medium">Repository access</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="access"
                  defaultChecked
                  className="accent-[var(--primary)]"
                />{" "}
                Only select repositories (recommended)
              </label>
              <label className="text-muted-foreground flex items-center gap-2">
                <input type="radio" name="access" className="accent-[var(--primary)]" /> All
                repositories
              </label>
            </fieldset>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={account.trim().length < 2 || install.isPending}
              onClick={() =>
                install.mutate(
                  { account: account.trim() },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      toast.success("GitHub App installed", {
                        description: `Connected to ${account.trim()}`,
                      });
                      onDone();
                    },
                    onError: (e) => toast.error("Installation failed", { description: e.message }),
                  },
                )
              }
            >
              Install & authorize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------- 3. repositories
function ReposStep({ account, onDone }: { account: string; onDone: (ids: string[]) => void }) {
  const repos = useGithubRepositories(account, true);
  const projects = useProjects();
  const connect = useConnectRepositories();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [projectId, setProjectId] = useState<string>("__new");
  const [projectName, setProjectName] = useState("My first project");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose repositories</CardTitle>
        <CardDescription>
          Start with one you open pull requests on often. You can add more later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="divide-y rounded-lg border" aria-label="Repositories">
          {repos.isPending && (
            <li className="text-muted-foreground px-4 py-6 text-sm">
              Loading repositories from GitHub…
            </li>
          )}
          {(repos.data ?? []).map((r) => {
            const id = `r-${r.fullName.replace(/\W/g, "-")}`;
            return (
              <li key={r.fullName} className="flex items-center gap-3 px-4 py-3">
                <Checkbox
                  id={id}
                  disabled={r.alreadyConnected}
                  checked={r.alreadyConnected || selected.has(r.fullName)}
                  onCheckedChange={(v) => {
                    const s = new Set(selected);
                    if (v) s.add(r.fullName);
                    else s.delete(r.fullName);
                    setSelected(s);
                  }}
                />
                <Label
                  htmlFor={id}
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 font-normal"
                >
                  <span className="font-mono text-sm">{r.fullName}</span>
                  <span className="text-muted-foreground text-xs" suppressHydrationWarning>
                    {r.language} · {r.defaultBranch} · pushed {formatRelative(r.pushedAt)}
                  </span>
                </Label>
                {r.alreadyConnected ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  r.private && (
                    <LockIcon className="text-muted-foreground size-3.5" aria-label="Private" />
                  )
                )}
              </li>
            );
          })}
        </ul>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj">Add to project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="proj">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new">New project…</SelectItem>
                {(projects.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {projectId === "__new" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-name">Project name</Label>
              <Input
                id="proj-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          )}
        </div>
        <Button
          className="self-end"
          disabled={!selected.size || connect.isPending}
          onClick={() =>
            connect.mutate(
              {
                repositories: [...selected],
                projectId: projectId === "__new" ? null : projectId,
                newProjectName: projectId === "__new" ? projectName : null,
              },
              {
                onSuccess: (r) => onDone(r.repositoryIds),
                onError: (e) => toast.error("Could not connect", { description: e.message }),
              },
            )
          }
        >
          Connect {selected.size || ""} {selected.size === 1 ? "repository" : "repositories"}{" "}
          <ArrowRightIcon />
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- 4. discovery
function DiscoveryStep({ repoIds, onDone }: { repoIds: string[]; onDone: () => void }) {
  const all = useRepositories();
  const config = useRepoConfig();
  const repos = useMemo(
    () => (all.data ?? []).filter((r) => repoIds.includes(r.id)),
    [all.data, repoIds],
  );
  const ready = repos.length > 0 && repos.every((r) => r.indexStatus === "ready");
  const [commands, setCommands] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState<Record<string, "daily" | "weekly" | "on_push" | "off">>(
    {},
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Here&apos;s what ForgePilot found</CardTitle>
        <CardDescription>
          Repository intelligence reads manifests, test commands, CI and docs from an exact commit.
          Confirm or edit before the first run.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {repos.map((r) => (
          <section
            key={r.id}
            className="flex flex-col gap-3 rounded-lg border p-4"
            aria-label={r.fullName}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-medium">{r.fullName}</span>
              {r.indexStatus === "ready" ? (
                <Badge variant="success">
                  <CheckIcon /> Indexed at <CommitSha sha={r.indexedSha} />
                </Badge>
              ) : (
                <Badge variant="accent">
                  <Loader2Icon className="animate-spin" /> Indexing…
                </Badge>
              )}
            </div>
            {r.indexStatus !== "ready" ? (
              <Progress value={45} aria-label={`Indexing ${r.fullName}`} />
            ) : (
              <>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
                  {[
                    ["Languages", r.languages.join(", ")],
                    ["Frameworks", r.frameworks.join(", ")],
                    [
                      "Package ecosystems",
                      r.ecosystems.map((e) => (e === "npm" ? "npm" : "PyPI")).join(", "),
                    ],
                    ["CI workflows", r.ciWorkflows.join(", ") || "None found"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted-foreground text-xs">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`cmd-${r.id}`}>Test commands (comma-separated)</Label>
                    <Input
                      id={`cmd-${r.id}`}
                      className="font-mono text-xs"
                      value={commands[r.id] ?? r.testCommands.join(", ")}
                      onChange={(e) => setCommands({ ...commands, [r.id]: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`sch-${r.id}`}>Maintenance scans</Label>
                    <Select
                      value={schedule[r.id] ?? r.scanSchedule}
                      onValueChange={(v) => setSchedule({ ...schedule, [r.id]: v as "daily" })}
                    >
                      <SelectTrigger id={`sch-${r.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="on_push">On every push</SelectItem>
                        <SelectItem value="off">Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </section>
        ))}
        <Button
          className="self-end"
          disabled={!ready || config.isPending}
          onClick={async () => {
            try {
              for (const r of repos) {
                const cmds = (commands[r.id] ?? r.testCommands.join(", "))
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                await config.mutateAsync({
                  id: r.id,
                  testCommands: cmds.length ? cmds : r.testCommands,
                  scanSchedule: schedule[r.id] ?? r.scanSchedule,
                });
              }
              onDone();
            } catch (e) {
              toast.error("Could not save configuration", { description: (e as Error).message });
            }
          }}
        >
          {ready ? "Confirm configuration" : "Waiting for indexing…"} <ArrowRightIcon />
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- 5. first run
function FirstRunStep({
  repoIds,
  elapsed,
  onFinish,
}: {
  repoIds: string[];
  elapsed: number;
  onFinish: () => void;
}) {
  const first = useFirstRun();
  const [result, setResult] = useState<{ kind: "test" | "scan"; id: string; href: string } | null>(
    null,
  );
  const repoId = repoIds[0];
  const run = useTestRun(result?.kind === "test" ? result.id : "");
  const repo = useRepository(result?.kind === "scan" ? repoId : "");
  const done =
    result?.kind === "test"
      ? run.data && !["running", "queued"].includes(run.data.run.status)
      : result?.kind === "scan"
        ? repo.data && !repo.data.repository.scanRunning
        : false;
  const start = (kind: "test" | "scan") =>
    first.mutate(
      { repositoryId: repoId, kind },
      {
        onSuccess: setResult,
        onError: (e) => toast.error("Could not start", { description: e.message }),
      },
    );

  if (!result)
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            kind: "test" as const,
            icon: RadarIcon,
            title: "Run a ShipSafe verification",
            text: "Runs the confirmed test suites on the default branch in an isolated worker, with evidence.",
          },
          {
            kind: "scan" as const,
            icon: HeartPulseIcon,
            title: "Run a CodeKeeper health scan",
            text: "Inventories dependencies, matches advisories and computes an explainable health score.",
          },
        ].map((o) => (
          <Card key={o.kind}>
            <CardHeader>
              <o.icon className="text-primary size-5" aria-hidden />
              <CardTitle className="mt-2">{o.title}</CardTitle>
              <CardDescription>{o.text}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => start(o.kind)} disabled={first.isPending || !repoId}>
                {o.kind === "test" ? "Run verification" : "Run health scan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );

  return (
    <Card data-testid="first-result">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {done ? (
            <CheckCircle2Icon className="text-success size-5" aria-hidden />
          ) : (
            <Loader2Icon className="text-primary size-5 animate-spin" aria-hidden />
          )}
          {done
            ? "Your first result is ready"
            : result.kind === "test"
              ? "Running verification…"
              : "Scanning repository…"}
        </CardTitle>
        <CardDescription>
          {done
            ? `Time to first value: ${formatDuration(elapsed)}.`
            : "This takes a few seconds in the demo."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!done && <Progress value={60} aria-label="Progress" />}
        {done && result.kind === "test" && run.data && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <RunStatusBadge status={run.data.run.status} />
            <span>
              {run.data.run.totals.passed} passed · {run.data.run.totals.failed} failed on{" "}
              <CommitSha sha={run.data.run.headSha} />
            </span>
          </div>
        )}
        {done && result.kind === "scan" && repo.data && (
          <div className="flex items-center gap-4">
            <HealthScore score={repo.data.repository.health.score} size={64} showLabel />
            <span className="text-muted-foreground text-sm">
              {repo.data.findings.length} findings · open the repository to see the breakdown.
            </span>
          </div>
        )}
        {done && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Recommended next steps</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                href={result.href}
                className="hover:bg-accent flex flex-col gap-1 rounded-lg border p-3 text-sm"
              >
                <span className="font-medium">See the evidence</span>
                <span className="text-muted-foreground text-xs">
                  Logs, results and the commit pin
                </span>
              </Link>
              <Link
                href="/app/devpilot/tasks?new=1"
                className="hover:bg-accent flex flex-col gap-1 rounded-lg border p-3 text-sm"
              >
                <span className="inline-flex items-center gap-1 font-medium">
                  <BotIcon className="size-3.5" aria-hidden /> Delegate a task
                </span>
                <span className="text-muted-foreground text-xs">
                  Let an agent open a verified PR
                </span>
              </Link>
              <Link
                href="/app/settings?tab=members"
                className="hover:bg-accent flex flex-col gap-1 rounded-lg border p-3 text-sm"
              >
                <span className="inline-flex items-center gap-1 font-medium">
                  <GitBranchIcon className="size-3.5" aria-hidden /> Invite your team
                </span>
                <span className="text-muted-foreground text-xs">
                  Reviewers, approvers and admins
                </span>
              </Link>
            </div>
            <Button className="self-end" onClick={onFinish}>
              Go to dashboard <ArrowRightIcon />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
