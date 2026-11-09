"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckSquareIcon, InboxIcon, SettingsIcon } from "lucide-react";
import { useApprovals, useMembers, useSession } from "@/lib/api/hooks";
import { hasFeature } from "@/lib/domain/plans";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MockDataBadge, PlanGate } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState } from "@/components/shared/states";
import { ApprovalCard } from "@/components/workspace/approval-card";

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading approvals">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  const approvals = useApprovals();
  const session = useSession();
  const members = useMembers();
  const [tab, setTab] = useState("pending");
  const role = session.data?.role;
  const userId = session.data?.user.id;
  const plan = session.data?.workspace.plan;
  const nameOf = (id: string | null) =>
    id ? (members.data?.members.find((m) => m.id === id)?.name ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approvals"
        description="Sensitive actions wait here for a person: protected paths, secrets, migrations, network access and budget changes. Each approval covers exactly one action."
        meta={<MockDataBadge />}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/settings?tab=policies">
              <SettingsIcon /> Approval rules
            </Link>
          </Button>
        }
      />
      <QueryState query={approvals} loading={<ListSkeleton />}>
        {(rows) => {
          const pending = rows.filter((a) => a.status === "pending");
          const decided = rows
            .filter((a) => a.status !== "pending")
            .sort((a, b) =>
              (b.decidedAt ?? b.requestedAt).localeCompare(a.decidedAt ?? a.requestedAt),
            );
          const mine = pending.filter((a) => a.canDecide).length;
          if (!rows.length && plan && !hasFeature(plan, "approvals"))
            return (
              <PlanGate plan={plan} feature="approvals" title="The approval centre">
                {null}
              </PlanGate>
            );
          return (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending
                  {pending.length > 0 && (
                    <span className="bg-primary text-primary-foreground rounded px-1.5 text-[11px] tabular-nums">
                      {pending.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="decided">
                  Decided{" "}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {decided.length}
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="flex flex-col gap-3">
                {pending.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    {mine === pending.length
                      ? `${pending.length} request${pending.length === 1 ? "" : "s"} waiting for you.`
                      : `${mine} of ${pending.length} waiting for you. The rest need a different approver.`}{" "}
                    Agents stay paused until someone decides.
                  </p>
                )}
                {pending.length ? (
                  pending.map((a) => (
                    <ApprovalCard key={a.id} a={a} role={role} userId={userId} nameOf={nameOf} />
                  ))
                ) : (
                  <EmptyState
                    icon={CheckSquareIcon}
                    title="Nothing waiting for approval"
                    description="When an agent hits a protected path, needs a secret or asks for more budget, the request appears here and the agent pauses."
                  />
                )}
              </TabsContent>
              <TabsContent value="decided" className="flex flex-col gap-3">
                {decided.length ? (
                  decided.map((a) => (
                    <ApprovalCard key={a.id} a={a} role={role} userId={userId} nameOf={nameOf} />
                  ))
                ) : (
                  <EmptyState
                    icon={InboxIcon}
                    title="No decisions yet"
                    description="Approved, rejected and expired requests are kept here with who decided and why."
                  />
                )}
              </TabsContent>
            </Tabs>
          );
        }}
      </QueryState>
    </div>
  );
}
