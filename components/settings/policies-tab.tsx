"use client";
import { useId, useMemo, useState } from "react";
import { PlusIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanGate } from "@/components/shared/misc";
import { QueryState } from "@/components/shared/states";
import { usePolicy, useUpdatePolicy } from "@/lib/api/hooks";
import {
  ApprovalActionSchema,
  PolicyPatchSchema,
  ProviderSchema,
  RoleSchema,
  type ApprovalAction,
  type ApprovalRule,
  type Policy,
  type PolicyPatch,
  type SessionInfo,
} from "@/lib/schemas";
import { can, ROLE_LABEL } from "@/lib/domain/permissions";
import { APPROVAL_ACTION_LABEL, PROVIDER_LABEL } from "@/lib/domain/labels";
import { FieldError, ListEditor, PermissionNote, SettingRow, errorMessage } from "./common";

type Draft = Omit<Policy, "orgId">;
type Key = keyof Draft;

const MODE_LABEL: Record<ApprovalRule["mode"], string> = {
  allow: "Allow",
  require_approval: "Require approval",
  prohibited: "Prohibited",
};

const FIELD_LABEL: Record<Key, string> = {
  allowedProviders: "Allowed providers",
  requirePrApproval: "Require PR approval",
  protectedPaths: "Protected paths",
  networkAllowlist: "Network allowlist",
  requiredChecks: "Required checks",
  maxFixRetries: "Max fix retries",
  sessionTimeoutMin: "Session timeout",
  approvalRules: "Approval rules",
  suppressionMaxDays: "Suppression max days",
  retentionDays: "Retention",
};

function toDraft(p: Policy): Draft {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orgId, ...rest } = p;
  return structuredClone(rest);
}

function listDelta(a: string[], b: string[]) {
  const added = b.filter((x) => !a.includes(x)).length;
  const removed = a.filter((x) => !b.includes(x)).length;
  return [added && `+${added}`, removed && `−${removed}`].filter(Boolean).join(" ");
}

/** Human-readable summary of each changed field. */
function diffSummary(base: Draft, d: Draft): { key: Key; text: string }[] {
  const out: { key: Key; text: string }[] = [];
  (Object.keys(FIELD_LABEL) as Key[]).forEach((k) => {
    if (JSON.stringify(base[k]) === JSON.stringify(d[k])) return;
    const label = FIELD_LABEL[k];
    const a = base[k];
    const b = d[k];
    let text: string;
    if (
      k === "allowedProviders" ||
      k === "protectedPaths" ||
      k === "networkAllowlist" ||
      k === "requiredChecks"
    )
      text = `${label}: ${listDelta(a as string[], b as string[])}`;
    else if (k === "requirePrApproval") text = `${label}: ${b ? "on" : "off"}`;
    else if (k === "approvalRules") {
      const ar = a as ApprovalRule[];
      const br = b as ApprovalRule[];
      const changed = br.filter((r) => {
        const o = ar.find((x) => x.action === r.action);
        return !o || o.mode !== r.mode || o.approverRole !== r.approverRole;
      }).length;
      const removed = ar.filter((r) => !br.some((x) => x.action === r.action)).length;
      text = `${label}: ${[changed && `${changed} changed`, removed && `${removed} removed`].filter(Boolean).join(", ")}`;
    } else if (k === "retentionDays") {
      const ra = a as Draft["retentionDays"];
      const rb = b as Draft["retentionDays"];
      text = `${label}: ${(["logs", "artifacts", "audit"] as const)
        .filter((x) => ra[x] !== rb[x])
        .map((x) => `${x} ${ra[x]} → ${rb[x]} days`)
        .join(", ")}`;
    } else text = `${label}: ${String(a)} → ${String(b)}`;
    out.push({ key: k, text });
  });
  return out;
}

export function PoliciesTab({ session }: { session: SessionInfo }) {
  const query = usePolicy();
  return (
    <PlanGate plan={session.workspace.plan} feature="policies" title="Workspace policies">
      <QueryState
        query={query}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(policy) => (
          <PolicyForm
            key={JSON.stringify(policy)}
            policy={policy}
            canEdit={can(session.role, "policy.manage")}
            role={session.role}
          />
        )}
      </QueryState>
    </PlanGate>
  );
}

function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
  label,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max?: number;
  suffix: string;
  disabled: boolean;
  label?: string;
}) {
  return (
    <div className="relative w-40">
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="pr-14 tabular-nums"
      />
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
        {suffix}
      </span>
    </div>
  );
}

function PolicyForm({ policy, canEdit, role }: { policy: Policy; canEdit: boolean; role: string }) {
  const id = useId();
  const base = useMemo(() => toDraft(policy), [policy]);
  const [d, setD] = useState<Draft>(() => toDraft(policy));
  const [err, setErr] = useState<string | null>(null);
  const update = useUpdatePolicy();
  const diff = useMemo(() => diffSummary(base, d), [base, d]);
  const set = <K extends Key>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));
  const ro = !canEdit;
  const missingActions = ApprovalActionSchema.options.filter(
    (a) => !d.approvalRules.some((r) => r.action === a),
  );
  const [newAction, setNewAction] = useState<ApprovalAction | "">("");

  const setRule = (action: ApprovalAction, patch: Partial<ApprovalRule>) =>
    set(
      "approvalRules",
      d.approvalRules.map((r) => (r.action === action ? { ...r, ...patch } : r)),
    );

  const save = () => {
    const patch: PolicyPatch = Object.fromEntries(diff.map(({ key }) => [key, d[key]]));
    const parsed = PolicyPatchSchema.safeParse(patch);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      setErr(`${FIELD_LABEL[i?.path[0] as Key] ?? "A field"}: ${i?.message ?? "invalid value"}`);
      return;
    }
    setErr(null);
    update.mutate(parsed.data, {
      onSuccess: () =>
        toast.success("Policies saved", {
          description: diff.map((x) => x.text).join(" · "),
        }),
      onError: (e) => setErr(errorMessage(e, "Couldn't save policies")),
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {ro && (
        <PermissionNote>
          You&apos;re viewing policies as a {role}. Only owners and admins can change them, because
          they decide what agents may touch, reach and merge.
        </PermissionNote>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Agents & execution</CardTitle>
          <CardDescription>
            Enforced outside the model, in the execution sandbox — repository content can&apos;t
            override them.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Allowed providers"
            description="Tasks can only launch on these runtimes."
          >
            <div className="flex flex-col gap-2" role="group" aria-label="Allowed providers">
              {ProviderSchema.options.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={d.allowedProviders.includes(p)}
                    disabled={ro}
                    onCheckedChange={(v) =>
                      set(
                        "allowedProviders",
                        v ? [...d.allowedProviders, p] : d.allowedProviders.filter((x) => x !== p),
                      )
                    }
                  />
                  {PROVIDER_LABEL[p]}
                </label>
              ))}
            </div>
          </SettingRow>
          <SettingRow
            title="Require PR approval"
            htmlFor={`${id}-pr`}
            description="A person must approve every agent pull request in GitHub before it can merge."
          >
            <Switch
              id={`${id}-pr`}
              checked={d.requirePrApproval}
              disabled={ro}
              onCheckedChange={(v) => set("requirePrApproval", v)}
            />
          </SettingRow>
          <SettingRow
            title="Session timeout"
            htmlFor={`${id}-timeout`}
            description="Hard stop for any single agent session."
          >
            <NumberField
              id={`${id}-timeout`}
              value={d.sessionTimeoutMin}
              min={5}
              suffix="min"
              disabled={ro}
              onChange={(n) => set("sessionTimeoutMin", n)}
            />
          </SettingRow>
          <SettingRow
            title="Max fix retries"
            htmlFor={`${id}-retries`}
            description="How many times an agent may retry after a failed verification before a person takes over (0–10)."
          >
            <NumberField
              id={`${id}-retries`}
              value={d.maxFixRetries}
              min={0}
              max={10}
              suffix="tries"
              disabled={ro}
              onChange={(n) => set("maxFixRetries", n)}
            />
          </SettingRow>
          <div className="py-4">
            <ListEditor
              label="Protected paths"
              description="Changes here need approval (see rules below). Globs are supported."
              values={d.protectedPaths}
              onChange={(v) => set("protectedPaths", v)}
              placeholder="e.g. infra/** or db/migrations/**"
              disabled={ro}
            />
          </div>
          <div className="py-4 last:pb-0">
            <ListEditor
              label="Network allowlist"
              description="Hosts agent workspaces may reach. Everything else is blocked."
              values={d.networkAllowlist}
              onChange={(v) => set("networkAllowlist", v)}
              placeholder="e.g. registry.npmjs.org"
              disabled={ro}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
          <CardDescription>What must pass before a change is review-ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <ListEditor
            label="Required checks"
            values={d.requiredChecks}
            onChange={(v) => set("requiredChecks", v)}
            placeholder="e.g. ShipSafe / e2e"
            disabled={ro}
            mono={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval rules</CardTitle>
          <CardDescription>
            Sensitive actions an agent may attempt, and who must say yes first.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg border">
            <Table>
              <caption className="sr-only">Approval rules</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Action</TableHead>
                  <TableHead className="w-48">Mode</TableHead>
                  <TableHead className="w-40">Approver role</TableHead>
                  {!ro && (
                    <TableHead className="w-12">
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.approvalRules.map((r) => (
                  <TableRow key={r.action}>
                    <TableCell className="text-sm">{APPROVAL_ACTION_LABEL[r.action]}</TableCell>
                    <TableCell>
                      <Select
                        value={r.mode}
                        disabled={ro}
                        onValueChange={(v) =>
                          setRule(r.action, { mode: v as ApprovalRule["mode"] })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Mode for ${APPROVAL_ACTION_LABEL[r.action]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(MODE_LABEL) as ApprovalRule["mode"][]).map((m) => (
                            <SelectItem key={m} value={m}>
                              {MODE_LABEL[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.approverRole}
                        disabled={ro || r.mode !== "require_approval"}
                        onValueChange={(v) =>
                          setRule(r.action, { approverRole: v as ApprovalRule["approverRole"] })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Approver role for ${APPROVAL_ACTION_LABEL[r.action]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RoleSchema.options
                            .filter((x) => x !== "viewer")
                            .map((x) => (
                              <SelectItem key={x} value={x}>
                                {ROLE_LABEL[x]}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {!ro && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove rule for ${APPROVAL_ACTION_LABEL[r.action]}`}
                          onClick={() =>
                            set(
                              "approvalRules",
                              d.approvalRules.filter((x) => x.action !== r.action),
                            )
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!ro && missingActions.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-56 flex-col gap-1">
                <Label
                  htmlFor={`${id}-new-rule`}
                  className="text-muted-foreground text-xs font-normal"
                >
                  Add a rule for
                </Label>
                <Select value={newAction} onValueChange={(v) => setNewAction(v as ApprovalAction)}>
                  <SelectTrigger id={`${id}-new-rule`} size="sm">
                    <SelectValue placeholder="Choose an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {missingActions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {APPROVAL_ACTION_LABEL[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!newAction}
                onClick={() => {
                  if (!newAction) return;
                  set("approvalRules", [
                    ...d.approvalRules,
                    { action: newAction, mode: "require_approval", approverRole: "admin" },
                  ]);
                  setNewAction("");
                }}
              >
                <PlusIcon /> Add rule
              </Button>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Actions without a rule are allowed within the sandbox. Merging always happens in GitHub,
            under your branch protection.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance & retention</CardTitle>
          <CardDescription>
            How long data is kept, and how long findings can be snoozed.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Suppression max days"
            htmlFor={`${id}-supp`}
            description="Longest a CodeKeeper finding can be suppressed before it reopens."
          >
            <NumberField
              id={`${id}-supp`}
              value={d.suppressionMaxDays}
              min={1}
              max={365}
              suffix="days"
              disabled={ro}
              onChange={(n) => set("suppressionMaxDays", n)}
            />
          </SettingRow>
          <SettingRow
            title="Retention"
            description="Session logs, test artifacts and the audit log."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(["logs", "artifacts", "audit"] as const).map((k) => (
                <div key={k} className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-ret-${k}`} className="text-xs capitalize">
                    {k}
                  </Label>
                  <NumberField
                    id={`${id}-ret-${k}`}
                    value={d.retentionDays[k]}
                    min={1}
                    suffix="days"
                    disabled={ro}
                    onChange={(n) => set("retentionDays", { ...d.retentionDays, [k]: n })}
                  />
                </div>
              ))}
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {!ro && (diff.length > 0 || err) && (
        <div
          className="bg-background/95 sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between"
          role="region"
          aria-label="Unsaved policy changes"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon className="size-4" aria-hidden />
              {diff.length} unsaved change{diff.length === 1 ? "" : "s"}
            </p>
            <ul className="text-muted-foreground mt-1 flex flex-col gap-0.5 text-xs">
              {diff.map((x) => (
                <li key={x.key}>{x.text}</li>
              ))}
            </ul>
            <FieldError message={err} />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setD(toDraft(policy));
                setErr(null);
              }}
              disabled={update.isPending}
            >
              Discard
            </Button>
            <Button onClick={save} disabled={update.isPending || diff.length === 0}>
              {update.isPending ? "Saving…" : "Save policies"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
