"use client";
import { useState } from "react";
import Link from "next/link";
import { BellIcon, PlugIcon, TargetIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { IntegrationsSettings } from "@/components/portal/integrations-settings";
import { usePortalRole, useUrlParams } from "@/components/portal/portal-utils";
import { TeamSettings } from "@/components/portal/team-settings";
import { useSlaReport } from "@/lib/api/hooks";
import { formatNumber, formatPct } from "@/lib/domain/format";
import type { SlaMetric } from "@/lib/schemas";

const TABS = ["team", "slas", "integrations", "notifications"] as const;
type Tab = (typeof TABS)[number];

function targetText(m: SlaMetric) {
  const v =
    m.unit === "pct"
      ? formatPct(m.target)
      : m.unit === "hours"
        ? `${formatNumber(m.target)} hours`
        : `${formatNumber(m.target)} minutes`;
  return `${m.lowerIsBetter ? "Within" : "At least"} ${v}`;
}

function SlaTargets() {
  const q = useSlaReport();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Targets from your contract. They are read-only here — talk to your ForgePilot delivery
        manager to change them. See how you are tracking in{" "}
        <Link href="/portal/reports?tab=sla" className="text-primary hover:underline">
          Reports → SLA
        </Link>
        .
      </p>
      <QueryState
        query={q}
        loading={<TableSkeleton rows={4} cols={2} />}
        isEmpty={(d) => d.metrics.length === 0}
        empty={
          <EmptyState
            icon={TargetIcon}
            title="No SLA targets on file"
            description="Your contract has no SLA targets yet."
          />
        }
      >
        {(r) => (
          <div className="rounded-lg border">
            <Table>
              <caption className="sr-only">SLA targets</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Metric</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.metrics.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="tabular-nums">{targetText(m)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryState>
    </div>
  );
}

const NOTIFICATION_PREFS = [
  {
    key: "digest",
    label: "Daily email digest",
    help: "Approvals waiting, evidence added and SLA status, once a day.",
  },
  {
    key: "slackApprovals",
    label: "Slack approval requests",
    help: "A message in your chosen channel when a PR is ready for you.",
  },
  {
    key: "slaAlerts",
    label: "SLA alerts",
    help: "Tell me when a task is at risk of missing its SLA.",
  },
] as const;

function NotificationSettings() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    digest: true,
    slackApprovals: false,
    slaAlerts: true,
  });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Saved for this demo session only — preferences reset when you reload.
      </p>
      <Card className="divide-y">
        {NOTIFICATION_PREFS.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={`pref-${p.key}`}>{p.label}</Label>
              <span id={`pref-${p.key}-help`} className="text-muted-foreground text-xs">
                {p.help}
              </span>
            </div>
            <Switch
              id={`pref-${p.key}`}
              checked={prefs[p.key]}
              onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
              aria-describedby={`pref-${p.key}-help`}
            />
          </div>
        ))}
      </Card>
      <p className="text-muted-foreground text-xs">
        Slack approval requests need the Slack integration.{" "}
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
          <Link href="/portal/settings?tab=integrations">Check integrations</Link>
        </Button>
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const url = useUrlParams();
  const role = usePortalRole();
  const p = url.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(p) ? (p as Tab) : "team";
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Your team, SLA targets, integrations and notifications."
      />
      <Tabs value={tab} onValueChange={(v) => url.set({ tab: v === "team" ? null : v })}>
        <TabsList>
          <TabsTrigger value="team">
            <UsersIcon aria-hidden /> Team
          </TabsTrigger>
          <TabsTrigger value="slas">
            <TargetIcon aria-hidden /> SLA targets
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <PlugIcon aria-hidden /> Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellIcon aria-hidden /> Notifications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <TeamSettings canManage={role.canManageTeam} />
        </TabsContent>
        <TabsContent value="slas">
          <SlaTargets />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsSettings canManage={role.canManageTeam} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
