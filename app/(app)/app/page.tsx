"use client";
import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { useOverview, useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { useAppUI } from "@/components/app/app-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { KpiCardSkeleton } from "@/components/shared/kpi-card";
import { PlanBadge } from "@/components/shared/misc";
import { ErrorState } from "@/components/shared/states";
import { GatedButton } from "@/components/workspace/gated-button";
import {
  AttentionList,
  greeting,
  KpiGrid,
  LifecycleStrip,
  LiveSessions,
  ModuleCards,
  NorthStarCard,
  NorthStarSkeleton,
  SetupChecklist,
  SpendCard,
} from "@/components/workspace/overview";

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-xs font-normal"
    >
      {children} <ChevronRightIcon className="size-3.5" aria-hidden />
    </Link>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading overview">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <NorthStarSkeleton />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const session = useSession();
  const overview = useOverview();
  const { openNewTask } = useAppUI();
  const role = session.data?.role;
  const newTaskBlocked =
    role && !can(role, "task.create")
      ? "Viewers can't create tasks. Ask an admin for the Member role."
      : null;
  const firstName = session.data?.user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {session.data ? (
            <h1 className="text-xl font-semibold tracking-tight">
              {greeting(new Date().getHours())}, {firstName}
            </h1>
          ) : (
            <Skeleton className="h-7 w-56" />
          )}
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {session.data ? (
              <>
                Here&apos;s what&apos;s happening in{" "}
                <span className="text-foreground font-medium">{session.data.workspace.name}</span>
                <PlanBadge plan={session.data.workspace.plan} />
              </>
            ) : (
              <Skeleton className="h-4 w-72" />
            )}
          </p>
        </div>
        <GatedButton onClick={() => openNewTask()} disabledReason={newTaskBlocked}>
          <PlusIcon /> New task
        </GatedButton>
      </div>

      {overview.isPending ? (
        <OverviewSkeleton />
      ) : overview.error || !overview.data ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <>
          {session.data && (
            <SetupChecklist items={overview.data.setup} workspaceId={session.data.workspace.id} />
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <NorthStarCard data={overview.data.northStar} />
            <div className="flex flex-col gap-3">
              <KpiGrid kpis={overview.data.kpis} />
              <SpendCard
                spendUsd={overview.data.kpis.spendUsd}
                budgetUsd={overview.data.kpis.budgetUsd}
              />
            </div>
          </div>

          <section aria-labelledby="lifecycle-title" className="flex flex-col gap-2">
            <h2 id="lifecycle-title" className="text-sm font-semibold">
              Work in flight
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                Plan → agents → verification → human review → merge in GitHub
              </span>
            </h2>
            <LifecycleStrip stages={overview.data.lifecycle} />
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between border-b pb-3">
                <CardTitle>
                  Needs your attention
                  {overview.data.attention.length > 0 && (
                    <span className="text-muted-foreground ml-2 font-normal tabular-nums">
                      {overview.data.attention.length}
                    </span>
                  )}
                </CardTitle>
                <CardLink href="/app/approvals">Approvals</CardLink>
              </CardHeader>
              <div className="py-1">
                <AttentionList items={overview.data.attention} />
              </div>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between border-b pb-3">
                <CardTitle className="flex items-center gap-2">
                  Live agent sessions
                  {overview.data.liveSessions.length > 0 && (
                    <span className="relative flex size-2" aria-hidden>
                      <span className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                      <span className="bg-primary relative inline-flex size-2 rounded-full" />
                    </span>
                  )}
                </CardTitle>
                <CardLink href="/app/devpilot/sessions">All sessions</CardLink>
              </CardHeader>
              <div className="py-1">
                <LiveSessions
                  sessions={overview.data.liveSessions}
                  onNewTask={() => openNewTask()}
                  newTaskDisabledReason={newTaskBlocked}
                />
              </div>
            </Card>
          </div>

          <section aria-labelledby="modules-title" className="flex flex-col gap-2">
            <h2 id="modules-title" className="text-sm font-semibold">
              Modules
            </h2>
            <ModuleCards modules={overview.data.modules} />
          </section>

          <Card>
            <CardHeader className="flex-row items-center justify-between border-b pb-3">
              <CardTitle>Recent activity</CardTitle>
              <CardLink href="/app/settings?tab=audit">Audit log</CardLink>
            </CardHeader>
            <CardContent className="pt-4">
              <ActivityTimeline items={overview.data.activity} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
