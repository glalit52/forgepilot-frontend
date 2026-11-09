"use client";
import { useState } from "react";
import Link from "next/link";
import {
  FolderKanbanIcon,
  GitBranchPlusIcon,
  LayoutGridIcon,
  PlusIcon,
  TableIcon,
} from "lucide-react";
import { useProjects, useSession } from "@/lib/api/hooks";
import type { ProjectSummary } from "@/lib/schemas";
import { can } from "@/lib/domain/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { HealthPill, HealthScore } from "@/components/shared/health-score";
import { MockDataBadge } from "@/components/shared/misc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { GatedButton } from "@/components/workspace/gated-button";
import { NewProjectDialog } from "@/components/workspace/new-project-dialog";
import { ProjectSwatch } from "@/components/workspace/project-color";
import { cn } from "@/lib/utils";

const ADMIN_ONLY = "Only owners and admins can add projects and repositories.";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "success" | "accent";
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          value > 0 && tone === "danger" && "text-danger-foreground",
          value > 0 && tone === "warning" && "text-warning-foreground",
          value > 0 && tone === "success" && "text-success-foreground",
          value > 0 && tone === "accent" && "text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectSummary }) {
  return (
    <Link
      href={`/app/projects/${p.id}`}
      className="group focus-visible:ring-ring/50 rounded-lg outline-none focus-visible:ring-[3px]"
    >
      <Card className="group-hover:border-primary/40 flex h-full flex-col gap-4 p-5 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2">
              <ProjectSwatch color={p.color} />
              <span className="truncate font-semibold group-hover:underline">{p.name}</span>
            </span>
            {p.client && (
              <Badge variant="outline" className="w-fit">
                Client: {p.client}
              </Badge>
            )}
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {p.description || "No description"}
            </p>
          </div>
          <HealthScore score={p.healthScore} size={48} />
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-x-3 gap-y-3 border-t pt-4">
          <Stat label="Repositories" value={p.repositories} />
          <Stat label="Open PRs" value={p.openPrs} />
          <Stat label="Failing checks" value={p.failingChecks} tone="danger" />
          <Stat label="Agent sessions" value={p.activeSessions} tone="accent" />
          <Stat label="Open findings" value={p.openFindings} tone="warning" />
          <Stat label="Verified (month)" value={p.verifiedThisMonth} tone="success" />
        </dl>
      </Card>
    </Link>
  );
}

export default function ProjectsPage() {
  const projects = useProjects();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");
  const blocked = session.data && !can(session.data.role, "repo.connect") ? ADMIN_ONLY : null;

  const actions = (
    <>
      {blocked ? (
        <GatedButton variant="outline" disabledReason={blocked}>
          <GitBranchPlusIcon /> Connect repository
        </GatedButton>
      ) : (
        <Button variant="outline" asChild>
          <Link href="/onboarding?step=repos">
            <GitBranchPlusIcon /> Connect repository
          </Link>
        </Button>
      )}
      <GatedButton onClick={() => setOpen(true)} disabledReason={blocked}>
        <PlusIcon /> New project
      </GatedButton>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description="Each project groups the repositories behind one product: their agents, verification and maintenance in one place."
        meta={<MockDataBadge />}
        actions={actions}
      />

      {projects.isPending ? (
        <div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : projects.error || !projects.data ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : !projects.data.length ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects yet"
          description="Create a project, then connect the GitHub repositories that belong to it."
          action={
            <GatedButton onClick={() => setOpen(true)} disabledReason={blocked}>
              <PlusIcon /> New project
            </GatedButton>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm tabular-nums">
              {projects.data.length} project{projects.data.length === 1 ? "" : "s"} ·{" "}
              {projects.data.reduce((s, p) => s + p.repositories, 0)} repositories
            </p>
            <div className="flex rounded-md border p-0.5" role="group" aria-label="View">
              <Button
                variant={view === "cards" ? "secondary" : "ghost"}
                size="icon-sm"
                className="size-7"
                aria-label="Card view"
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                <LayoutGridIcon />
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="icon-sm"
                className="size-7"
                aria-label="Table view"
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
              >
                <TableIcon />
              </Button>
            </div>
          </div>
          {view === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.data.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <DataTable
              rows={projects.data}
              getRowId={(p) => p.id}
              rowHref={(p) => `/app/projects/${p.id}`}
              caption="Projects"
              initialSort={{ id: "name", dir: "asc" }}
              columns={[
                {
                  id: "name",
                  header: "Project",
                  sortValue: (p) => p.name,
                  cell: (p) => (
                    <Link
                      href={`/app/projects/${p.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <ProjectSwatch color={p.color} /> {p.name}
                    </Link>
                  ),
                },
                {
                  id: "health",
                  header: "Health",
                  sortValue: (p) => p.healthScore ?? -1,
                  cell: (p) => <HealthPill score={p.healthScore} />,
                },
                {
                  id: "repos",
                  header: "Repos",
                  align: "right",
                  sortValue: (p) => p.repositories,
                  cell: (p) => p.repositories,
                },
                {
                  id: "prs",
                  header: "Open PRs",
                  align: "right",
                  sortValue: (p) => p.openPrs,
                  cell: (p) => p.openPrs,
                },
                {
                  id: "failing",
                  header: "Failing checks",
                  align: "right",
                  sortValue: (p) => p.failingChecks,
                  cell: (p) => (
                    <span
                      className={cn(p.failingChecks > 0 && "text-danger-foreground font-medium")}
                    >
                      {p.failingChecks}
                    </span>
                  ),
                },
                {
                  id: "sessions",
                  header: "Sessions",
                  align: "right",
                  hideBelow: "lg",
                  sortValue: (p) => p.activeSessions,
                  cell: (p) => p.activeSessions,
                },
                {
                  id: "findings",
                  header: "Findings",
                  align: "right",
                  hideBelow: "lg",
                  sortValue: (p) => p.openFindings,
                  cell: (p) => p.openFindings,
                },
                {
                  id: "verified",
                  header: "Verified (month)",
                  align: "right",
                  sortValue: (p) => p.verifiedThisMonth,
                  cell: (p) => p.verifiedThisMonth,
                },
              ]}
            />
          )}
        </>
      )}

      <NewProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
