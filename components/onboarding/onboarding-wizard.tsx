"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  GitBranchIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
import { useGitRepos, useOnboardingStatus, useSubmitOnboarding } from "@/lib/api/hooks";
import {
  OnboardingInputSchema,
  type Criticality,
  type GitProvider,
  type GitRepoCandidate,
  type OnboardingInput,
  type Tier,
} from "@/lib/schemas";
import { CRITICALITY_LABEL, LANGUAGE_LABEL, TIER_LABEL } from "@/lib/domain/labels";
import { INTEGRATION_PROVIDERS } from "@/lib/domain/integrations";
import { formatRelative, formatUsd } from "@/lib/domain/format";
import { HealthPill, HealthScore } from "@/components/shared/health-score";
import { SeverityBadge } from "@/components/shared/misc";
import { ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";

const STEPS = [
  "Company & contacts",
  "Connect Git",
  "Select repositories",
  "Map to applications",
  "Confirm SLA tier",
  "Health scan",
] as const;

const TIERS: { tier: Tier; price: number; blurb: string; includes: string[] }[] = [
  {
    tier: "maintain",
    price: 9000,
    blurb: "Keep applications patched and current.",
    includes: [
      "CVE patches within 72h",
      "Dependency & runtime upgrades",
      "Bug fixes",
      "Monthly savings report",
    ],
  },
  {
    tier: "maintain_assure",
    price: 12000,
    blurb: "Maintain plus verification of every change.",
    includes: [
      "Everything in Maintain",
      "Regression suite generation & upkeep",
      "Verification gate on your own PRs",
      "Evidence packs for audit",
    ],
  },
  {
    tier: "full_run",
    price: 18000,
    blurb: "Phase 3: production run and incident response.",
    includes: [
      "Everything in Maintain + Assure",
      "Alert intake & root-cause",
      "Remediation proposals",
    ],
  },
];

type Company = OnboardingInput["company"];
type Mapping = OnboardingInput["mapping"][number];

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-err`} className="text-danger-foreground text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2 md:grid-cols-6" aria-label="Onboarding progress">
      {STEPS.map((label, i) => (
        <li
          key={label}
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
            <span className="tabular-nums">{i + 1}.</span> {label}
            {i < step && <span className="sr-only"> (done)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Repo name → a friendly application name guess, e.g. core-banking-api → Core Banking. */
function guessAppName(fullName: string) {
  const base = fullName.split("/").pop() ?? fullName;
  return base
    .replace(/-(api|web|service|worker|bff)$/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<Company>({
    name: "",
    industry: "",
    region: "",
    contactName: "",
    contactEmail: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<GitProvider | null>(null);
  const [account, setAccount] = useState("");
  const [connected, setConnected] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [oauthAccount, setOauthAccount] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mapping, setMapping] = useState<Record<string, Mapping>>({});
  const [tier, setTier] = useState<Tier>("maintain_assure");
  const [orgId, setOrgId] = useState<string | null>(null);

  const repos = useGitRepos(provider ?? "github", account, connected && !!provider);
  const submit = useSubmitOnboarding();
  const status = useOnboardingStatus(orgId);
  const selectedRepos = useMemo(
    () => (repos.data ?? []).filter((r) => selected.has(r.fullName)),
    [repos.data, selected],
  );
  const gitProviders = INTEGRATION_PROVIDERS.filter((p) => p.category === "source_control");

  const validateCompany = () => {
    const r = OnboardingInputSchema.shape.company.safeParse(company);
    if (r.success) return (setErrors({}), true);
    const e: Record<string, string> = {};
    r.error.issues.forEach((i) => (e[String(i.path[0])] ??= i.message));
    setErrors(e);
    return false;
  };

  const ensureMapping = (list: GitRepoCandidate[]) =>
    setMapping((m) => {
      const next: Record<string, Mapping> = {};
      list.forEach((r) => {
        next[r.fullName] = m[r.fullName] ?? {
          repoFullName: r.fullName,
          applicationName: guessAppName(r.fullName),
          criticality: "high",
        };
      });
      return next;
    });

  const next = () => {
    if (step === 0 && !validateCompany()) return;
    if (step === 1 && !connected) return setErrors({ git: "Connect a Git provider to continue" });
    if (step === 2) {
      if (!selected.size) return setErrors({ repos: "Select at least one repository" });
      ensureMapping(selectedRepos);
    }
    if (step === 3) {
      const bad = Object.values(mapping).find((m) => m.applicationName.trim().length < 2);
      if (bad) return setErrors({ [`map-${bad.repoFullName}`]: "Name the application" });
    }
    if (step === 4) {
      const input: OnboardingInput = {
        company,
        provider: provider!,
        account,
        repositories: selectedRepos,
        mapping: selectedRepos.map((r) => mapping[r.fullName]),
        tier,
      };
      const parsed = OnboardingInputSchema.safeParse(input);
      if (!parsed.success)
        return toast.error("Please check the earlier steps", {
          description: parsed.error.issues[0]?.message,
        });
      submit.mutate(parsed.data, {
        onSuccess: (res) => {
          setOrgId(res.organizationId);
          setStep(5);
        },
        onError: (e) => toast.error("Could not start onboarding", { description: e.message }),
      });
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  const inputProps = (k: keyof Company) => ({
    id: `ob-${k}`,
    value: company[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setCompany((c) => ({ ...c, [k]: e.target.value })),
    ...(errors[k] ? { "aria-invalid": true, "aria-describedby": `ob-${k}-err` } : {}),
  });

  return (
    <div className="flex flex-col gap-6">
      <Stepper step={step} />

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tell us about your company</CardTitle>
            <CardDescription>
              We use this to set up your workspace and send the health report.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="ob-name" label="Company name" error={errors.name}>
              <Input
                {...inputProps("name")}
                placeholder="Northwind Bank"
                autoComplete="organization"
              />
            </Field>
            <Field id="ob-industry" label="Industry" error={errors.industry}>
              <Select
                value={company.industry}
                onValueChange={(v) => setCompany((c) => ({ ...c, industry: v }))}
              >
                <SelectTrigger id="ob-industry" aria-invalid={!!errors.industry || undefined}>
                  <SelectValue placeholder="Choose an industry" />
                </SelectTrigger>
                <SelectContent>
                  {["Banking", "Insurance", "Fintech", "Healthcare", "Retail", "Other"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="ob-region" label="Region" error={errors.region}>
              <Select
                value={company.region}
                onValueChange={(v) => setCompany((c) => ({ ...c, region: v }))}
              >
                <SelectTrigger id="ob-region" aria-invalid={!!errors.region || undefined}>
                  <SelectValue placeholder="Choose a region" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["IN", "India"],
                    ["US", "United States"],
                    ["AE", "United Arab Emirates"],
                    ["GB", "United Kingdom"],
                    ["EU", "European Union"],
                    ["SG", "Singapore"],
                  ].map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="hidden sm:block" />
            <Field id="ob-contactName" label="Primary contact" error={errors.contactName}>
              <Input {...inputProps("contactName")} placeholder="Full name" autoComplete="name" />
            </Field>
            <Field id="ob-contactEmail" label="Contact email" error={errors.contactEmail}>
              <Input
                {...inputProps("contactEmail")}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Connect your Git provider</CardTitle>
            <CardDescription>
              Read access to repositories, and permission to open pull requests and post checks.
              Code stays in your repositories; ForgePilot never merges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              role="radiogroup"
              aria-label="Git provider"
            >
              {gitProviders.map((p) => {
                const active = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setProvider(p.id as GitProvider);
                      setConnected(false);
                      setSelected(new Set());
                    }}
                    className={cn(
                      "focus-visible:ring-ring/50 flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
                      active ? "border-primary bg-accent/50" : "hover:bg-accent/30",
                    )}
                  >
                    <span className="bg-muted flex size-9 items-center justify-center rounded-md text-xs font-semibold">
                      {p.monogram}
                    </span>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground text-xs">{p.description}</span>
                  </button>
                );
              })}
            </div>
            {provider && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
                {connected ? (
                  <>
                    <Badge variant="success">
                      <CheckIcon /> Connected
                    </Badge>
                    <span className="text-sm">
                      {gitProviders.find((p) => p.id === provider)?.name} ·{" "}
                      <span className="font-mono">{account}</span>
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setConnected(false)}>
                      Change account
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setOauthAccount(
                          company.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, ""),
                        );
                        setOauthOpen(true);
                      }}
                    >
                      <GitBranchIcon /> Connect {gitProviders.find((p) => p.id === provider)?.name}
                    </Button>
                    <span className="text-muted-foreground text-xs">
                      Opens a mock authorization screen.
                    </span>
                  </>
                )}
              </div>
            )}
            {errors.git && (
              <p className="text-danger-foreground text-sm" role="alert">
                {errors.git}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select repositories</CardTitle>
            <CardDescription>
              Pick the repositories ForgePilot should maintain. You can add more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {repos.error ? (
              <ErrorState error={repos.error} onRetry={() => repos.refetch()} />
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selected.size} of {repos.data?.length ?? 0} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelected(
                        selected.size === (repos.data?.length ?? 0)
                          ? new Set()
                          : new Set((repos.data ?? []).map((r) => r.fullName)),
                      )
                    }
                  >
                    {selected.size === (repos.data?.length ?? 0) ? "Clear all" : "Select all"}
                  </Button>
                </div>
                <ul className="divide-y rounded-lg border" aria-label="Repositories">
                  {(repos.data ?? []).map((r) => {
                    const id = `repo-${r.fullName.replace(/\W/g, "-")}`;
                    return (
                      <li key={r.fullName} className="flex items-center gap-3 px-4 py-3">
                        <Checkbox
                          id={id}
                          checked={selected.has(r.fullName)}
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
                          <span className="text-muted-foreground text-xs">
                            {LANGUAGE_LABEL[r.language]} · {r.defaultBranch} · pushed{" "}
                            {formatRelative(r.lastPushAt)}
                          </span>
                        </Label>
                        {r.private && (
                          <LockIcon
                            className="text-muted-foreground size-3.5"
                            aria-label="private"
                          />
                        )}
                      </li>
                    );
                  })}
                  {repos.isPending && (
                    <li className="text-muted-foreground px-4 py-6 text-sm">
                      Loading repositories…
                    </li>
                  )}
                </ul>
                {errors.repos && (
                  <p className="text-danger-foreground text-sm" role="alert">
                    {errors.repos}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Map repositories to applications</CardTitle>
            <CardDescription>
              Pricing and SLAs are per application. Give repositories the same application name to
              group them (e.g. a web app and its API).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selectedRepos.map((r) => {
              const m = mapping[r.fullName];
              if (!m) return null;
              const key = r.fullName.replace(/\W/g, "-");
              return (
                <div
                  key={r.fullName}
                  className="grid items-end gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_12rem]"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">Repository</span>
                    <span className="font-mono text-sm break-all">{r.fullName}</span>
                  </div>
                  <Field id={`map-${key}`} label="Application" error={errors[`map-${r.fullName}`]}>
                    <Input
                      id={`map-${key}`}
                      value={m.applicationName}
                      onChange={(e) =>
                        setMapping((s) => ({
                          ...s,
                          [r.fullName]: { ...m, applicationName: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field id={`crit-${key}`} label="Criticality">
                    <Select
                      value={m.criticality}
                      onValueChange={(v) =>
                        setMapping((s) => ({
                          ...s,
                          [r.fullName]: { ...m, criticality: v as Criticality },
                        }))
                      }
                    >
                      <SelectTrigger id={`crit-${key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CRITICALITY_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              );
            })}
            <p className="text-muted-foreground text-xs">
              {new Set(Object.values(mapping).map((m) => m.applicationName.trim())).size}{" "}
              application(s) from {selectedRepos.length} repositories.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="SLA tier">
            {TIERS.map((t) => {
              const apps = new Set(Object.values(mapping).map((m) => m.applicationName.trim()))
                .size;
              const disabled = t.tier === "full_run";
              return (
                <button
                  key={t.tier}
                  type="button"
                  role="radio"
                  aria-checked={tier === t.tier}
                  aria-label={`${TIER_LABEL[t.tier]}${disabled ? " (Phase 3, not available yet)" : ""}`}
                  aria-disabled={disabled}
                  onClick={() => !disabled && setTier(t.tier)}
                  className={cn(
                    "focus-visible:ring-ring/50 flex flex-col gap-3 rounded-lg border p-5 text-left focus-visible:ring-[3px] focus-visible:outline-none",
                    tier === t.tier ? "border-primary bg-accent/40" : "hover:bg-accent/20",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{TIER_LABEL[t.tier]}</span>
                    {disabled ? (
                      <Badge variant="neutral">Phase 3</Badge>
                    ) : (
                      tier === t.tier && <CheckIcon className="text-primary size-4" aria-hidden />
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm">{t.blurb}</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatUsd(t.price)}
                    <span className="text-muted-foreground text-xs font-normal">
                      {" "}
                      / application / month
                    </span>
                  </span>
                  <ul className="flex flex-col gap-1 text-sm">
                    {t.includes.map((i) => (
                      <li key={i} className="flex gap-2">
                        <CheckIcon className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
                        {i}
                      </li>
                    ))}
                  </ul>
                  {!disabled && (
                    <span className="text-muted-foreground border-t pt-2 text-xs">
                      {apps} application{apps === 1 ? "" : "s"} → {formatUsd(t.price * apps)} /
                      month (indicative)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Standard SLA targets</CardTitle>
              <CardDescription>
                Agreed in your contract; shown on your SLA report every month.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
              {[
                ["Critical CVE patched", "≤ 72 hours"],
                ["Verification (p90)", "≤ 15 minutes"],
                ["Approval turnaround", "≤ 48 hours (you)"],
                ["Tasks within SLA", "≥ 95%"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">{k}</div>
                  <div className="font-medium">{v}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 5 && <ScanStep status={status} />}

      {step < 5 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={back} disabled={step === 0}>
            <ArrowLeftIcon /> Back
          </Button>
          <Button onClick={next} disabled={submit.isPending}>
            {step === 4
              ? submit.isPending
                ? "Starting scan…"
                : "Confirm and start health scan"
              : "Next"}
            <ArrowRightIcon />
          </Button>
        </div>
      )}

      <Dialog open={oauthOpen} onOpenChange={setOauthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authorize ForgePilot</DialogTitle>
            <DialogDescription>
              Mock OAuth screen for {gitProviders.find((p) => p.id === provider)?.name}. In
              production this is the provider&apos;s own consent page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field id="oauth-account" label="Organization / account">
              <Input
                id="oauth-account"
                value={oauthAccount}
                onChange={(e) => setOauthAccount(e.target.value)}
              />
            </Field>
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">ForgePilot will be able to:</p>
              <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
                {(gitProviders.find((p) => p.id === provider)?.scopes ?? []).map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <ShieldCheckIcon className="text-success size-3.5" aria-hidden />
                    <code className="text-xs">{s}</code>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2 text-xs">
                ForgePilot cannot merge, change branch protection or read secrets.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOauthOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={oauthAccount.trim().length < 2}
              onClick={() => {
                setAccount(oauthAccount.trim());
                setConnected(true);
                setOauthOpen(false);
                setErrors({});
                toast.success("Git provider connected", { description: oauthAccount.trim() });
              }}
            >
              Authorize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScanStep({ status }: { status: ReturnType<typeof useOnboardingStatus> }) {
  if (status.error) return <ErrorState error={status.error} onRetry={() => status.refetch()} />;
  const s = status.data;
  if (!s || !s.done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="text-primary size-4 animate-pulse" aria-hidden /> Health scan
            running
          </CardTitle>
          <CardDescription>
            Scanning dependencies, security, build stability, tests and docs, and building your
            context graph. This takes a few seconds in the demo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Progress value={s?.progressPct ?? 5} aria-label="Scan progress" />
          <ul className="flex flex-col gap-2 text-sm" aria-live="polite">
            {(s?.scans ?? []).map((sc) => (
              <li key={sc.id} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{sc.repositoryName}</span>
                {sc.status === "completed" ? (
                  <Badge variant="success">
                    <CheckIcon /> Scanned
                  </Badge>
                ) : (
                  <Badge variant="accent">Scanning…</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }
  const avg = Math.round(
    s.applications.reduce((a, x) => a + x.healthScore, 0) / Math.max(1, s.applications.length),
  );
  return (
    <div className="flex flex-col gap-4" data-testid="health-report">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckIcon className="text-success size-4" aria-hidden /> Health report ready ·{" "}
            {s.organization.name}
          </CardTitle>
          <CardDescription>
            Your starting point. We re-scan weekly and you&apos;ll see the trend on your Overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-8">
          <HealthScore score={avg} size={88} showLabel />
          <ul className="flex flex-1 flex-col gap-2">
            {s.applications.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"
              >
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground text-xs">
                  {a.repoCount} repo{a.repoCount === 1 ? "" : "s"} ·{" "}
                  {CRITICALITY_LABEL[a.criticality]}
                </span>
                <HealthPill score={a.healthScore} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top findings</CardTitle>
            <CardDescription>Ranked backlog — the first tasks we&apos;ll propose.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {s.topFindings.map((f) => (
                <li key={f.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="text-sm font-medium">{f.title}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {f.repositoryName} · {f.recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your 90-day plan</CardTitle>
            <CardDescription>Proposed; we agree it with you on the kickoff call.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {s.plan90.map((w) => (
              <div key={w.window}>
                <div className="mb-1 text-sm font-semibold">{w.window}</div>
                <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
                  {w.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <CheckIcon className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/portal">Go to your portal</Link>
        </Button>
        <Button variant="outline" onClick={() => toast.info("PDF export is a stub in this demo")}>
          Download health report (PDF)
        </Button>
      </div>
    </div>
  );
}
