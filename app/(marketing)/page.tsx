import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleDashedIcon,
  EyeIcon,
  FileSearchIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  HeartPulseIcon,
  KeyRoundIcon,
  Layers3Icon,
  LockIcon,
  PlugIcon,
  RadarIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTEGRATION_PROVIDERS } from "@/lib/domain/integrations";
import { PLANS } from "@/lib/domain/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ForgePilot — Build smarter. Ship safer. Stay maintained.",
  description: "Coordinate AI coding agents, verify every pull request and keep repositories healthy — in one workspace.",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-primary text-sm font-semibold tracking-wide">{children}</p>;
}

/** Static, illustrative product preview (no data fetching). */
function ProductPreview() {
  const row = (title: string, repo: string, state: "running" | "passed" | "failed" | "review", agent: string) => (
    <div className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          state === "running" && "bg-primary animate-pulse",
          state === "passed" && "bg-success",
          state === "failed" && "bg-danger",
          state === "review" && "bg-success",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
      <span className="text-muted-foreground hidden truncate font-mono text-[11px] sm:inline">{repo}</span>
      <span className="bg-accent text-accent-foreground hidden items-center gap-1 rounded px-1.5 py-0.5 text-[11px] md:inline-flex">
        <BotIcon className="size-3" aria-hidden /> {agent}
      </span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[11px] font-medium",
          state === "running" && "bg-accent text-accent-foreground",
          state === "passed" && "bg-success-soft text-success-foreground",
          state === "failed" && "bg-danger-soft text-danger-foreground",
          state === "review" && "bg-success-soft text-success-foreground",
        )}
      >
        {state === "running" ? "Agent running" : state === "passed" ? "Verified" : state === "failed" ? "1 defect" : "Ready for review"}
      </span>
    </div>
  );
  return (
    <div className="bg-card relative overflow-hidden rounded-xl border shadow-2xl shadow-black/10" role="img" aria-label="Illustration of the ForgePilot workspace showing agent tasks, verification results and repository health">
      <div className="bg-muted/60 flex items-center gap-1.5 border-b px-3 py-2" aria-hidden>
        <span className="bg-danger/70 size-2.5 rounded-full" />
        <span className="bg-warning/70 size-2.5 rounded-full" />
        <span className="bg-success/70 size-2.5 rounded-full" />
        <span className="text-muted-foreground mx-auto font-mono text-[11px]">app.forgepilot.example/app</span>
      </div>
      <div className="grid md:grid-cols-[180px_1fr]" aria-hidden>
        <div className="bg-sidebar hidden flex-col gap-3 border-r p-3 text-[12px] md:flex">
          <span className="font-semibold">Lumen Labs</span>
          {[["Overview", true], ["DevPilot", false], ["ShipSafe", false], ["CodeKeeper", false], ["Pull requests", false], ["Approvals", false]].map(([l, a]) => (
            <span key={l as string} className={cn("rounded px-2 py-1", a ? "bg-sidebar-accent font-medium" : "text-muted-foreground")}>
              {l}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Verified tasks", "38", "this month"], ["Pass rate", "94%", "7 days"], ["Avg health", "81", "+4 pts"], ["Spend", "$312", "of $400"]].map(([k, v, s]) => (
              <div key={k} className="rounded-lg border p-2.5">
                <div className="text-muted-foreground text-[11px]">{k}</div>
                <div className="text-lg font-semibold tabular-nums">{v}</div>
                <div className="text-muted-foreground text-[10px]">{s}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border">
            {row("Idempotency keys for POST /refunds", "lumen/payments-api", "running", "Claude Code")}
            {row("Add saved filters to transactions", "lumen/web-app", "review", "Claude Code")}
            {row("Redesign billing settings page", "lumen/web-app", "failed", "Priya (human)")}
            {row("Upgrade cryptography to 45.x", "lumen/ledger-worker", "passed", "Codex")}
          </div>
          <div className="rounded-lg border bg-[oklch(0.16_0.01_286)] p-3 font-mono text-[11px] leading-5 text-[oklch(0.9_0.005_286)]">
            <div><span className="text-[oklch(0.7_0.12_250)]">TOOL</span> edit app/api/refunds.py (+18 −6)</div>
            <div><span className="text-[oklch(0.7_0.12_250)]">TOOL</span> run pytest tests/api</div>
            <div><span className="text-[oklch(0.75_0.14_150)]"> OK </span> 64 passed · handing off to ShipSafe</div>
          </div>
        </div>
      </div>
      <span className="bg-background/90 absolute right-3 bottom-3 rounded border px-2 py-0.5 text-[10px]">Illustration · demo data</span>
    </div>
  );
}

const MODULES = [
  {
    id: "devpilot",
    icon: BotIcon,
    name: "DevPilot",
    tag: "Coordinate agents",
    lead: "Delegate engineering tasks to Claude Code or Codex. Each run gets its own isolated workspace, a budget and a timeout.",
    points: ["Tasks with explicit acceptance criteria", "Live, secret-redacted session logs", "Pause for approval on protected actions", "Branch and PR created only when authorised"],
    color: "var(--chart-1)",
  },
  {
    id: "shipsafe",
    icon: RadarIcon,
    name: "ShipSafe",
    tag: "Verify every change",
    lead: "Every pull request, from agents or humans, gets commit-pinned Playwright and API checks with reproducible evidence.",
    points: ["Change-aware test selection with reasons", "Screenshots, traces, console and network logs", "Infra and flaky failures never blamed on your code", "GitHub Check Runs with a clear conclusion"],
    color: "var(--chart-2)",
  },
  {
    id: "codekeeper",
    icon: HeartPulseIcon,
    name: "CodeKeeper",
    tag: "Stay maintained",
    lead: "Continuous dependency, advisory, CI and test-health scanning that turns findings into controlled, verified maintenance PRs.",
    points: ["Explainable, versioned health score", "Advisories with source references", "Deduplicated findings and suppressions with expiry", "Maintenance PRs verified before review"],
    color: "var(--chart-5)",
  },
];

const LOOP = [
  { icon: SparklesIcon, label: "Plan", text: "A task with acceptance criteria" },
  { icon: BotIcon, label: "Execute", text: "Agent in an isolated workspace" },
  { icon: GitPullRequestIcon, label: "Propose", text: "A reviewable pull request" },
  { icon: RadarIcon, label: "Verify", text: "ShipSafe runs targeted checks" },
  { icon: WrenchIcon, label: "Remediate", text: "Failures become linked fix tasks" },
  { icon: EyeIcon, label: "Review", text: "A human decides with evidence" },
  { icon: GitMergeIcon, label: "Merge", text: "In GitHub, under your rules" },
  { icon: HeartPulseIcon, label: "Maintain", text: "CodeKeeper keeps it healthy" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pt-20 pb-16 text-center md:pt-28">
          <Link href="/pricing" className="bg-card hover:bg-accent inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">NEW</span>
            Team plan: approvals, policies and shared budgets <ArrowRightIcon className="size-3" aria-hidden />
          </Link>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            AI writes the code.
            <br />
            <span className="text-primary">ForgePilot makes it shippable.</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg text-balance">
            Coordinate coding agents, verify every pull request and keep repositories healthy, all in one workspace connected to the tools you already use.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start free with GitHub <ArrowRightIcon />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Explore the live demo</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">Free plan · no credit card · installs on the repositories you choose</p>
          <div className="mt-6 w-full max-w-5xl text-left">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            { icon: Layers3Icon, t: "Agents write more code than you can review", d: "Parallel sessions, unclear progress and PRs nobody fully understands." },
            { icon: FileSearchIcon, t: "“It passed CI” isn't evidence", d: "Flaky tests, environment noise and missing coverage hide real regressions." },
            { icon: WrenchIcon, t: "Maintenance never makes the sprint", d: "Advisories and outdated dependencies pile up until they become incidents." },
          ].map((p) => (
            <div key={p.t} className="flex flex-col gap-2">
              <p.icon className="text-primary size-5" aria-hidden />
              <h2 className="font-semibold">{p.t}</h2>
              <p className="text-muted-foreground text-sm">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Three products, one context</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Start with one module. Grow into the platform.</h2>
          <p className="text-muted-foreground mt-3">All three share repository intelligence, policies, approvals and an audit trail, so nothing is copied between tools.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {MODULES.map((m) => (
            <article key={m.id} id={m.id} className="bg-card flex scroll-mt-24 flex-col gap-4 rounded-xl border p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg text-white" style={{ background: m.color }} aria-hidden>
                  <m.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-muted-foreground text-xs">{m.tag}</p>
                </div>
              </div>
              <p className="text-sm">{m.lead}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {m.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Closed loop */}
      <section id="loop" className="bg-muted/40 scroll-mt-16 border-y">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>The closed loop</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">From task to verified, maintained code</h2>
            <p className="text-muted-foreground mt-3">When a check fails, ForgePilot files a linked defect, offers a fix task and retests the new commit. Retries are capped, so it never loops forever. A human always makes the merge decision.</p>
          </div>
          <ol className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {LOOP.map((s, i) => (
              <li key={s.label} className="bg-card relative flex flex-col gap-2 rounded-lg border p-4">
                <span className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                <span className="inline-flex items-center gap-2 font-semibold">
                  <s.icon className="text-primary size-4" aria-hidden />
                  {s.label}
                </span>
                <span className="text-muted-foreground text-sm">{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: CheckCircle2Icon, cls: "text-success", t: "Pass", d: "Evidence is published to the PR and reviewers are notified. Nothing merges automatically." },
              { icon: XCircleIcon, cls: "text-danger", t: "Fail", d: "A defect is filed with reproduction steps, screenshots and a trace, and a fix task is one click away." },
              { icon: CircleDashedIcon, cls: "text-warning", t: "Infra hiccup", d: "Classified as infrastructure, not your bug. Reruns are free and never count against the change." },
            ].map((o) => (
              <div key={o.t} className="bg-card flex gap-3 rounded-lg border p-4">
                <o.icon className={cn("mt-0.5 size-5 shrink-0", o.cls)} aria-hidden />
                <div>
                  <p className="font-medium">{o.t}</p>
                  <p className="text-muted-foreground text-sm">{o.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Control */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <Eyebrow>Human control by default</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Automate the routine. Gate what matters.</h2>
            <p className="text-muted-foreground mt-3">Agents pause and ask before they touch protected paths, secrets, migrations or the network. Approvals are tied to the exact action and context, and every step lands in the audit log.</p>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/security">
                How we keep execution safe <ArrowRightIcon />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: LockIcon, t: "Isolated workspaces", d: "One container per run, resource limits, network allowlists, ephemeral repo-scoped credentials." },
              { icon: KeyRoundIcon, t: "Least privilege", d: "Owner, admin, member and viewer roles; approvals name the role that can decide." },
              { icon: WalletIcon, t: "Budgets & hard caps", d: "Per-task budgets and timeouts, plus workspace spend caps with alerts." },
              { icon: ScaleIcon, t: "Honest analytics", d: "Cost per verified task, rework and PR acceptance, with no vanity metrics." },
            ].map((f) => (
              <div key={f.t} className="flex flex-col gap-2 rounded-lg border p-4">
                <f.icon className="text-primary size-5" aria-hidden />
                <p className="font-medium">{f.t}</p>
                <p className="text-muted-foreground text-sm">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="border-y">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <PlugIcon className="text-primary size-5" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">Integrates. Doesn&apos;t replace.</h2>
            <p className="text-muted-foreground max-w-xl text-sm">Keep your IDE, Git host, agents and CI. ForgePilot connects them and works through documented, supported interfaces.</p>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {INTEGRATION_PROVIDERS.map((p) => (
              <li key={p.id} className="bg-card flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm">
                <span className="bg-muted flex size-7 items-center justify-center rounded-full text-[10px] font-semibold" aria-hidden>
                  {p.monogram}
                </span>
                {p.name}
                {p.availability !== "available" && <span className="text-muted-foreground text-xs">· {p.availability === "coming_soon" ? "soon" : p.availability}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-col items-center gap-2 text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-tight">Pay for the workspace. Meter the heavy lifting.</h2>
          <p className="text-muted-foreground max-w-xl">Plans include quotas for agent runtime and browser minutes. Overage is metered transparently, with a hard spend cap if you want one.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.filter((p) => ["developer", "pro", "team", "business"].includes(p.id)).map((p) => (
            <div key={p.id} className={cn("bg-card flex flex-col gap-3 rounded-xl border p-5", p.highlighted && "border-primary ring-primary/20 ring-4")}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {p.highlighted && <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">Most popular</span>}
              </div>
              <p className="text-3xl font-semibold tabular-nums">
                ${p.priceMonthlyUsd}
                <span className="text-muted-foreground text-sm font-normal">/mo</span>
              </p>
              <p className="text-muted-foreground text-sm">{p.tagline}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/pricing">
              Compare plans <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="bg-primary text-primary-foreground mx-auto flex max-w-6xl flex-col items-center gap-4 rounded-2xl px-6 py-14 text-center">
          <ShieldCheckIcon className="size-8" aria-hidden />
          <h2 className="text-3xl font-semibold tracking-tight">Your first verified PR in under 15 minutes</h2>
          <p className="max-w-xl opacity-90">Install the GitHub App on one repository, confirm the test command ForgePilot discovers, and open a pull request.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">Start free</Link>
            </Button>
            <Button size="lg" variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground" asChild>
              <Link href="/login">See the demo workspace</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
