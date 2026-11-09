"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useInviteUser, useTeam } from "@/lib/api/hooks";
import { initials } from "@/lib/domain/format";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { InviteUserInputSchema, type InviteUserInput } from "@/lib/schemas";
import { ReadOnlyNote } from "./portal-utils";

const INVITE_ROLES: InviteUserInput["role"][] = [
  "client_admin",
  "client_approver",
  "client_viewer",
];
const ROLE_HELP: Record<InviteUserInput["role"], string> = {
  client_admin: "Everything, plus team and integrations",
  client_approver: "Approve or request changes on pull requests",
  client_viewer: "Read-only: work, evidence and reports",
};

const EMPTY: InviteUserInput = { name: "", email: "", role: "client_viewer" };

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [form, setForm] = useState<InviteUserInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof InviteUserInput, string>>>({});
  const [wasOpen, setWasOpen] = useState(open);
  const invite = useInviteUser();
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(EMPTY);
      setErrors({});
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = InviteUserInputSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof InviteUserInput, string>> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof InviteUserInput;
        errs[k] ??= i.message;
      });
      setErrors(errs);
      return;
    }
    invite.mutate(parsed.data, {
      onSuccess: (u) => {
        toast.success(`Invitation sent to ${u.email}`, {
          description: `${u.name} joins as ${ROLE_LABEL[u.role]} (demo: no email is sent).`,
        });
        onOpenChange(false);
      },
      onError: (err) => toast.error("Could not send the invitation", { description: err.message }),
    });
  };

  const field = (k: keyof InviteUserInput) =>
    errors[k] ? { "aria-invalid": true as const, "aria-describedby": `inv-${k}-err` } : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-4"
          aria-label="Invite a teammate"
        >
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They get access to this organization in the ForgePilot portal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-name">Name</Label>
            <Input
              id="inv-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
              {...field("name")}
            />
            {errors.name && (
              <p id="inv-name-err" className="text-danger-foreground text-xs">
                {errors.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-email">Work email</Label>
            <Input
              id="inv-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              {...field("email")}
            />
            {errors.email && (
              <p id="inv-email-err" className="text-danger-foreground text-xs">
                {errors.email}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as InviteUserInput["role"] }))}
            >
              <SelectTrigger id="inv-role" {...field("role")}>
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
            <p className="text-muted-foreground text-xs">{ROLE_HELP[form.role]}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={invite.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? (
                <Loader2Icon className="animate-spin" aria-hidden />
              ) : (
                <UserPlusIcon aria-hidden />
              )}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeamSettings({ canManage }: { canManage: boolean }) {
  const q = useTeam();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          People in your organization who can use the portal.
        </p>
        {canManage ? (
          <Button onClick={() => setOpen(true)}>
            <UserPlusIcon aria-hidden /> Invite teammate
          </Button>
        ) : (
          <ReadOnlyNote>Only client admins can invite people or change roles.</ReadOnlyNote>
        )}
      </div>
      <QueryState
        query={q}
        loading={<TableSkeleton rows={4} cols={3} />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={UsersIcon}
            title="No teammates yet"
            description="Invite approvers and viewers so the right people see changes and evidence."
            action={
              canManage ? <Button onClick={() => setOpen(true)}>Invite teammate</Button> : undefined
            }
          />
        }
      >
        {(team) => (
          <div className="rounded-lg border">
            <Table>
              <caption className="sr-only">Team members</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px]">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{u.name}</span>
                          <span className="text-muted-foreground truncate text-xs">
                            {u.email}
                            {u.title ? ` · ${u.title}` : ""}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{ROLE_LABEL[u.role]}</TableCell>
                    <TableCell>
                      {u.status === "invited" ? (
                        <Badge variant="warning">Invited</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryState>
      <InviteDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
