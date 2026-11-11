"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  KeyRoundIcon,
  RotateCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UnplugIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Monogram } from "@/components/shared/misc";
import { useConnectIntegration, useDisconnectIntegration } from "@/lib/api/hooks";
import { ConnectIntegrationInputSchema, type IntegrationView } from "@/lib/schemas";
import type { IntegrationCategory } from "@/lib/schemas";
import { formatDate } from "@/lib/domain/format";
import { ConfirmDialog, FieldError, Guarded, errorMessage, errorStatus } from "./common";
import { cn } from "@/lib/utils";

const AVAILABILITY: Record<
  Exclude<IntegrationView["availability"], "available">,
  { label: string; variant: "info" | "neutral" | "accent" }
> = {
  beta: { label: "Beta", variant: "info" },
  coming_soon: { label: "Coming soon", variant: "neutral" },
  enterprise: { label: "Enterprise", variant: "accent" },
};

/** What stops working when an integration in this category is disconnected. */
const DISCONNECT_IMPACT: Record<IntegrationCategory, string[]> = {
  source_control: [
    "ShipSafe stops posting Check Runs on new pull requests.",
    "CodeKeeper scans and agent pull requests pause for these repositories.",
    "Existing evidence and history stay in ForgePilot.",
  ],
  agents: [
    "The runtime is suspended: queued tasks for it can't launch.",
    "Running sessions finish their current step, then stop.",
    "The key reference is removed; the secret is purged from the vault.",
  ],
  issues: [
    "New issues are no longer imported as DevPilot tasks.",
    "Status and verification results stop syncing back.",
  ],
  notifications: [
    "Approval requests, failed checks and review-ready alerts stop arriving here.",
    "In-app notifications and email keep working.",
  ],
  observability: [
    "Production errors stop linking to the pull requests and tasks that changed them.",
  ],
  security: ["Imported findings stay, but no new findings are pulled in."],
  identity: ["Members fall back to email sign-in. SCIM provisioning stops."],
};

/** Agent runtimes use your own API key; everything else is an OAuth-style grant. */
function isApiKey(i: IntegrationView) {
  return i.category === "agents";
}
/** Built-in sources (e.g. advisory databases) have no scopes and nothing to connect. */
export function isBuiltIn(i: IntegrationView) {
  return i.availability === "available" && i.scopes.length === 0;
}

export function IntegrationStatus({ integration: i }: { integration: IntegrationView }) {
  const c = i.connection;
  if (isBuiltIn(i))
    return (
      <span className="text-success-foreground inline-flex items-center gap-1.5 text-xs font-medium">
        <ShieldCheckIcon className="size-3.5" aria-hidden /> Built in · always on
      </span>
    );
  if (c?.status === "connected")
    return (
      <div className="flex min-w-0 flex-col gap-0.5 text-xs">
        <span className="text-success-foreground inline-flex items-center gap-1.5 font-medium">
          <CheckCircle2Icon className="size-3.5" aria-hidden /> Connected
        </span>
        <span className="text-muted-foreground truncate" title={c.account}>
          {c.account}
          {c.connectedAt && (
            <>
              {" · "}
              <span title={formatDate(c.connectedAt)}>since {formatDate(c.connectedAt)}</span>
            </>
          )}
        </span>
      </div>
    );
  if (c?.status === "error")
    return (
      <div className="flex min-w-0 flex-col gap-0.5 text-xs" role="status">
        <span className="text-danger-foreground inline-flex items-center gap-1.5 font-medium">
          <AlertTriangleIcon className="size-3.5" aria-hidden /> Needs attention
        </span>
        <span className="text-muted-foreground">
          {c.error ?? "The connection stopped working."}
        </span>
      </div>
    );
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <CircleDashedIcon className="size-3.5" aria-hidden /> Not connected
    </span>
  );
}

export function IntegrationCard({
  integration: i,
  canManage,
  onConnect,
  onDisconnect,
  highlight = false,
}: {
  integration: IntegrationView;
  canManage: boolean;
  onConnect: (i: IntegrationView) => void;
  onDisconnect: (i: IntegrationView) => void;
  highlight?: boolean;
}) {
  const status = i.connection?.status ?? "disconnected";
  const avail = i.availability !== "available" ? AVAILABILITY[i.availability] : null;
  const noPerm = canManage ? null : "Only owners and admins can manage integrations.";
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4",
        status === "error" && "border-danger/40",
        highlight && "bg-accent/20",
      )}
      data-testid={`integration-${i.providerId}`}
    >
      <div className="flex items-start gap-3">
        <Monogram text={i.monogram} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold">{i.name}</h3>
            {avail && <Badge variant={avail.variant}>{avail.label}</Badge>}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{i.description}</p>
        </div>
      </div>
      {i.scopes.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label={`${i.name} scopes`}>
          {i.scopes.map((s) => (
            <code key={s} className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
              {s}
            </code>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t pt-3">
        <div className="min-w-40 flex-1">
          <IntegrationStatus integration={i} />
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5">
          {isBuiltIn(i) ? null : i.availability === "coming_soon" ? (
            <Button size="sm" variant="outline" disabled aria-label={`${i.name} is coming soon`}>
              Coming soon
            </Button>
          ) : status === "connected" ? (
            <Guarded reason={noPerm}>
              <Button
                size="sm"
                variant="outline"
                disabled={!canManage}
                aria-label={`Disconnect ${i.name}`}
                onClick={() => onDisconnect(i)}
              >
                <UnplugIcon /> Disconnect
              </Button>
            </Guarded>
          ) : status === "error" ? (
            <>
              <Guarded reason={noPerm}>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canManage}
                  aria-label={`Disconnect ${i.name}`}
                  onClick={() => onDisconnect(i)}
                >
                  Disconnect
                </Button>
              </Guarded>
              <Guarded reason={noPerm}>
                <Button
                  size="sm"
                  disabled={!canManage}
                  aria-label={`Reconnect ${i.name}`}
                  onClick={() => onConnect(i)}
                >
                  <RotateCwIcon /> Reconnect
                </Button>
              </Guarded>
            </>
          ) : (
            <Guarded reason={noPerm}>
              <Button
                size="sm"
                variant={i.availability === "enterprise" ? "outline" : "default"}
                disabled={!canManage}
                aria-label={`Connect ${i.name}`}
                onClick={() => onConnect(i)}
              >
                Connect
              </Button>
            </Guarded>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ConnectIntegrationDialog({
  integration,
  onOpenChange,
}: {
  integration: IntegrationView | null;
  onOpenChange: (o: boolean) => void;
}) {
  const id = useId();
  const connect = useConnectIntegration();
  const [account, setAccount] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const open = !!integration;

  useEffect(() => {
    if (!integration) return;
    // Reset each time the dialog opens; prefill a reconnect with the previous account.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccount(integration.connection?.account ?? "");
    setErr(null);
    setUpgrade(null);
  }, [integration]);

  if (!integration) return <Dialog open={false} />;
  const i = integration;
  const apiKey = isApiKey(i);
  const reconnect = i.connection?.status === "error";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ConnectIntegrationInputSchema.safeParse({ account });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Enter the account");
      return;
    }
    setErr(null);
    setUpgrade(null);
    connect.mutate(
      { providerId: i.providerId, account: parsed.data.account },
      {
        onSuccess: () => {
          toast.success(`${i.name} ${reconnect ? "reconnected" : "connected"}`, {
            description: apiKey
              ? "Key stored in the vault. Only a reference is kept in ForgePilot."
              : `Authorised for ${parsed.data.account}.`,
          });
          onOpenChange(false);
        },
        onError: (e) => {
          if (errorStatus(e) === 402) setUpgrade(errorMessage(e));
          else setErr(errorMessage(e, `Couldn't connect ${i.name}`));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Monogram text={i.monogram} />
              <div>
                <DialogTitle>
                  {reconnect ? "Reconnect" : "Connect"} {i.name}
                </DialogTitle>
                <DialogDescription>
                  {apiKey
                    ? "Bring your own API key. Agent usage is billed by the provider to your account."
                    : `You'd be sent to ${i.name} to authorise ForgePilot. In this demo the hand-off is simulated.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">ForgePilot will request</p>
            {i.scopes.length ? (
              <ul className="flex flex-col gap-1 rounded-md border p-3">
                {i.scopes.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-xs">
                    <CheckCircle2Icon className="text-success-foreground size-3.5" aria-hidden />
                    <code className="font-mono">{s}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                Scopes are agreed during Enterprise onboarding.
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Nothing beyond these scopes. You can revoke access at any time from this page or from{" "}
              {i.name}.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{apiKey ? "API key reference" : "Account or workspace"}</Label>
            <Input
              id={id}
              value={account}
              autoFocus
              placeholder={
                apiKey ? `${i.name} key · e.g. “prod key ending 7Q2a”` : "e.g. lumen-labs"
              }
              aria-invalid={!!err}
              aria-describedby={`${id}-help ${id}-err`}
              onChange={(e) => setAccount(e.target.value)}
            />
            <p id={`${id}-help`} className="text-muted-foreground flex items-start gap-1.5 text-xs">
              <KeyRoundIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {apiKey
                ? "Paste the key in the vault prompt; it goes straight to the secrets vault. ForgePilot stores only this reference and never shows the secret again."
                : "The access token is stored in the secrets vault. ForgePilot keeps only a reference and the account name."}
            </p>
            <FieldError id={`${id}-err`} message={err} />
          </div>

          {upgrade && (
            <div
              role="alert"
              className="bg-accent/40 flex flex-col gap-2 rounded-md border border-dashed p-3 text-sm"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <SparklesIcon className="size-4" aria-hidden /> {upgrade}
              </span>
              <p className="text-muted-foreground text-xs">
                SSO and SCIM are set up with our team as part of an Enterprise agreement, including
                a security review.
              </p>
              <div className="flex gap-2">
                <Button size="sm" asChild>
                  <a href="mailto:sales@forgepilot.example?subject=Enterprise%20SSO">
                    Talk to sales
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/app/billing?upgrade=1">Compare plans</Link>
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={connect.isPending}>
              {connect.isPending
                ? "Connecting…"
                : apiKey
                  ? "Save key reference"
                  : `Authorise ${i.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DisconnectIntegrationDialog({
  integration,
  onOpenChange,
}: {
  integration: IntegrationView | null;
  onOpenChange: (o: boolean) => void;
}) {
  const disconnect = useDisconnectIntegration();
  const i = integration;
  return (
    <ConfirmDialog
      open={!!i}
      onOpenChange={onOpenChange}
      title={i ? `Disconnect ${i.name}?` : "Disconnect"}
      description={
        i?.connection?.account
          ? `ForgePilot will revoke its access to ${i.connection.account}.`
          : "ForgePilot will revoke its access."
      }
      confirmLabel="Disconnect"
      destructive
      pending={disconnect.isPending}
      onConfirm={() =>
        i &&
        disconnect.mutate(i.providerId, {
          onSuccess: () => {
            toast.success(`${i.name} disconnected`, {
              description: "Access revoked. The change is in the audit log.",
            });
            onOpenChange(false);
          },
          onError: (e) => toast.error(errorMessage(e, `Couldn't disconnect ${i.name}`)),
        })
      }
    >
      {i && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">What stops working</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            {DISCONNECT_IMPACT[i.category].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </ConfirmDialog>
  );
}
