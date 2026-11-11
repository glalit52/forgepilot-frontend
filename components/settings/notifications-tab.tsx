"use client";
import { useState } from "react";
import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIntegrations } from "@/lib/api/hooks";

const EVENTS = [
  {
    id: "approvals",
    label: "Approval requests",
    description: "An agent needs a person to allow a sensitive action.",
  },
  {
    id: "failed_checks",
    label: "Failed checks",
    description: "ShipSafe found a product defect on a pull request.",
  },
  {
    id: "review_ready",
    label: "Review-ready pull requests",
    description: "Verification passed and a PR is waiting for review.",
  },
  {
    id: "budget",
    label: "Budget alerts",
    description: "Spend crosses one of your alert thresholds.",
  },
  {
    id: "findings",
    label: "New findings",
    description: "CodeKeeper found a high or critical issue.",
  },
] as const;
const CHANNELS = [
  { id: "email", label: "Email" },
  { id: "slack", label: "Slack" },
] as const;

type EventId = (typeof EVENTS)[number]["id"];
type ChannelId = (typeof CHANNELS)[number]["id"];
type Prefs = Record<EventId, Record<ChannelId, boolean>>;

const DEFAULTS: Prefs = {
  approvals: { email: true, slack: true },
  failed_checks: { email: false, slack: true },
  review_ready: { email: true, slack: true },
  budget: { email: true, slack: false },
  findings: { email: false, slack: true },
};

/** Survives tab switches, not reloads: there is no notifications API yet. */
let sessionPrefs: Prefs = DEFAULTS;

export function NotificationsTab() {
  const [prefs, setPrefsState] = useState<Prefs>(sessionPrefs);
  const setPrefs = (fn: (p: Prefs) => Prefs) =>
    setPrefsState((p) => {
      sessionPrefs = fn(p);
      return sessionPrefs;
    });
  const integrations = useIntegrations();
  const slack = integrations.data?.find((i) => i.providerId === "slack")?.connection;
  const slackConnected = slack?.status === "connected";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your notifications</CardTitle>
        <CardDescription>
          Choose where you hear about things that need you. In-app notifications are always on.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border">
          <Table>
            <caption className="sr-only">Notification preferences by channel</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Event</TableHead>
                {CHANNELS.map((c) => (
                  <TableHead key={c.id} className="w-24 text-center">
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {EVENTS.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{e.label}</p>
                    <p className="text-muted-foreground text-xs whitespace-normal">
                      {e.description}
                    </p>
                  </TableCell>
                  {CHANNELS.map((c) => (
                    <TableCell key={c.id} className="text-center">
                      <Switch
                        checked={prefs[e.id][c.id]}
                        aria-label={`${e.label} by ${c.label}`}
                        onCheckedChange={(v) => {
                          setPrefs((p) => ({ ...p, [e.id]: { ...p[e.id], [c.id]: v } }));
                          toast.success(`${e.label} ${v ? "on" : "off"} for ${c.label}`, {
                            description: "Saved for this demo session.",
                          });
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {integrations.data && (
          <p className="text-muted-foreground text-xs">
            {slackConnected ? (
              <>Slack messages go to {slack?.account}.</>
            ) : (
              <>
                Slack isn&apos;t connected, so Slack notifications won&apos;t be delivered.{" "}
                <Link href="/app/integrations" className="text-primary hover:underline">
                  Connect Slack
                </Link>
              </>
            )}
          </p>
        )}
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <InfoIcon className="size-3.5" aria-hidden /> Saved for this demo session only —
          preferences reset when you reload.
        </p>
      </CardContent>
    </Card>
  );
}
