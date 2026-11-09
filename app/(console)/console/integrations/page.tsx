"use client";
import Link from "next/link";
import { BotIcon, Building2Icon, ShieldIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { ToneBadge } from "@/components/shared/status-badge";
import { IntegrationStatusIcon, Monogram } from "@/components/console/integration-status";
import { useClient, useClients, useOps, useSession } from "@/lib/api/hooks";
import type { ClientSummary } from "@/lib/schemas";
import {
  AGENT_RUNTIMES,
  INTEGRATION_CATEGORY_LABEL,
  INTEGRATION_PROVIDERS,
} from "@/lib/domain/integrations";
import { formatPct, formatUsd } from "@/lib/domain/format";

const AVAILABLE = INTEGRATION_PROVIDERS.filter((p) => p.availability === "available");
const LATER = INTEGRATION_PROVIDERS.filter((p) => p.availability !== "available");

/** Manager-only numbers; rendered only for fp_manager so engineers never call /ops. */
function RuntimeStats({ agent }: { agent: string }) {
  const ops = useOps();
  if (ops.isPending) return <Skeleton className="h-10" />;
  if (ops.error || !ops.data)
    return <p className="text-muted-foreground text-xs">Stats unavailable.</p>;
  const s = ops.data.costByAgent.find((c) => c.agent === agent);
  if (!s || s.runs === 0) return <p className="text-muted-foreground text-xs">No runs yet.</p>;
  return (
    <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
      <div>
        <dt className="text-muted-foreground">Runs</dt>
        <dd className="text-sm font-semibold tabular-nums">{s.runs}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Success</dt>
        <dd className="text-sm font-semibold tabular-nums">{formatPct(s.successPct)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Total cost</dt>
        <dd className="text-sm font-semibold tabular-nums">{formatUsd(s.costUsd)}</dd>
      </div>
    </dl>
  );
}

function ClientRow({ client }: { client: ClientSummary }) {
  const q = useClient(client.id);
  return (
    <TableRow>
      <TableHead scope="row" className="bg-card sticky left-0 z-10 font-medium">
        <Link href={`/console/clients/${client.id}`} className="hover:underline">
          {client.name}
        </Link>
      </TableHead>
      {AVAILABLE.map((p) => (
        <TableCell key={p.id} className="text-center">
          {q.isPending ? (
            <Skeleton className="mx-auto size-4 rounded-full" />
          ) : q.error ? (
            <span className="text-muted-foreground text-xs" title="Couldn't load">
              ?
            </span>
          ) : (
            <IntegrationStatusIcon
              providerName={p.name}
              connection={q.data?.integrations.find((i) => i.providerId === p.id) ?? null}
            />
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

/** Agent runtimes ForgePilot operates + read-only view of every client's integrations. */
export default function IntegrationsPage() {
  const session = useSession();
  const isManager = session.data?.user.role === "fp_manager";
  const clients = useClients();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Agents & integrations"
        description="The coding agents we run in sandboxes, and which tools each client has connected. Clients manage their own connections in the portal."
        meta={<MockDataBadge />}
      />

      <Section
        title="Agent runtimes"
        description={
          isManager
            ? "Success rate and cost cover all completed runs."
            : "Run cost and success rates are visible to delivery managers."
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {AGENT_RUNTIMES.map((rt) => (
            <Card key={rt.id} className={rt.status === "active" ? "" : "opacity-80"}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <span
                      className="bg-accent text-accent-foreground inline-flex size-8 items-center justify-center rounded-md"
                      aria-hidden
                    >
                      <BotIcon className="size-4" />
                    </span>
                    {rt.name}
                  </CardTitle>
                  {rt.status === "active" ? (
                    <ToneBadge tone="success">Active</ToneBadge>
                  ) : (
                    <ToneBadge tone="neutral">Phase 2</ToneBadge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Models</span>
                  <div className="flex flex-wrap gap-1">
                    {rt.models.map((m) => (
                      <Badge key={m} variant="outline" className="font-mono">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-sm">
                  <ShieldIcon
                    className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    <span className="sr-only">Sandbox policy: </span>
                    {rt.sandbox}
                  </span>
                </p>
                {isManager && rt.status === "active" && <RuntimeStats agent={rt.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Client integrations"
        description="Read-only. Hover or focus a status for the connected account."
      >
        {clients.isPending ? (
          <TableSkeleton rows={3} cols={8} />
        ) : clients.error ? (
          <ErrorState error={clients.error} onRetry={() => clients.refetch()} />
        ) : clients.data.length === 0 ? (
          <EmptyState
            icon={Building2Icon}
            title="No clients yet"
            description="Client integrations appear after onboarding."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <caption className="sr-only">Integration status per client</caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="bg-card sticky left-0 z-10 min-w-40">Client</TableHead>
                    {AVAILABLE.map((p) => (
                      <TableHead
                        key={p.id}
                        className="min-w-16 py-2 text-center"
                        title={`${p.name} · ${INTEGRATION_CATEGORY_LABEL[p.category]}`}
                      >
                        <span className="flex flex-col items-center gap-1">
                          <Monogram text={p.monogram} className="size-7" />
                          <span className="text-[10px] leading-tight font-normal whitespace-normal">
                            {p.name}
                          </span>
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.data.map((c) => (
                    <ClientRow key={c.id} client={c} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>
                  <IntegrationStatusIcon
                    providerName="Legend"
                    connection={{
                      id: "l",
                      orgId: "",
                      providerId: "",
                      status: "connected",
                      account: "",
                      connectedAt: null,
                      scopes: [],
                    }}
                  />
                </span>
                Connected
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>
                  <IntegrationStatusIcon
                    providerName="Legend"
                    connection={{
                      id: "l",
                      orgId: "",
                      providerId: "",
                      status: "error",
                      account: "",
                      connectedAt: null,
                      scopes: [],
                    }}
                  />
                </span>
                Error
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>
                  <IntegrationStatusIcon providerName="Legend" connection={null} />
                </span>
                Not connected
              </span>
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Coming later"
        description="Not yet connectable; shown so engineers know what's planned."
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {LATER.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <Monogram text={p.monogram} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {INTEGRATION_CATEGORY_LABEL[p.category]}
                </p>
              </div>
              <Badge variant="neutral">
                {p.availability === "phase_2" ? "Phase 2" : "Phase 3"}
              </Badge>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
