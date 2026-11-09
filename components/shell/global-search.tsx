"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppWindowIcon, Building2Icon, FolderGit2Icon, ListTodoIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/lib/api/hooks";
import type { SearchResult } from "@/lib/schemas";

const ICON = { client: Building2Icon, application: AppWindowIcon, repository: FolderGit2Icon, task: ListTodoIcon };
const GROUP = { client: "Clients", application: "Applications", repository: "Repositories", task: "Tasks" };

/** Portal global search (console uses the full command palette). Opens with "/" . */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { data = [] } = useSearch(q, open);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const groups = (Object.keys(GROUP) as SearchResult["kind"][]).map((k) => [k, data.filter((r) => r.kind === k)] as const);
  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground hidden h-9 w-64 justify-start gap-2 font-normal md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Search applications, repositories and work"
      >
        <SearchIcon /> Search…
        <kbd className="bg-muted ml-auto rounded px-1.5 font-mono text-[10px]">/</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Search">
        <SearchIcon />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search applications, repositories and work">
        <CommandInput placeholder="Search applications, repositories, tasks…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {groups.map(
            ([kind, rows]) =>
              rows.length > 0 && (
                <CommandGroup key={kind} heading={GROUP[kind]}>
                  {rows.map((r) => {
                    const Icon = ICON[r.kind];
                    return (
                      <CommandItem
                        key={`${r.kind}-${r.id}`}
                        value={`${r.title} ${r.subtitle} ${r.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(r.href);
                        }}
                      >
                        <Icon />
                        <span className="truncate">{r.title}</span>
                        <span className="text-muted-foreground ml-auto truncate text-xs">{r.subtitle}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ),
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
