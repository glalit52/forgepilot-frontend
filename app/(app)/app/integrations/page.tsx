"use client";
import { useMemo, useState } from "react";
import { KeyRoundIcon, PlugIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, Section } from "@/components/shared/page-header";
import { EmptyState, QueryState } from "@/components/shared/states";
import { MockDataBadge } from "@/components/shared/misc";
import {
  ConnectIntegrationDialog,
  DisconnectIntegrationDialog,
  IntegrationCard,
} from "@/components/settings/integrations";
import { PermissionNote } from "@/components/settings/common";
import { useIntegrations, useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { INTEGRATION_CATEGORY_LABEL } from "@/lib/domain/integrations";
import { IntegrationCategorySchema, type IntegrationView } from "@/lib/schemas";

function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading integrations">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((__, j) => (
              <Skeleton key={j} className="h-44" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IntegrationsPage() {
  const session = useSession();
  const query = useIntegrations();
  const [q, setQ] = useState("");
  const [connecting, setConnecting] = useState<IntegrationView | null>(null);
  const [disconnecting, setDisconnecting] = useState<IntegrationView | null>(null);
  const canManage = can(session.data?.role, "integration.manage");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!query.data) return [];
    if (!needle) return query.data;
    return query.data.filter((i) =>
      [i.name, i.description, INTEGRATION_CATEGORY_LABEL[i.category], ...i.scopes]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query.data, q]);

  const connected = query.data?.filter((i) => i.connection?.status === "connected").length ?? 0;
  const errored = query.data?.filter((i) => i.connection?.status === "error") ?? [];

  const cardProps = {
    canManage,
    onConnect: setConnecting,
    onDisconnect: setDisconnecting,
  };
  const agents = filtered.filter((i) => i.category === "agents");
  const others = IntegrationCategorySchema.options
    .filter((c) => c !== "agents")
    .map((c) => ({ category: c, items: filtered.filter((i) => i.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrations"
        description="Connect source control, coding agents, issue trackers and alerts. Every connection asks only for the scopes listed, and credentials live in the secrets vault — ForgePilot stores a reference, never the secret."
        meta={
          query.data && (
            <>
              <Badge variant="success">{connected} connected</Badge>
              {errored.length > 0 && (
                <Badge variant="danger">{errored.length} need attention</Badge>
              )}
              <MockDataBadge />
            </>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm" role="search">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search integrations, scopes or categories"
            aria-label="Search integrations"
            className="pl-8"
          />
        </div>
        {!canManage && session.data && (
          <PermissionNote className="sm:max-w-md">
            You&apos;re a {session.data.role}. Owners and admins connect and disconnect
            integrations.
          </PermissionNote>
        )}
      </div>

      <QueryState query={query} loading={<CatalogSkeleton />}>
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={PlugIcon}
              title={`No integrations match “${q}”`}
              description="Try a provider name like “Slack”, or a scope like “issues:read”."
            />
          ) : (
            <div className="flex flex-col gap-8">
              {agents.length > 0 && (
                <section
                  aria-labelledby="agents-heading"
                  className="bg-accent/30 border-primary/20 flex flex-col gap-3 rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2
                        id="agents-heading"
                        className="flex items-center gap-2 text-sm font-semibold"
                      >
                        <KeyRoundIcon className="size-4" aria-hidden />
                        {INTEGRATION_CATEGORY_LABEL.agents} · bring your own key
                      </h2>
                      <p className="text-muted-foreground max-w-2xl text-xs">
                        Agents run in isolated workspaces using your own provider keys. Model usage
                        is billed by the provider directly to you; ForgePilot meters runtime minutes
                        and shows the provider-reported cost next to every session.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                    {agents.map((i) => (
                      <IntegrationCard key={i.providerId} integration={i} {...cardProps} />
                    ))}
                  </div>
                </section>
              )}
              {others.map((g) => (
                <Section
                  key={g.category}
                  title={INTEGRATION_CATEGORY_LABEL[g.category]}
                  description={`${g.items.length} integration${g.items.length === 1 ? "" : "s"}`}
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((i) => (
                      <IntegrationCard key={i.providerId} integration={i} {...cardProps} />
                    ))}
                  </div>
                </Section>
              ))}
            </div>
          )
        }
      </QueryState>

      <ConnectIntegrationDialog
        integration={connecting}
        onOpenChange={(o) => !o && setConnecting(null)}
      />
      <DisconnectIntegrationDialog
        integration={disconnecting}
        onOpenChange={(o) => !o && setDisconnecting(null)}
      />
    </div>
  );
}
