"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { MailIcon, SparklesIcon, UserMinusIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { UsageMeter } from "@/components/shared/usage-meter";
import {
  useChangeRole,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
} from "@/lib/api/hooks";
import {
  InviteInputSchema,
  RoleSchema,
  type InviteInput,
  type Member,
  type Role,
  type SessionInfo,
} from "@/lib/schemas";
import { can, ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/domain/permissions";
import { formatDate, formatRelative, initials } from "@/lib/domain/format";
import { ConfirmDialog, FieldError, Guarded, PermissionNote, errorMessage } from "./common";

const ROLES = RoleSchema.options;
const INVITE_ROLES = ROLES.filter((r) => r !== "owner") as InviteInput["role"][];

export function MembersTab({ session }: { session: SessionInfo }) {
  const query = useMembers();
  const canManage = can(session.role, "member.manage");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const changeRole = useChangeRole();
  const remove = useRemoveMember();
  const revoke = useRevokeInvitation();

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_300px]">
      <QueryState query={query} loading={<TableSkeleton rows={6} cols={4} />}>
        {(data) => {
          const used = data.members.length + data.invitations.length;
          const full = data.seatsIncluded !== null && used >= data.seatsIncluded;
          const inviteReason = !canManage
            ? "Only owners and admins can invite members."
            : full
              ? "All seats are in use. Upgrade to add members."
              : null;
          return (
            <div className="flex min-w-0 flex-col gap-6">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>
                      {data.members.length} member{data.members.length === 1 ? "" : "s"} in{" "}
                      {session.workspace.name}
                    </CardDescription>
                  </div>
                  <Guarded reason={inviteReason}>
                    <Button size="sm" disabled={!!inviteReason} onClick={() => setInviteOpen(true)}>
                      <UserPlusIcon /> Invite member
                    </Button>
                  </Guarded>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-6">
                    <UsageMeter
                      className="flex-1"
                      label="Seats used (members + pending invitations)"
                      used={used}
                      limit={data.seatsIncluded}
                    />
                    {full ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/app/billing?upgrade=1">
                          <SparklesIcon /> Upgrade for more seats
                        </Link>
                      </Button>
                    ) : (
                      data.seatsIncluded !== null && (
                        <span className="text-muted-foreground text-xs">
                          {data.seatsIncluded - used} seat
                          {data.seatsIncluded - used === 1 ? "" : "s"} left on your plan
                        </span>
                      )
                    )}
                  </div>
                  {!canManage && (
                    <PermissionNote>
                      You can see who&apos;s here. Owners and admins change roles, invite and remove
                      members.
                    </PermissionNote>
                  )}
                  <div className="rounded-lg border">
                    <Table>
                      <caption className="sr-only">Workspace members</caption>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Member</TableHead>
                          <TableHead className="w-36">Role</TableHead>
                          <TableHead className="hidden md:table-cell">Last active</TableHead>
                          <TableHead className="hidden xl:table-cell">Joined</TableHead>
                          <TableHead className="w-12">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.members.map((m) => {
                          const me = m.id === session.user.id;
                          return (
                            <TableRow key={m.id}>
                              <TableCell>
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <Avatar className="size-7">
                                    <AvatarFallback className="text-[10px]">
                                      {initials(m.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {m.name}
                                      {me && (
                                        <span className="text-muted-foreground font-normal">
                                          {" "}
                                          (you)
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-muted-foreground truncate text-xs">
                                      {m.email}
                                      {m.title ? ` · ${m.title}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {canManage ? (
                                  <Select
                                    value={m.role}
                                    disabled={changeRole.isPending}
                                    onValueChange={(role) =>
                                      changeRole.mutate(
                                        { userId: m.id, role: role as Role },
                                        {
                                          onSuccess: () =>
                                            toast.success(
                                              `${m.name} is now ${ROLE_LABEL[role as Role].toLowerCase()}`,
                                            ),
                                          onError: (e) =>
                                            toast.error("Role not changed", {
                                              description: errorMessage(e),
                                            }),
                                        },
                                      )
                                    }
                                  >
                                    <SelectTrigger size="sm" aria-label={`Role for ${m.name}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                          {ROLE_LABEL[r]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant={m.role === "owner" ? "accent" : "neutral"}>
                                    {ROLE_LABEL[m.role]}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap md:table-cell">
                                {m.lastActiveAt ? (
                                  <time
                                    dateTime={m.lastActiveAt}
                                    title={formatDate(m.lastActiveAt)}
                                  >
                                    {formatRelative(m.lastActiveAt)}
                                  </time>
                                ) : (
                                  "Never"
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap xl:table-cell">
                                {formatDate(m.joinedAt)}
                              </TableCell>
                              <TableCell>
                                {canManage && !me && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remove ${m.name}`}
                                    onClick={() => setRemoving(m)}
                                  >
                                    <UserMinusIcon />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending invitations</CardTitle>
                  <CardDescription>
                    Invitations hold a seat until accepted or revoked.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.invitations.length === 0 ? (
                    <EmptyState
                      icon={MailIcon}
                      title="No pending invitations"
                      description="Invite teammates to review agent pull requests and approve sensitive actions."
                      className="py-6"
                    />
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {data.invitations.map((inv) => (
                        <li key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                          <MailIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{inv.email}</p>
                            <p className="text-muted-foreground text-xs">
                              {ROLE_LABEL[inv.role]} · sent{" "}
                              <time dateTime={inv.sentAt} title={formatDate(inv.sentAt)}>
                                {formatRelative(inv.sentAt)}
                              </time>
                              {" by "}
                              {data.members.find((m) => m.id === inv.invitedBy)?.name ??
                                "a teammate"}
                            </p>
                          </div>
                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={revoke.isPending}
                              aria-label={`Revoke invitation for ${inv.email}`}
                              onClick={() =>
                                revoke.mutate(inv.id, {
                                  onSuccess: () =>
                                    toast.success(`Invitation for ${inv.email} revoked`, {
                                      description: "The seat is free again.",
                                    }),
                                  onError: (e) => toast.error(errorMessage(e)),
                                })
                              }
                            >
                              Revoke
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </QueryState>

      <RolesPanel />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing ? `Remove ${removing.name}?` : "Remove member"}
        description="They lose access to this workspace immediately. Their tasks, reviews and audit history stay."
        confirmLabel="Remove member"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast.success(`${removing.name} removed from the workspace`);
              setRemoving(null);
            },
            onError: (e) => {
              toast.error("Member not removed", { description: errorMessage(e) });
              setRemoving(null);
            },
          })
        }
      />
    </div>
  );
}

function RolesPanel() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-4" aria-hidden /> Roles
        </CardTitle>
        <CardDescription>Least privilege by default.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-1">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="text-sm font-medium">{ROLE_LABEL[r]}</dt>
              <dd className="text-muted-foreground text-xs">{ROLE_DESCRIPTION[r]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const id = useId();
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteInput["role"]>("member");
  const [errors, setErrors] = useState<{ email?: string; role?: string; form?: string }>({});

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail("");
    setRole("member");
    setErrors({});
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = InviteInputSchema.safeParse({ email: email.trim(), role });
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = String(i.path[0]) as "email" | "role";
        errs[k] ??= i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    invite.mutate(parsed.data, {
      onSuccess: (inv) => {
        toast.success(`Invitation sent to ${inv.email}`, {
          description: `They'll join as ${ROLE_LABEL[inv.role].toLowerCase()}.`,
        });
        onOpenChange(false);
      },
      onError: (e) => setErrors({ form: errorMessage(e, "Couldn't send the invitation") }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              They&apos;ll get an email link to join. An invitation uses a seat until it&apos;s
              accepted or revoked.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              id={`${id}-email`}
              type="email"
              autoFocus
              value={email}
              placeholder="name@company.com"
              aria-invalid={!!errors.email}
              aria-describedby={`${id}-email-err`}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldError id={`${id}-email-err`} message={errors.email} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-role`}>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InviteInput["role"])}>
              <SelectTrigger id={`${id}-role`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{ROLE_DESCRIPTION[role]}</p>
            <FieldError message={errors.role} />
          </div>
          <FieldError message={errors.form} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
