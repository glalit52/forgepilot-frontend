import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/lib/mock/handlers";

export const metadata: Metadata = { title: "Docs", description: "Concepts, getting started and the API contract." };

export default function DocsPage() {
  const groups = new Map<string, typeof routes>();
  routes.forEach((r) => {
    const key = r.path.split("/")[1] || "root";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[200px_1fr]">
      <nav aria-label="Docs" className="text-sm md:sticky md:top-24 md:self-start">
        <ul className="flex flex-col gap-1">
          {[["#start", "Getting started"], ["#concepts", "Concepts"], ["#loop", "The closed loop"], ["#api", "API contract"]].map(([h, l]) => (
            <li key={h}>
              <a href={h} className="text-muted-foreground hover:text-foreground">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <article className="flex max-w-3xl flex-col gap-10">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">ForgePilot docs</h1>
          <p className="text-muted-foreground mt-3">Everything you need to connect a repository, delegate work to agents and verify it.</p>
        </header>
        <section id="start" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold">Getting started</h2>
          <ol className="text-muted-foreground mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href="/signup">
                Create an account
              </Link>{" "}
              with GitHub or email and create a workspace.
            </li>
            <li>Install the GitHub App on the repositories you choose. ForgePilot shows the exact permissions first.</li>
            <li>Confirm the test commands ForgePilot discovered and run your first verification or health scan.</li>
            <li>Delegate a task to Claude Code or Codex and watch the session live.</li>
          </ol>
        </section>
        <section id="concepts" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold">Concepts</h2>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            {[
              ["Workspace", "Your tenant boundary: members, roles, plan, budget and policies."],
              ["Project", "A group of repositories that ship together."],
              ["Task", "A unit of work with acceptance criteria, executed by an agent."],
              ["Session", "One agent execution in one isolated workspace."],
              ["Verification run", "A commit-pinned ShipSafe test run with evidence."],
              ["Bug", "A product defect found by ShipSafe, with reproduction steps."],
              ["Finding", "A CodeKeeper maintenance issue (advisory, outdated dependency, CI, tests, docs)."],
              ["Approval", "A human decision bound to one sensitive action and its context."],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="font-medium">{k}</dt>
                <dd className="text-muted-foreground mt-1">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section id="loop" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold">The closed loop</h2>
          <p className="text-muted-foreground mt-3 text-sm">
            Plan → Execute → Propose → Verify → Remediate → Review → Merge → Maintain. A failed check creates a linked bug and offers a fix task; the retest is a separate, comparable run. Fix attempts per bug are capped by policy, and passing checks never merge automatically.
          </p>
        </section>
        <section id="api" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold">API contract</h2>
          <p className="text-muted-foreground mt-3 text-sm">
            Generated from the same route table the demo runs on ({routes.length} endpoints). Full request/response schemas are in <code className="font-mono">docs/api-contract.md</code> in the repository.
          </p>
          <div className="mt-4 flex flex-col gap-6">
            {[...groups.entries()].map(([g, rs]) => (
              <div key={g}>
                <h3 className="font-mono text-sm font-semibold">/{g}</h3>
                <ul className="mt-2 divide-y rounded-lg border">
                  {rs.map((r) => (
                    <li key={r.method + r.path} className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-start sm:gap-3">
                      <span className={r.method === "GET" ? "text-info-foreground w-12 shrink-0 font-mono text-xs font-semibold" : "text-success-foreground w-12 shrink-0 font-mono text-xs font-semibold"}>{r.method}</span>
                      <code className="shrink-0 font-mono text-xs">{r.path}</code>
                      <span className="text-muted-foreground text-xs sm:ml-auto sm:max-w-sm sm:text-right">{r.summary}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
