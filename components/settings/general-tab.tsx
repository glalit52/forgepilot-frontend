"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton, PlanBadge } from "@/components/shared/misc";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  useAuthOptions,
  useDeleteAccount,
  useDeleteWorkspace,
  useRenameWorkspace,
} from "@/lib/api/hooks";
import { WorkspacePatchSchema, type SessionInfo } from "@/lib/schemas";
import { can, ROLE_LABEL } from "@/lib/domain/permissions";
import { WORKSPACE_KIND_LABEL, USE_CASE_LABEL } from "@/lib/domain/labels";
import { formatDate, formatRelative } from "@/lib/domain/format";
import {
  ConfirmDialog,
  FieldError,
  Guarded,
  PermissionNote,
  SettingRow,
  errorMessage,
} from "./common";

export function GeneralTab({ session }: { session: SessionInfo }) {
  const ws = session.workspace;
  const canRename = can(session.role, "workspace.manage");
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>How this workspace appears to members and in URLs.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <RenameRow key={ws.id + ws.name} name={ws.name} canRename={canRename} />
          <SettingRow title="Kind" description="Set when the workspace was created.">
            <span className="text-sm">{WORKSPACE_KIND_LABEL[ws.kind]}</span>
          </SettingRow>
          <SettingRow title="Slug" description="Used in API calls and webhook URLs.">
            <span className="inline-flex items-center gap-1">
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{ws.slug}</code>
              <CopyButton value={ws.slug} label="Copy slug" />
            </span>
          </SettingRow>
          <SettingRow title="Created">
            <span className="text-sm" title={formatRelative(ws.createdAt)}>
              {formatDate(ws.createdAt)}
            </span>
          </SettingRow>
          {ws.useCase && (
            <SettingRow title="Primary use">
              <span className="text-sm">{USE_CASE_LABEL[ws.useCase] ?? ws.useCase}</span>
            </SettingRow>
          )}
          <SettingRow title="Plan" description="Change plan, seats and budgets in billing.">
            <span className="inline-flex items-center gap-2">
              <PlanBadge plan={ws.plan} />
              <span className="text-muted-foreground text-xs capitalize">
                billed {ws.billingCycle}
              </span>
              <Button variant="link" size="sm" asChild className="h-auto px-0">
                <Link href="/app/billing">Usage & billing</Link>
              </Button>
            </span>
          </SettingRow>
          <SettingRow title="Your role">
            <span className="text-sm">{ROLE_LABEL[session.role]}</span>
          </SettingRow>
        </CardContent>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger-foreground">Danger zone</CardTitle>
          <CardDescription>Irreversible actions. Only owners can perform them.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete workspace</p>
            <p className="text-muted-foreground text-xs">
              Removes projects, connections, history and evidence for everyone. Repositories on
              GitHub are not touched.
            </p>
          </div>
          <DeleteWorkspace name={ws.name} isOwner={session.role === "owner"} />
        </CardContent>
        <CardContent className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete my account</p>
            <p className="text-muted-foreground text-xs">
              Removes your sign-in and your name from every workspace. Not possible while you are
              the only owner of a workspace.
            </p>
          </div>
          <DeleteAccount email={session.user.email} />
        </CardContent>
      </Card>
    </div>
  );
}

/** Typing the exact name is the confirmation: this can't be undone. */
function DeleteWorkspace({ name, isOwner }: { name: string; isOwner: boolean }) {
  const id = useId();
  const router = useRouter();
  const real = useAuthOptions().data?.demo === false;
  const del = useDeleteWorkspace();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const reason = !real
    ? "Deleting workspaces is disabled in the demo."
    : !isOwner
      ? "Only an owner can delete the workspace."
      : null;
  if (reason)
    return (
      <Guarded reason={reason}>
        <Button variant="destructive" disabled>
          <TrashIcon /> Delete workspace
        </Button>
      </Guarded>
    );
  return (
    <>
      <Button
        variant="destructive"
        onClick={() => {
          setTyped("");
          setErr(null);
          setOpen(true);
        }}
      >
        <TrashIcon /> Delete workspace
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${name}?`}
        description="Everything in this workspace is removed for every member, and any paid subscription is cancelled. This can't be undone."
        confirmLabel="Delete workspace"
        destructive
        pending={del.isPending}
        onConfirm={() => {
          if (typed.trim() !== name) return setErr("Type the workspace name exactly.");
          del.mutate(typed, {
            onSuccess: () => {
              toast.success(`${name} was deleted`);
              router.push("/onboarding");
              router.refresh();
            },
            onError: (e) => setErr(errorMessage(e)),
          });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>
            Type <b>{name}</b> to confirm
          </Label>
          <Input
            id={id}
            value={typed}
            autoComplete="off"
            aria-invalid={!!err}
            aria-describedby={`${id}-err`}
            onChange={(e) => setTyped(e.target.value)}
          />
          <FieldError id={`${id}-err`} message={err} />
        </div>
      </ConfirmDialog>
    </>
  );
}

function DeleteAccount({ email }: { email: string }) {
  const id = useId();
  const router = useRouter();
  const real = useAuthOptions().data?.demo === false;
  const del = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (!real)
    return (
      <Guarded reason="Deleting accounts is disabled in the demo.">
        <Button variant="outline" disabled>
          Delete my account
        </Button>
      </Guarded>
    );
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setTyped("");
          setErr(null);
          setOpen(true);
        }}
      >
        Delete my account
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        description="You will be signed out everywhere and removed from every workspace. This can't be undone."
        confirmLabel="Delete my account"
        destructive
        pending={del.isPending}
        onConfirm={() => {
          if (typed.trim().toLowerCase() !== email.toLowerCase())
            return setErr("Type your email address exactly.");
          del.mutate(typed, {
            onSuccess: () => {
              router.push("/");
              router.refresh();
            },
            onError: (e) => setErr(errorMessage(e)),
          });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>
            Type <b>{email}</b> to confirm
          </Label>
          <Input
            id={id}
            value={typed}
            autoComplete="off"
            aria-invalid={!!err}
            aria-describedby={`${id}-err`}
            onChange={(e) => setTyped(e.target.value)}
          />
          <FieldError id={`${id}-err`} message={err} />
        </div>
      </ConfirmDialog>
    </>
  );
}

function RenameRow({ name, canRename }: { name: string; canRename: boolean }) {
  const id = useId();
  const [value, setValue] = useState(name);
  const [err, setErr] = useState<string | null>(null);
  const rename = useRenameWorkspace();
  const dirty = value.trim() !== name;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = WorkspacePatchSchema.safeParse({ name: value });
    if (!parsed.success || !parsed.data.name) {
      setErr("Use 2–48 characters");
      return;
    }
    setErr(null);
    rename.mutate(parsed.data.name, {
      onSuccess: (o) => toast.success(`Workspace renamed to “${o.name}”`),
      onError: (e) => setErr(errorMessage(e, "Couldn't rename the workspace")),
    });
  };
  return (
    <SettingRow title="Name" htmlFor={id} description={canRename ? "2–48 characters." : undefined}>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            id={id}
            value={value}
            maxLength={48}
            disabled={!canRename}
            aria-invalid={!!err}
            onChange={(e) => setValue(e.target.value)}
          />
          {canRename && (
            <Button type="submit" variant="outline" disabled={!dirty || rename.isPending}>
              {rename.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
        <FieldError message={err} />
        {!canRename && (
          <PermissionNote>Only workspace owners can rename the workspace.</PermissionNote>
        )}
      </form>
    </SettingRow>
  );
}
