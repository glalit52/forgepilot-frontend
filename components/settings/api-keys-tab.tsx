"use client";
import { useEffect, useId, useState } from "react";
import { AlertTriangleIcon, KeyRoundIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { DataTable, type Column } from "@/components/shared/data-table";
import { CopyButton } from "@/components/shared/misc";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { useApiKeys, useCreateApiKey, useMembers, useRevokeApiKey } from "@/lib/api/hooks";
import { ApiKeyInputSchema, type ApiKey, type SessionInfo } from "@/lib/schemas";
import { can } from "@/lib/domain/permissions";
import { formatDate, formatDateTime, formatRelative } from "@/lib/domain/format";
import { ConfirmDialog, FieldError, Guarded, PermissionNote, errorMessage } from "./common";

const SCOPES: { id: string; label: string; description: string }[] = [
  { id: "read", label: "read", description: "Read projects, tasks, runs and findings." },
  {
    id: "runs:read",
    label: "runs:read",
    description: "Read verification runs and their evidence.",
  },
  { id: "runs:write", label: "runs:write", description: "Trigger ShipSafe runs, e.g. from CI." },
  { id: "tasks:write", label: "tasks:write", description: "Create and launch DevPilot tasks." },
];

export function ApiKeysTab({ session }: { session: SessionInfo }) {
  const query = useApiKeys();
  const members = useMembers();
  const canManage = can(session.role, "apikey.manage");
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const revoke = useRevokeApiKey();
  const nameOf = (userId: string) =>
    members.data?.members.find((m) => m.id === userId)?.name ?? "Former member";

  const columns: Column<ApiKey>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: (k) => k.name,
      cell: (k) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{k.name}</p>
          <code className="text-muted-foreground font-mono text-xs">{k.prefix}…</code>
        </div>
      ),
    },
    {
      id: "scopes",
      header: "Scopes",
      cell: (k) => (
        <div className="flex flex-wrap gap-1">
          {k.scopes.map((s) => (
            <code key={s} className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
              {s}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "createdBy",
      header: "Created",
      hideBelow: "md",
      sortValue: (k) => k.createdAt,
      cell: (k) => (
        <div className="text-sm">
          <p>{nameOf(k.createdBy)}</p>
          <p className="text-muted-foreground text-xs">{formatDate(k.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "lastUsed",
      header: "Last used",
      hideBelow: "lg",
      sortValue: (k) => k.lastUsedAt,
      cell: (k) =>
        k.lastUsedAt ? (
          <time
            dateTime={k.lastUsedAt}
            title={formatDateTime(k.lastUsedAt)}
            className="text-muted-foreground text-sm"
          >
            {formatRelative(k.lastUsedAt)}
          </time>
        ) : (
          <span className="text-muted-foreground text-sm">Never</span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (k) =>
        canManage ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Revoke ${k.name}`}
            onClick={() => setRevoking(k)}
          >
            <Trash2Icon /> Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Keys let CI and scripts call the ForgePilot API as this workspace. Secrets are shown once
          when created; we only keep a hash and the prefix.
        </p>
        <Guarded reason={canManage ? null : "Only owners and admins can create API keys."}>
          <Button size="sm" disabled={!canManage} onClick={() => setCreateOpen(true)}>
            <PlusIcon /> Create API key
          </Button>
        </Guarded>
      </div>
      {!canManage && (
        <PermissionNote>
          You can see which keys exist. Owners and admins create and revoke them.
        </PermissionNote>
      )}
      <QueryState query={query} loading={<TableSkeleton rows={3} cols={4} />}>
        {(keys) => (
          <DataTable
            rows={keys}
            columns={columns}
            getRowId={(k) => k.id}
            caption="API keys"
            empty={
              <EmptyState
                icon={KeyRoundIcon}
                title="No API keys yet"
                description="Create a key to trigger ShipSafe runs from CI or read results into your own dashboards."
                action={
                  canManage && (
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <PlusIcon /> Create API key
                    </Button>
                  )
                }
              />
            }
          />
        )}
      </QueryState>
      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={revoking ? `Revoke “${revoking.name}”?` : "Revoke key"}
        description="Anything using this key stops working immediately. This can't be undone — you'd need to create a new key."
        confirmLabel="Revoke key"
        destructive
        pending={revoke.isPending}
        onConfirm={() =>
          revoking &&
          revoke.mutate(revoking.id, {
            onSuccess: () => {
              toast.success(`“${revoking.name}” revoked`);
              setRevoking(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </div>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const id = useId();
  const create = useCreateApiKey();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [errors, setErrors] = useState<{ name?: string; scopes?: string; form?: string }>({});
  const [secret, setSecret] = useState<{ value: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName("");
    setScopes(["read"]);
    setErrors({});
    setSecret(null);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ApiKeyInputSchema.safeParse({ name, scopes });
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = String(i.path[0]) as "name" | "scopes";
        errs[k] ??= i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: (res) => {
        setSecret({ value: res.secret, name: res.key.name });
        toast.success(`API key “${res.key.name}” created`);
      },
      onError: (e) => setErrors({ form: errorMessage(e) }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {secret ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Copy your new key</DialogTitle>
              <DialogDescription>“{secret.name}” is ready to use.</DialogDescription>
            </DialogHeader>
            <div
              role="alert"
              className="bg-warning-soft text-warning-foreground flex items-start gap-2 rounded-md p-3 text-sm"
            >
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              This is the only time the secret is shown. Store it in your CI secrets now — if you
              lose it, revoke the key and create a new one.
            </div>
            <div className="flex items-center gap-2 rounded-md border p-2">
              <code
                className="min-w-0 flex-1 font-mono text-xs break-all select-all"
                aria-label="API key secret"
              >
                {secret.value}
              </code>
              <CopyButton value={secret.value} label="Copy secret" />
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>I&apos;ve saved it</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Give the key only the scopes it needs.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-name`}>Name</Label>
              <Input
                id={`${id}-name`}
                value={name}
                autoFocus
                placeholder="e.g. GitHub Actions — payments-api"
                aria-invalid={!!errors.name}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldError message={errors.name} />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Scopes</legend>
              {SCOPES.map((s) => (
                <label key={s.id} className="flex items-start gap-2.5 rounded-md border p-2.5">
                  <Checkbox
                    className="mt-0.5"
                    checked={scopes.includes(s.id)}
                    onCheckedChange={(v) =>
                      setScopes((cur) => (v ? [...cur, s.id] : cur.filter((x) => x !== s.id)))
                    }
                  />
                  <span>
                    <code className="font-mono text-xs font-medium">{s.label}</code>
                    <span className="text-muted-foreground block text-xs">{s.description}</span>
                  </span>
                </label>
              ))}
              <FieldError message={errors.scopes} />
            </fieldset>
            <FieldError message={errors.form} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
