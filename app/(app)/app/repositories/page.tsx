"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { GitBranchPlusIcon, SearchIcon } from "lucide-react";
import { useRepositories, useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, QueryState, TableSkeleton } from "@/components/shared/states";
import { GatedButton } from "@/components/workspace/gated-button";
import { RepositoryTable } from "@/components/workspace/lists";

export default function RepositoriesPage() {
  const repos = useRepositories();
  const session = useSession();
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const blocked =
    session.data && !can(session.data.role, "repo.connect")
      ? "Only owners and admins can connect repositories."
      : null;

  const projects = useMemo(() => {
    const m = new Map<string, string>();
    repos.data?.forEach((r) => m.set(r.projectId, r.projectName));
    return [...m].map(([value, label]) => ({ value, label }));
  }, [repos.data]);

  const connect = blocked ? (
    <GatedButton disabledReason={blocked}>
      <GitBranchPlusIcon /> Connect repository
    </GatedButton>
  ) : (
    <Button asChild>
      <Link href="/onboarding?step=repos">
        <GitBranchPlusIcon /> Connect repository
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        description="Every connected GitHub repository, with its health, latest verification and open maintenance work."
        actions={connect}
      />
      <QueryState
        query={repos}
        loading={<TableSkeleton />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={GitBranchPlusIcon}
            title="No repositories connected"
            description="Install the GitHub App on the repositories you pick. Nothing is read until you choose."
            action={connect}
          />
        }
      >
        {(data) => {
          const needle = q.trim().toLowerCase();
          const rows = data.filter(
            (r) =>
              (!project || r.projectId === project) &&
              (!needle ||
                r.fullName.toLowerCase().includes(needle) ||
                r.languages.some((l) => l.includes(needle))),
          );
          return (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative w-full max-w-xs">
                  <SearchIcon
                    className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
                    aria-hidden
                  />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filter by name or language"
                    aria-label="Filter repositories"
                    className="pl-8"
                  />
                </div>
                {projects.length > 1 && (
                  <FilterSelect
                    label="Project"
                    value={project}
                    onChange={setProject}
                    options={projects}
                    allLabel="All projects"
                  />
                )}
              </div>
              <RepositoryTable
                rows={rows}
                empty={
                  <EmptyState
                    title="No matching repositories"
                    description="Try a different name or clear the filters."
                  />
                }
              />
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
