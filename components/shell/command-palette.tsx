"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BugIcon,
  CheckSquareIcon,
  FlaskConicalIcon,
  FolderKanbanIcon,
  GitPullRequestIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PlayIcon,
  PlusIcon,
  RadarIcon,
  SearchIcon,
  ShieldAlertIcon,
  TerminalSquareIcon,
  BuildingIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSearch, useSession } from "@/lib/api/hooks";
import { NAV } from "@/lib/nav";
import type { SearchResult } from "@/lib/schemas";
import { useAppUI } from "@/components/app/app-ui";
import { useSignInAndGo } from "./use-sign-in";

const ICON: Record<SearchResult["kind"], React.ComponentType> = {
  project: FolderKanbanIcon,
  repository: FolderKanbanIcon,
  task: ListChecksIcon,
  pull_request: GitPullRequestIcon,
  bug: BugIcon,
  finding: ShieldAlertIcon,
  session: TerminalSquareIcon,
};
const GROUP: Record<SearchResult["kind"], string> = {
  project: "Projects",
  repository: "Repositories",
  task: "Tasks",
  pull_request: "Pull requests",
  bug: "Bugs",
  finding: "Findings",
  session: "Sessions",
};

/** Global Cmd/Ctrl+K: navigate anywhere, create tasks, run tests, switch workspace. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { openNewTask } = useAppUI();
  const { data: session } = useSession();
  const { data: results = [] } = useSearch(q, open);
  const { switchWorkspace } = useSignInAndGo();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground hidden h-9 w-72 justify-start gap-2 font-normal md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <SearchIcon /> Search or jump to…
        <kbd className="bg-muted ml-auto rounded px-1.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <SearchIcon />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search tasks, PRs, repositories, bugs… or type a command"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              value="new task create delegate agent"
              onSelect={() => {
                setOpen(false);
                openNewTask();
              }}
            >
              <PlusIcon /> New DevPilot task
            </CommandItem>
            <CommandItem
              value="run tests verification shipsafe"
              onSelect={() => go("/app/shipsafe/runs?new=1")}
            >
              <PlayIcon /> Run ShipSafe verification
            </CommandItem>
            <CommandItem value="approvals pending review" onSelect={() => go("/app/approvals")}>
              <CheckSquareIcon /> Open approval centre
            </CommandItem>
            <CommandItem
              value="connect repository github"
              onSelect={() => go("/onboarding?step=repos")}
            >
              <FlaskConicalIcon /> Connect a repository
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            {NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))).map((i) => (
              <CommandItem
                key={i.href}
                value={`go ${i.group ?? ""} ${i.label}`}
                onSelect={() => go(i.href)}
              >
                {i.href === "/app" ? (
                  <LayoutDashboardIcon />
                ) : i.href.includes("shipsafe") ? (
                  <RadarIcon />
                ) : (
                  <i.icon />
                )}
                {i.group ? `${i.group} · ` : ""}
                {i.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {(Object.keys(GROUP) as SearchResult["kind"][]).map((kind) => {
            const rows = results.filter((r) => r.kind === kind).slice(0, 8);
            if (!rows.length) return null;
            const Icon = ICON[kind];
            return (
              <CommandGroup key={kind} heading={GROUP[kind]}>
                {rows.map((r) => (
                  <CommandItem
                    key={`${kind}-${r.id}`}
                    value={`${kind} ${r.title} ${r.subtitle} ${r.id}`}
                    onSelect={() => go(r.href)}
                  >
                    <Icon />
                    <span className="truncate">{r.title}</span>
                    <span className="text-muted-foreground ml-auto truncate text-xs">
                      {r.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
          {session && session.workspaces.length > 1 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Switch workspace">
                {session.workspaces
                  .filter((w) => w.organization.id !== session.workspace.id)
                  .map((w) => (
                    <CommandItem
                      key={w.organization.id}
                      value={`switch workspace ${w.organization.name}`}
                      onSelect={() => {
                        setOpen(false);
                        switchWorkspace(w.organization.id);
                      }}
                    >
                      <BuildingIcon /> {w.organization.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
