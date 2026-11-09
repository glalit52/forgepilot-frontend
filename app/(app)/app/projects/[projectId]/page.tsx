"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GitBranchPlusIcon, PlusIcon } from "lucide-react";
import { useProject, useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { formatDate } from "@/lib/domain/format";
import { useAppUI } from "@/components/app/app-ui";
import { useBreadcrumbLabel } from "@/components/shell/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScore } from "@/components/shared/health-score";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/states";
import { GatedButton } from "@/components/workspace/gated-button";
import {
  FindingList,
  PullRequestTable,
  RepositoryTable,
  RunList,
  TaskList,
} from "@/components/workspace/lists";
import { ProjectSwatch } from "@/components/workspace/project-color";
import { cn } from "@/lib/utils";

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</dd>
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="text-muted-foreground ml-1 text-xs tabular-nums">{n}</span>;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const session = useSession();
  const { openNewTask } = useAppUI();
  useBreadcrumbLabel(projectId, project.data?.project.name);
  const role = session.data?.role;
  const taskBlocked = role && !can(role, "task.create") ? "Viewers can't create tasks." : null;
  const connectBlocked =
    role && !can(role, "repo.connect") ? "Only owners and admins can connect repositories." : null;

  return (
    <QueryState query={project}>
      {({ project: p, repositories, tasks, pullRequests, runs, findings }) => {
        const openPrs = pullRequests.filter((x) => x.status === "open");
        return (
          <div className="flex flex-col gap-6">
            <PageHeader
              title={
                <span className="flex items-center gap-2">
                  <ProjectSwatch color={p.color} className="size-3" /> {p.name}
                </span>
              }
              description={p.description || undefined}
              meta={
                <>
                  {p.client && <Badge variant="outline">Client: {p.client}</Badge>}
                  <span className="text-muted-foreground text-xs">
                    Created {formatDate(p.createdAt)}
                  </span>
                  <MockDataBadge />
                </>
              }
              actions={
                <>
                  {connectBlocked ? (
                    <GatedButton variant="outline" disabledReason={connectBlocked}>
                      <GitBranchPlusIcon /> Connect repository
                    </GatedButton>
                  ) : (
                    <Button variant="outline" asChild>
                      <Link href="/onboarding?step=repos">
                        <GitBranchPlusIcon /> Connect repository
                      </Link>
                    </Button>
                  )}
                  <GatedButton
                    disabledReason={
                      taskBlocked ?? (repositories.length ? null : "Connect a repository first.")
                    }
                    onClick={() => openNewTask({ repositoryId: repositories[0]?.id })}
                  >
                    <PlusIcon /> New task
                  </GatedButton>
                </>
              }
            />

            <Card className="flex flex-col items-stretch sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 border-b px-4 py-3 sm:border-r sm:border-b-0">
                <HealthScore score={p.healthScore} size={52} showLabel />
              </div>
              <dl className="grid flex-1 grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Repositories" value={p.repositories} />
                <Metric label="Open PRs" value={p.openPrs} />
                <Metric
                  label="Failing checks"
                  value={p.failingChecks}
                  tone={p.failingChecks ? "text-danger-foreground" : undefined}
                />
                <Metric
                  label="Agent sessions"
                  value={p.activeSessions}
                  tone={p.activeSessions ? "text-primary" : undefined}
                />
                <Metric
                  label="Open findings"
                  value={p.openFindings}
                  tone={p.openFindings ? "text-warning-foreground" : undefined}
                />
                <Metric
                  label="Verified this month"
                  value={p.verifiedThisMonth}
                  tone={p.verifiedThisMonth ? "text-success-foreground" : undefined}
                />
              </dl>
            </Card>

            <Tabs defaultValue="repositories">
              <TabsList>
                <TabsTrigger value="repositories">
                  Repositories <Count n={repositories.length} />
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  Tasks <Count n={tasks.length} />
                </TabsTrigger>
                <TabsTrigger value="prs">
                  Pull requests <Count n={openPrs.length} />
                </TabsTrigger>
                <TabsTrigger value="runs">
                  Runs <Count n={runs.length} />
                </TabsTrigger>
                <TabsTrigger value="findings">
                  Findings <Count n={findings.length} />
                </TabsTrigger>
              </TabsList>
              <TabsContent value="repositories">
                <RepositoryTable rows={repositories} hideProject />
              </TabsContent>
              <TabsContent value="tasks">
                <TaskList tasks={tasks} limit={30} />
              </TabsContent>
              <TabsContent value="prs">
                <PullRequestTable rows={pullRequests} pageSize={15} />
              </TabsContent>
              <TabsContent value="runs">
                <RunList runs={runs} limit={15} />
              </TabsContent>
              <TabsContent value="findings">
                <FindingList findings={findings} limit={30} showRepo />
              </TabsContent>
            </Tabs>
          </div>
        );
      }}
    </QueryState>
  );
}
