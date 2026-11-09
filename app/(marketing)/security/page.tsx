import type { Metadata } from "next";
import { CheckIcon, KeyRoundIcon, LockIcon, NetworkIcon, ScrollTextIcon, ServerIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { PERMISSIONS, ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/domain/permissions";
import type { Role } from "@/lib/schemas";

export const metadata: Metadata = { title: "Security", description: "How ForgePilot isolates execution, scopes credentials and keeps humans in control." };

const ROLES: Role[] = ["owner", "admin", "member", "viewer"];
const SHOWN: (keyof typeof PERMISSIONS)[] = ["task.launch", "test.run", "pr.review", "finding.suppress", "approval.decide", "integration.manage", "policy.manage", "billing.manage"];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <ShieldCheckIcon className="text-primary size-8" aria-hidden />
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Security & governance</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">ForgePilot runs untrusted code on your behalf, so isolation, least privilege and auditability are the core of the product rather than add-ons.</p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {[
          { icon: ServerIcon, t: "Isolated execution", d: "Every agent session and test run gets its own short-lived container with CPU, memory, disk and wall-clock limits. Customer code never runs in the control plane." },
          { icon: KeyRoundIcon, t: "Scoped, ephemeral credentials", d: "Installation-scoped GitHub tokens expire within the hour and only cover the selected repositories. No production secrets by default." },
          { icon: NetworkIcon, t: "Network allowlists", d: "Workspaces reach package registries and GitHub only. Anything else pauses the agent and requests approval." },
          { icon: LockIcon, t: "Approvals bound to context", d: "Protected paths, secrets, migrations and budget increases need the named role's approval for that exact action. Requesters can't approve themselves." },
          { icon: ScrollTextIcon, t: "Audit everything", d: "User, agent and system actions, approvals and integration changes are logged with actor and timestamp." },
          { icon: UsersIcon, t: "Tenant isolation", d: "Every record is scoped to a workspace, and cross-tenant access returns not found. Secrets live in a vault; the database stores references only." },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border p-5">
            <f.icon className="text-primary size-5" aria-hidden />
            <h2 className="mt-3 font-semibold">{f.t}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{f.d}</p>
          </div>
        ))}
      </div>
      <h2 id="permissions" className="mt-16 scroll-mt-20 text-2xl font-semibold">Roles & permissions</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Permissions by role</caption>
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-2.5 text-center font-medium" title={ROLE_DESCRIPTION[r]}>
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHOWN.map((p) => (
              <tr key={p} className="border-t">
                <th scope="row" className="px-4 py-2 text-left font-mono text-xs font-normal">
                  {p}
                </th>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    {(PERMISSIONS[p] as readonly string[]).includes(r) ? <CheckIcon className="text-success mx-auto size-4" aria-label="Allowed" /> : <span className="text-muted-foreground" aria-label="Not allowed">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 id="data" className="mt-16 scroll-mt-20 text-2xl font-semibold">Data handling</h2>
      <ul className="text-muted-foreground mt-4 flex list-disc flex-col gap-2 pl-5 text-sm">
        <li>Repository intelligence stores metadata (paths, symbols, test commands), not full source, tied to immutable commit SHAs.</li>
        <li>Retention for logs, artifacts and audit records is configurable per workspace.</li>
        <li>Secrets are redacted from agent logs before they are stored or displayed.</li>
        <li>Health scores summarise maintenance signals; they are not a security certification.</li>
      </ul>
      <p className="text-muted-foreground mt-10 text-xs">Demo build: controls are described as designed in the PRD and are simulated by the mock API.</p>
    </div>
  );
}
