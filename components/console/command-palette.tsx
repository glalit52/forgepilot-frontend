"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppWindowIcon,
  Building2Icon,
  CheckSquareIcon,
  FolderGit2Icon,
  GaugeIcon,
  InboxIcon,
  ListTodoIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  UserCogIcon,
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
import { useSearch, useSession, useTasks } from "@/lib/api/hooks";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { isManager } from "@/lib/domain/roles";
import { useSwitchAndGoHome } from "@/components/shell/use-switch-persona";
import { useConsoleUI } from "./console-ui";

const ICON = { client: Building2Icon, application: AppWindowIcon, repository: FolderGit2Icon, task: ListTodoIcon };

/** Cmd/Ctrl+K: navigate to client/app/task, new task, launch agent, open approvals, switch role (dev). */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { openNewTask } = useConsoleUI();
  const { data: session } = useSession();
  const { data: results = [] } = useSearch("", open);
  const launchable = useTasks({ state: "plan_approved" });
  const { switchTo } = useSwitchAndGoHome();

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
        className="text-muted-foreground hidden h-9 w-64 justify-start gap-2 font-normal md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <SearchIcon /> Search or run a command…
        <kbd className="bg-muted ml-auto rounded px-1.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open command palette">
        <SearchIcon />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search clients, apps, tasks…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              value="new task create"
              onSelect={() => {
                setOpen(false);
                openNewTask();
              }}
            >
              <PlusIcon /> New task
            </CommandItem>
            <CommandItem value="open approvals review queue awaiting" onSelect={() => go("/console/tasks?state=awaiting_review")}>
              <CheckSquareIcon /> Open review queue (awaiting sign-off)
            </CommandItem>
            {(launchable.data ?? []).map((t) => (
              <CommandItem key={`launch-${t.id}`} value={`launch agent ${t.title} ${t.id}`} onSelect={() => go(`/console/tasks/${t.id}?launch=1`)}>
                <PlayIcon /> Launch agent on: {t.title}
                <span className="text-muted-foreground ml-auto text-xs">{t.organizationName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            <CommandItem value="go my queue" onSelect={() => go("/console")}><InboxIcon /> My queue</CommandItem>
            <CommandItem value="go tasks" onSelect={() => go("/console/tasks")}><ListTodoIcon /> Tasks</CommandItem>
            <CommandItem value="go clients" onSelect={() => go("/console/clients")}><Building2Icon /> Clients</CommandItem>
            <CommandItem value="go repositories" onSelect={() => go("/console/repositories")}><FolderGit2Icon /> Repositories</CommandItem>
            {session && isManager(session.user.role) && (
              <CommandItem value="go ops dashboard" onSelect={() => go("/console/ops")}><GaugeIcon /> Ops dashboard</CommandItem>
            )}
          </CommandGroup>
          <CommandSeparator />
          {(["client", "application", "repository", "task"] as const).map((kind) => {
            const rows = results.filter((r) => r.kind === kind);
            if (!rows.length) return null;
            const Icon = ICON[kind];
            return (
              <CommandGroup key={kind} heading={{ client: "Clients", application: "Applications", repository: "Repositories", task: "Tasks" }[kind]}>
                {rows.map((r) => (
                  <CommandItem key={`${kind}-${r.id}`} value={`${kind} ${r.title} ${r.subtitle} ${r.id}`} onSelect={() => go(r.href)}>
                    <Icon />
                    <span className="truncate">{r.title}</span>
                    <span className="text-muted-foreground ml-auto truncate text-xs">{r.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
          {process.env.NODE_ENV !== "production" && session && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Switch role (dev only)">
                {session.personas.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`switch role ${p.name} ${ROLE_LABEL[p.role]}`}
                    onSelect={() => {
                      setOpen(false);
                      switchTo(p.id);
                    }}
                  >
                    <UserCogIcon /> {p.name}
                    <span className="text-muted-foreground ml-auto text-xs">{ROLE_LABEL[p.role]}</span>
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
