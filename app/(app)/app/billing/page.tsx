"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CreditCardIcon,
  DownloadIcon,
  GaugeIcon,
  InfoIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { MockDataBadge, PlanBadge } from "@/components/shared/misc";
import { EmptyState, QueryState } from "@/components/shared/states";
import { UsageMeter } from "@/components/shared/usage-meter";
import { Guarded, PermissionNote } from "@/components/settings/common";
import { PlanDialog } from "@/components/billing/plan-dialog";
import { BudgetDialog } from "@/components/billing/budget-dialog";
import { BreakdownBars, DailyCostChart, money } from "@/components/billing/cost-charts";
import { useBilling, useSession } from "@/lib/api/hooks";
import type { Billing, Invoice } from "@/lib/schemas";
import { can } from "@/lib/domain/permissions";
import { planById } from "@/lib/domain/plans";
import { PROVIDER_LABEL } from "@/lib/domain/labels";
import { formatDate, formatMonth, formatNumber, formatPct } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const PROVIDER_COST_LABEL: Record<string, { label: string; hint?: string }> = {
  ...Object.fromEntries(
    Object.entries(PROVIDER_LABEL).map(([k, v]) => [k, { label: v, hint: "provider-reported" }]),
  ),
  shipsafe: { label: "ShipSafe", hint: "browser & test minutes" },
  codekeeper: { label: "CodeKeeper", hint: "scans" },
};

const INVOICE_STATUS: Record<
  Invoice["status"],
  { label: string; variant: "success" | "warning" | "neutral" }
> = {
  paid: { label: "Paid", variant: "success" },
  open: { label: "Open", variant: "warning" },
  void: { label: "Void", variant: "neutral" },
};

function BillingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Loading billing">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn("bg-muted h-48 animate-pulse rounded-lg", i === 3 && "lg:col-span-2")}
        />
      ))}
    </div>
  );
}

export default function BillingPage() {
  const session = useSession();
  const billing = useBilling();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const role = session.data?.role;
  const isOwner = can(role, "billing.manage");

  const planOpen = params.get("upgrade") === "1";
  const setPlanOpen = (open: boolean) => {
    const sp = new URLSearchParams(params.toString());
    if (open) sp.set("upgrade", "1");
    else sp.delete("upgrade");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage & billing"
        description="Your plan, what you've used this period and what it costs. Expensive operations are metered separately, and a hard cap keeps spend predictable."
        meta={<MockDataBadge />}
        actions={
          <Button onClick={() => setPlanOpen(true)}>
            <SparklesIcon /> Change plan
          </Button>
        }
      />
      {session.data && !isOwner && (
        <PermissionNote>
          You can see usage and invoices. Only the workspace owner can change the plan or the
          budget.
        </PermissionNote>
      )}
      <QueryState query={billing} loading={<BillingSkeleton />}>
        {(b) => (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <PlanCard b={b} onChange={() => setPlanOpen(true)} />
              <SpendCard b={b} isOwner={isOwner} onSetBudget={() => setBudgetOpen(true)} />
            </div>
            <UsageCard b={b} />
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Daily cost</CardTitle>
                  <CardDescription>
                    Metered usage, last 30 days. Excludes your subscription.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyCostChart data={b.dailyCost} />
                </CardContent>
              </Card>
              <LimitsCard b={b} onUpgrade={() => setPlanOpen(true)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cost by project</CardTitle>
                  <CardDescription>This period, all metered usage.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BreakdownBars
                    label="Cost by project"
                    empty="No project usage yet this period."
                    rows={b.costByProject.map((p) => ({
                      key: p.projectId,
                      label: p.name,
                      costUsd: p.costUsd,
                    }))}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cost by provider</CardTitle>
                  <CardDescription>This period.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <BreakdownBars
                    label="Cost by provider"
                    empty="No provider usage yet this period."
                    rows={b.costByProvider.map((p) => ({
                      key: p.provider,
                      label: PROVIDER_COST_LABEL[p.provider]?.label ?? p.provider,
                      hint: PROVIDER_COST_LABEL[p.provider]?.hint,
                      costUsd: p.costUsd,
                    }))}
                  />
                  <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                    <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Agent cost is reported by the provider and billed by them on your own API keys.
                    We show it so you can see the full cost of a change in one place; it isn&apos;t
                    on your ForgePilot invoice.
                  </p>
                </CardContent>
              </Card>
            </div>
            <InvoicesCard invoices={b.invoices} />
          </div>
        )}
      </QueryState>

      {billing.data && (
        <>
          <PlanDialog
            open={planOpen}
            onOpenChange={setPlanOpen}
            current={billing.data.plan}
            currentCycle={billing.data.billingCycle}
            canChange={isOwner}
          />
          <BudgetDialog open={budgetOpen} onOpenChange={setBudgetOpen} spend={billing.data.spend} />
        </>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function PlanCard({ b, onChange }: { b: Billing; onChange: () => void }) {
  const plan = planById(b.plan);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardDescription>Current plan</CardDescription>
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <PlanBadge plan={b.plan} />
          </div>
          <p className="text-muted-foreground text-xs">{plan.tagline}</p>
        </div>
        <CreditCardIcon className="text-muted-foreground size-5" aria-hidden />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Price">{b.subscriptionUsd ? `${money(b.subscriptionUsd)}/mo` : "Free"}</Stat>
          <Stat label="Billing cycle">
            <span className="capitalize">{b.billingCycle}</span>
          </Stat>
          <Stat label="Seats">
            {formatNumber(b.seatsUsed)} of{" "}
            {b.seatsIncluded === null ? "unlimited" : formatNumber(b.seatsIncluded)}
          </Stat>
          <Stat label="Current period">
            {formatDate(b.periodStart)} – {formatDate(b.periodEnd)}
          </Stat>
          <Stat label="Payment method">
            {b.paymentMethod ? (
              <span>
                {b.paymentMethod.brand} ···· {b.paymentMethod.last4}
                <span className="text-muted-foreground block text-xs font-normal">
                  expires {b.paymentMethod.expires}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">None on file</span>
            )}
          </Stat>
        </dl>
        <Button variant="outline" size="sm" className="w-fit" onClick={onChange}>
          Compare plans
        </Button>
      </CardContent>
    </Card>
  );
}

function SpendCard({
  b,
  isOwner,
  onSetBudget,
}: {
  b: Billing;
  isOwner: boolean;
  onSetBudget: () => void;
}) {
  const s = b.spend;
  const pct = Math.min(100, s.pctOfBudget);
  const projPct = s.budgetUsd ? Math.min(100, (s.projectedUsd / s.budgetUsd) * 100) : 0;
  const over = s.budgetUsd > 0 && s.projectedUsd > s.budgetUsd;
  const tone =
    s.pctOfBudget >= 100 ? "bg-danger" : s.pctOfBudget >= 80 ? "bg-warning" : "bg-primary";
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="size-4" aria-hidden /> Execution spend vs budget
          </CardTitle>
          <CardDescription>Metered usage this period, against your monthly budget.</CardDescription>
        </div>
        <Guarded reason={isOwner ? null : "Only the workspace owner can set the budget."}>
          <Button size="sm" variant="outline" disabled={!isOwner} onClick={onSetBudget}>
            <GaugeIcon /> Set budget
          </Button>
        </Guarded>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Spent so far">{money(s.usageCostUsd)}</Stat>
          <Stat label="Projected by period end">
            <span className={over ? "text-warning-foreground" : undefined}>
              {money(s.projectedUsd)}
            </span>
          </Stat>
          <Stat label="Monthly budget">{s.budgetUsd ? money(s.budgetUsd) : "Not set"}</Stat>
          <Stat label="Of budget">{formatPct(s.pctOfBudget, 1)}</Stat>
        </dl>
        <div className="flex flex-col gap-1.5">
          <div
            className="bg-muted relative h-3 w-full overflow-hidden rounded-full"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(s.pctOfBudget)}
            aria-label={`Spend is ${formatPct(s.pctOfBudget, 1)} of budget; projected ${Math.round(projPct)}%`}
          >
            {projPct > pct && (
              <div
                className="bg-warning/30 absolute inset-y-0 left-0"
                style={{ width: `${projPct}%` }}
                aria-hidden
              />
            )}
            <div
              className={cn("relative h-full rounded-full", tone)}
              style={{ width: `${pct}%` }}
            />
            {s.alertAtPct.map((t) => (
              <span
                key={t}
                className="bg-foreground/50 absolute inset-y-0 w-px"
                style={{ left: `${Math.min(t, 99.7)}%` }}
                aria-hidden
              />
            ))}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>
              Alerts at {s.alertAtPct.length ? s.alertAtPct.map((t) => `${t}%`).join(", ") : "—"}
            </span>
            {over && (
              <span className="text-warning-foreground">
                On track to pass the budget{s.hardCap ? " — work will pause at the cap" : ""}.
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
          <ShieldCheckIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              s.hardCap ? "text-success-foreground" : "text-warning-foreground",
            )}
            aria-hidden
          />
          <div>
            <p className="font-medium">Hard cap {s.hardCap ? "on" : "off"}</p>
            <p className="text-muted-foreground text-xs">
              {s.hardCap
                ? "When spend reaches the budget, new agent sessions and test runs pause until an owner raises it. Nothing is charged beyond the cap."
                : "Spend can go past the budget; you'll get alerts at each threshold. Turn the cap on to stop work automatically."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageCard({ b }: { b: Billing }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage this period</CardTitle>
        <CardDescription>
          {formatDate(b.periodStart)} – {formatDate(b.periodEnd)}. Projections assume the current
          daily pace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          {b.usage.map((u) => (
            <div key={u.meter} className="flex flex-col gap-2">
              <UsageMeter
                label={u.label}
                used={u.used}
                limit={u.included}
                projected={u.projected}
                unit={u.unit}
              />
              <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 text-xs">
                <dt>Included</dt>
                <dd className="text-right tabular-nums">
                  {u.included === null ? "Metered only" : `${formatNumber(u.included)} ${u.unit}`}
                </dd>
                <dt>Overage price</dt>
                <dd className="text-right tabular-nums">
                  {u.unitPriceUsd ? `${money(u.unitPriceUsd)} / ${u.unit}` : "No charge"}
                </dd>
                <dt>Overage so far</dt>
                <dd
                  className={cn(
                    "text-right tabular-nums",
                    u.overageUnits > 0 && "text-warning-foreground",
                  )}
                >
                  {formatNumber(u.overageUnits)} {u.unit} · {money(u.overageUsd)}
                </dd>
              </dl>
            </div>
          ))}
        </div>
        <div className="bg-muted/40 flex items-start gap-2 rounded-md border p-3">
          <InfoIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="text-muted-foreground flex flex-col gap-1 text-xs">
            <p className="text-foreground text-sm font-medium">How metering works</p>
            <p>
              Each expensive operation — agent runtime, browser test minutes, verification runs,
              maintenance scans and artifact storage — is counted on its own meter, so you can see
              exactly what drives cost. Your plan includes a quota per meter; anything beyond it is
              billed at the listed overage price.
            </p>
            <p>
              Nothing is unlimited by surprise: with the hard cap on, work pauses at your budget
              instead of running up a bill, and alerts fire at each threshold you choose.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LimitsCard({ b, onUpgrade }: { b: Billing; onUpgrade: () => void }) {
  const atLimit = b.limits.some((l) => l.limit !== null && l.used >= l.limit);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan limits</CardTitle>
        <CardDescription>{planById(b.plan).name} plan</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {b.limits.map((l) => (
          <UsageMeter key={l.key} label={l.label} used={l.used} limit={l.limit} />
        ))}
        {atLimit && (
          <Button size="sm" variant="outline" className="w-fit" onClick={onUpgrade}>
            <SparklesIcon /> Raise limits
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicesCard({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptIcon className="size-4" aria-hidden /> Invoices
        </CardTitle>
        <CardDescription>
          Subscription plus metered overage. Provider-billed agent cost isn&apos;t included.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title="No invoices yet"
            description="Your first invoice appears at the end of this billing period."
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <caption className="sr-only">Invoices</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Subscription</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Usage</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden lg:table-cell">Issued</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Download</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{formatMonth(inv.period)}</TableCell>
                    <TableCell>
                      <Badge variant={INVOICE_STATUS[inv.status].variant}>
                        {INVOICE_STATUS[inv.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {money(inv.subscriptionUsd)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {money(inv.usageUsd)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(inv.totalUsd)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {formatDate(inv.issuedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Download invoice for ${formatMonth(inv.period)} (stub)`}
                        onClick={() =>
                          toast.info("Invoice download is a stub in this demo", {
                            description:
                              "With a real billing provider this would download the PDF.",
                          })
                        }
                      >
                        <DownloadIcon /> PDF
                        <Badge variant="neutral" className="ml-0.5">
                          Stub
                        </Badge>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
