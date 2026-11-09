"use client";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRoundIcon, Loader2Icon, PlugIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { ToneBadge } from "@/components/shared/status-badge";
import { useConnectIntegration, useDisconnectIntegration, useIntegrations } from "@/lib/api/hooks";
import { formatDate } from "@/lib/domain/format";
import { INTEGRATION_CATEGORY_LABEL, providerById } from "@/lib/domain/integrations";
import {
  ConnectIntegrationInputSchema,
  type IntegrationCategory,
  type IntegrationView,
} from "@/lib/schemas";
import { ReadOnlyNote } from "./portal-utils";

const CATEGORY_ORDER = Object.keys(INTEGRATION_CATEGORY_LABEL) as IntegrationCategory[];

function Monogram({ id, name }: { id: string; name: string }) {
  const m = providerById(id)?.monogram ?? name.slice(0, 2).toUpperCase();
  return (
    <span
      className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold"
      aria-hidden
    >
      {m}
    </span>
  );
}

function StatusLine({ it }: { it: IntegrationView }) {
  if (it.availability !== "available")
    return (
      <ToneBadge tone="neutral">
        {it.availability === "phase_2" ? "Phase 2" : "Phase 3"} · coming soon
      </ToneBadge>
    );
  const c = it.connection;
  if (c?.status === "connected")
    return (
      <span className="flex flex-wrap items-center gap-2">
        <ToneBadge tone="success">Connected</ToneBadge>
        <span className="text-muted-foreground text-xs">
          {c.account}
          {c.connectedAt ? ` · since ${formatDate(c.connectedAt)}` : ""}
        </span>
      </span>
    );
  if (c?.status === "error")
    return (
      <span className="flex flex-col gap-1">
        <ToneBadge tone="danger">Error</ToneBadge>
        <span className="text-danger-foreground text-xs">{c.error ?? "Connection error"}</span>
      </span>
    );
  return <ToneBadge tone="neutral">Not connected</ToneBadge>;
}

function ConnectDialog({ it, onClose }: { it: IntegrationView | null; onClose: () => void }) {
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const connect = useConnectIntegration();
  const id = it?.providerId ?? null;
  if (id !== prevId) {
    setPrevId(id);
    setAccount(it?.connection?.account ?? "");
    setError(null);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!it) return;
    const parsed = ConnectIntegrationInputSchema.safeParse({ account });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter an account");
      return;
    }
    connect.mutate(
      { providerId: it.providerId, account: parsed.data.account },
      {
        onSuccess: () => {
          toast.success(`${it.name} connected`, {
            description: `Authorized for ${parsed.data.account} (mock OAuth).`,
          });
          onClose();
        },
        onError: (err) => toast.error(`Could not connect ${it.name}`, { description: err.message }),
      },
    );
  };

  return (
    <Dialog open={!!it} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {it && (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Authorize ForgePilot on {it.name}</DialogTitle>
              <DialogDescription>
                Mock OAuth for the demo — no real {it.name} account is contacted. In production you
                are sent to {it.name} to approve.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <span className="text-sm font-medium">ForgePilot will be able to:</span>
              <p className="text-muted-foreground text-sm">{it.description}</p>
              {it.scopes.length ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Scopes being granted">
                  {it.scopes.map((s) => (
                    <li
                      key={s}
                      className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs"
                    >
                      <KeyRoundIcon className="size-3" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground text-xs">No scopes needed.</span>
              )}
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <ShieldCheckIcon className="size-3" aria-hidden /> ForgePilot never merges or pushes
                to protected branches.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="int-account">Account, organization or workspace</Label>
              <Input
                id="int-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g. acme-bank"
                aria-invalid={!!error}
                aria-describedby={error ? "int-account-err" : undefined}
                autoFocus
              />
              {error && (
                <p id="int-account-err" className="text-danger-foreground text-xs" role="alert">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={connect.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={connect.isPending}>
                {connect.isPending && <Loader2Icon className="animate-spin" aria-hidden />}
                Authorize
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DisconnectDialog({ it, onClose }: { it: IntegrationView | null; onClose: () => void }) {
  const disconnect = useDisconnectIntegration();
  return (
    <Dialog open={!!it} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {it && (
          <>
            <DialogHeader>
              <DialogTitle>Disconnect {it.name}?</DialogTitle>
              <DialogDescription>
                ForgePilot loses access granted by {it.connection?.account ?? "this account"}. Work
                that depends on it pauses until you reconnect.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={disconnect.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={disconnect.isPending}
                onClick={() =>
                  disconnect.mutate(it.providerId, {
                    onSuccess: () => {
                      toast.success(`${it.name} disconnected`);
                      onClose();
                    },
                    onError: (err) =>
                      toast.error(`Could not disconnect ${it.name}`, { description: err.message }),
                  })
                }
              >
                {disconnect.isPending && <Loader2Icon className="animate-spin" aria-hidden />}
                Disconnect
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntegrationCard({
  it,
  canManage,
  onConnect,
  onDisconnect,
}: {
  it: IntegrationView;
  canManage: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const available = it.availability === "available";
  const status = it.connection?.status;
  return (
    <Card className="flex flex-col gap-3 p-4" aria-label={it.name}>
      <div className="flex items-start gap-3">
        <Monogram id={it.providerId} name={it.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{it.name}</span>
          <span className="text-muted-foreground text-xs">{it.description}</span>
        </div>
      </div>
      <StatusLine it={it} />
      {it.scopes.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Scopes:{" "}
          <span className="font-mono">
            {(it.connection?.scopes.length ? it.connection.scopes : it.scopes).join(", ")}
          </span>
        </p>
      )}
      {available && canManage && (
        <div className="mt-auto flex flex-wrap gap-2">
          {status === "connected" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onDisconnect}
              aria-label={`Disconnect ${it.name}`}
            >
              Disconnect
            </Button>
          ) : status === "error" ? (
            <>
              <Button size="sm" onClick={onConnect} aria-label={`Reconnect ${it.name}`}>
                Reconnect
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDisconnect}
                aria-label={`Disconnect ${it.name}`}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onConnect}
              aria-label={`Connect ${it.name}`}
            >
              <PlugIcon aria-hidden /> Connect
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function IntegrationsSettings({ canManage }: { canManage: boolean }) {
  const q = useIntegrations();
  const [connecting, setConnecting] = useState<IntegrationView | null>(null);
  const [disconnecting, setDisconnecting] = useState<IntegrationView | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {!canManage && (
        <ReadOnlyNote>
          Read-only — only client admins can connect or disconnect integrations.
        </ReadOnlyNote>
      )}
      <QueryState
        query={q}
        loading={<TableSkeleton rows={4} cols={3} />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={PlugIcon}
            title="No integrations available"
            description="Contact your ForgePilot delivery manager."
          />
        }
      >
        {(items) =>
          CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)).map((c) => (
            <section key={c} className="flex flex-col gap-2" aria-labelledby={`int-cat-${c}`}>
              <h3 id={`int-cat-${c}`} className="text-sm font-semibold">
                {INTEGRATION_CATEGORY_LABEL[c]}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items
                  .filter((i) => i.category === c)
                  .map((it) => (
                    <IntegrationCard
                      key={it.providerId}
                      it={it}
                      canManage={canManage}
                      onConnect={() => setConnecting(it)}
                      onDisconnect={() => setDisconnecting(it)}
                    />
                  ))}
              </div>
            </section>
          ))
        }
      </QueryState>
      <ConnectDialog it={connecting} onClose={() => setConnecting(null)} />
      <DisconnectDialog it={disconnecting} onClose={() => setDisconnecting(null)} />
    </div>
  );
}
