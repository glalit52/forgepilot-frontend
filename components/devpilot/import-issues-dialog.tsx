"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CircleDotIcon,
  DownloadIcon,
  ListChecksIcon,
  MessageSquareIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useAgents,
  useGithubIssues,
  useImportIssues,
  useRepositories,
  useSession,
} from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { PRIORITY_LABEL } from "@/lib/domain/labels";
import { formatRelative } from "@/lib/domain/format";
import { ImportIssuesInputSchema, type GithubIssueListItem } from "@/lib/schemas";
import { ErrorState } from "@/components/shared/states";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

const ALL = "__all";

function IssueRow({
  issue,
  checked,
  onToggle,
}: {
  issue: GithubIssueListItem;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = `iss-${issue.id}`;
  const imported = !!issue.importedTaskId;
  return (
    <li className={cn("flex flex-col gap-2 px-4 py-3", imported && "bg-muted/40")}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          className="mt-0.5"
          checked={checked}
          disabled={imported}
          onCheckedChange={(v) => onToggle(v === true)}
          aria-label={`Import #${issue.number} ${issue.title}`}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={id} className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <CircleDotIcon className="text-success size-3.5 shrink-0" aria-label="Open issue" />
            <span>{issue.title}</span>
            <span className="text-muted-foreground font-mono text-xs font-normal">
              #{issue.number}
            </span>
          </label>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-mono">{issue.repositoryName}</span>
            <span suppressHydrationWarning>
              · opened {formatRelative(issue.createdAt)} by {issue.authorUser?.name ?? issue.author}
            </span>
            {issue.comments > 0 && (
              <span className="inline-flex items-center gap-0.5">
                · <MessageSquareIcon className="size-3" aria-hidden /> {issue.comments}
              </span>
            )}
            {issue.labels.map((l) => (
              <Badge key={l} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                {l}
              </Badge>
            ))}
          </div>
        </div>
        {imported ? (
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="neutral">Imported</Badge>
            <Link
              href={`/app/devpilot/tasks/${issue.importedTaskId}`}
              className="text-primary text-xs hover:underline"
            >
              {issue.importedTaskId}
            </Link>
            {issue.importedTaskStatus && <TaskStatusBadge status={issue.importedTaskStatus} />}
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide preview" : "Preview"}
          </Button>
        )}
      </div>
      {open && !imported && (
        <div className="bg-muted/50 ml-7 flex flex-col gap-2 rounded-md p-3 text-xs">
          <p>
            Becomes a <b>{PRIORITY_LABEL[issue.suggestedPriority]}</b> priority task
            {issue.labels.length ? ` (from labels: ${issue.labels.join(", ")})` : ""} with these
            acceptance criteria:
          </p>
          <ul className="flex flex-col gap-1">
            {issue.suggestedCriteria.map((c) => (
              <li key={c} className="flex gap-1.5">
                <ListChecksIcon className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden /> {c}
              </li>
            ))}
          </ul>
          {!/- \[/.test(issue.body) && (
            <p className="text-warning-foreground">
              No checklist in the issue body, so generic criteria were used. Consider editing them
              on the task before launching.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** DP-010: import GitHub issues as DevPilot tasks, with a preview of what each becomes. */
export function ImportIssuesDialog({
  open,
  onOpenChange,
  repositoryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  repositoryId?: string;
}) {
  const [repo, setRepo] = useState(repositoryId ?? "");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agentId, setAgentId] = useState("");
  const [launch, setLaunch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repos = useRepositories();
  const agents = useAgents();
  const issues = useGithubIssues({ repositoryId: repo || undefined, q: q || undefined }, open);
  const importIssues = useImportIssues();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set());
    setError(null);
    setRepo(repositoryId ?? "");
  }, [open, repositoryId]);
  useEffect(() => {
    const first = agents.data?.find((a) => a.status === "active");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && !agentId && first) setAgentId(first.id);
  }, [open, agents.data, agentId]);

  const importable = useMemo(
    () => (issues.data ?? []).filter((i) => !i.importedTaskId),
    [issues.data],
  );
  const allChecked = importable.length > 0 && importable.every((i) => selected.has(i.id));

  const submit = () => {
    const parsed = ImportIssuesInputSchema.safeParse({ issueIds: [...selected], agentId, launch });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form");
    importIssues.mutate(parsed.data, {
      onSuccess: (r) => {
        onOpenChange(false);
        const n = r.tasks.length;
        toast.success(`Imported ${n} issue${n === 1 ? "" : "s"} as task${n === 1 ? "" : "s"}`, {
          description: launch
            ? "Agents are starting in isolated workspaces."
            : "Saved as drafts. Review the criteria, then launch.",
        });
        r.skipped.forEach((s) => toast.info(s));
        if (n === 1) router.push(`/app/devpilot/tasks/${r.tasks[0].id}`);
      },
      onError: (e) => toast.error("Import failed", { description: e.message }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import GitHub issues</DialogTitle>
          <DialogDescription>
            Each issue becomes a DevPilot task linked back to it. Checklists in the issue body
            become acceptance criteria and labels set the priority.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[14rem_1fr]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="imp-repo" className="text-muted-foreground text-xs font-normal">
              Repository
            </Label>
            <Select value={repo || ALL} onValueChange={(v) => setRepo(v === ALL ? "" : v)}>
              <SelectTrigger id="imp-repo" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All repositories</SelectItem>
                {(repos.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="imp-q" className="text-muted-foreground text-xs font-normal">
              Search issues
            </Label>
            <div className="relative">
              <SearchIcon
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="imp-q"
                type="search"
                className="h-8 pl-8"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Title, #number or label"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {selected.size} selected · {importable.length} importable
            {issues.data && issues.data.length > importable.length
              ? ` · ${issues.data.length - importable.length} already imported`
              : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!importable.length}
            onClick={() =>
              setSelected(allChecked ? new Set() : new Set(importable.map((i) => i.id)))
            }
          >
            {allChecked ? "Clear selection" : "Select all importable"}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
          {issues.error ? (
            <ErrorState error={issues.error} onRetry={() => issues.refetch()} className="m-3" />
          ) : issues.isPending ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !issues.data.length ? (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm">
              No open issues match. New issues appear here as soon as they&apos;re opened in GitHub.
            </p>
          ) : (
            <ul className="divide-y" aria-label="Open issues">
              {issues.data.map((i) => (
                <IssueRow
                  key={i.id}
                  issue={i}
                  checked={selected.has(i.id)}
                  onToggle={(v) => {
                    const s = new Set(selected);
                    if (v) s.add(i.id);
                    else s.delete(i.id);
                    setSelected(s);
                    setError(null);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
        {error && (
          <p role="alert" className="text-danger-foreground text-xs">
            {error}
          </p>
        )}
        <DialogFooter className="items-center gap-3 sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="imp-agent" className="text-sm font-normal">
                Agent
              </Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger id="imp-agent" size="sm" className="w-64">
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {(agents.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.status !== "active"}>
                      {a.name} · {a.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={launch} onCheckedChange={(v) => setLaunch(v === true)} /> Launch
              agents now
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!selected.size || importIssues.isPending}
            >
              <DownloadIcon />{" "}
              {importIssues.isPending
                ? "Importing…"
                : `Import ${selected.size || ""} ${selected.size === 1 ? "issue" : "issues"}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Header button that opens the import dialog; disabled with a reason for viewers. */
export function ImportIssuesButton({ repositoryId }: { repositoryId?: string }) {
  // ?import=1 (from the command palette) opens the dialog on arrival.
  const params = useSearchParams();
  const [open, setOpen] = useState(() => params.get("import") === "1");
  const { data } = useSession();
  const allowed = can(data?.role, "task.create");
  const button = (
    <Button variant="outline" onClick={() => setOpen(true)} disabled={!allowed}>
      <DownloadIcon /> Import issues
    </Button>
  );
  return (
    <>
      {allowed ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>Viewers can&apos;t create tasks.</TooltipContent>
        </Tooltip>
      )}
      <ImportIssuesDialog open={open} onOpenChange={setOpen} repositoryId={repositoryId} />
    </>
  );
}
