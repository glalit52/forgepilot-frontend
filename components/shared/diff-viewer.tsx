"use client";
import { useMemo, useState } from "react";
import { FileCodeIcon, SparklesIcon } from "lucide-react";
import type { DiffFile, DiffLine } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "./states";

function UnifiedRows({ lines }: { lines: DiffLine[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <tr
          key={i}
          className={cn(
            l.kind === "add" && "bg-success-soft/60",
            l.kind === "del" && "bg-danger-soft/60",
            l.kind === "hunk" && "bg-info-soft/50 text-info-foreground",
          )}
        >
          <td className="text-muted-foreground w-10 border-r px-2 text-right select-none">{l.oldNo ?? ""}</td>
          <td className="text-muted-foreground w-10 border-r px-2 text-right select-none">{l.newNo ?? ""}</td>
          <td className="px-3 whitespace-pre">
            <span className="select-none" aria-hidden>
              {l.kind === "add" ? "+ " : l.kind === "del" ? "− " : "  "}
            </span>
            <span className="sr-only">{l.kind === "add" ? "added: " : l.kind === "del" ? "removed: " : ""}</span>
            {l.text}
          </td>
        </tr>
      ))}
    </>
  );
}

function SplitRows({ lines }: { lines: DiffLine[] }) {
  const rows: [DiffLine | null, DiffLine | null][] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.kind === "context" || l.kind === "hunk") {
      rows.push([l, l]);
      i++;
      continue;
    }
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].kind === "del") dels.push(lines[i++]);
    while (i < lines.length && lines[i].kind === "add") adds.push(lines[i++]);
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) rows.push([dels[k] ?? null, adds[k] ?? null]);
  }
  return (
    <>
      {rows.map(([a, b], idx) => (
        <tr key={idx} className={cn(a?.kind === "hunk" && "bg-info-soft/50 text-info-foreground")}>
          <td className="text-muted-foreground w-10 border-r px-2 text-right select-none">{a?.oldNo ?? ""}</td>
          <td className={cn("w-1/2 border-r px-3 whitespace-pre", a?.kind === "del" && "bg-danger-soft/60")}>{a?.text ?? ""}</td>
          <td className="text-muted-foreground w-10 border-r px-2 text-right select-none">{b?.newNo ?? ""}</td>
          <td className={cn("w-1/2 px-3 whitespace-pre", b?.kind === "add" && "bg-success-soft/60")}>{a?.kind === "hunk" ? "" : (b?.text ?? "")}</td>
        </tr>
      ))}
    </>
  );
}

/** Unified/split diff with a file tree. */
export function DiffViewer({ files, className }: { files: DiffFile[]; className?: string }) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const [selected, setSelected] = useState<string | null>(null);
  const shown = useMemo(() => (selected ? files.filter((f) => f.path === selected) : files), [files, selected]);
  if (!files.length)
    return <EmptyState icon={FileCodeIcon} title="No changes yet" description="The diff appears after the agent's first run." />;
  const totals = files.reduce((s, f) => ({ add: s.add + f.additions, del: s.del + f.deletions }), { add: 0, del: 0 });
  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row", className)}>
      <nav aria-label="Changed files" className="lg:w-64 lg:shrink-0">
        <div className="text-muted-foreground mb-2 text-xs">
          {files.length} files · <span className="text-success-foreground">+{totals.add}</span>{" "}
          <span className="text-danger-foreground">−{totals.del}</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          <li>
            <button
              onClick={() => setSelected(null)}
              className={cn("hover:bg-accent w-full rounded px-2 py-1 text-left text-xs", !selected && "bg-accent font-medium")}
            >
              All files
            </button>
          </li>
          {files.map((f) => (
            <li key={f.path}>
              <button
                onClick={() => setSelected(f.path)}
                className={cn(
                  "hover:bg-accent flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-xs",
                  selected === f.path && "bg-accent font-medium",
                )}
                title={f.path}
              >
                {f.aiAuthored && <SparklesIcon className="text-primary size-3 shrink-0" aria-label="AI-authored" />}
                <span className="truncate">{f.path.split("/").pop()}</span>
                <span className="text-success-foreground ml-auto">+{f.additions}</span>
                <span className="text-danger-foreground">−{f.deletions}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex justify-end gap-1" role="group" aria-label="Diff layout">
          <Button size="sm" variant={mode === "unified" ? "secondary" : "ghost"} onClick={() => setMode("unified")} aria-pressed={mode === "unified"}>
            Unified
          </Button>
          <Button size="sm" variant={mode === "split" ? "secondary" : "ghost"} onClick={() => setMode("split")} aria-pressed={mode === "split"}>
            Split
          </Button>
        </div>
        {shown.map((f) => (
          <section key={f.path} className="overflow-hidden rounded-md border" aria-label={`Diff of ${f.path}`}>
            <header className="bg-muted/50 flex items-center gap-2 border-b px-3 py-2 font-mono text-xs">
              <span className="truncate">{f.path}</span>
              <span className="text-muted-foreground">{f.status}</span>
              {f.aiAuthored && (
                <span className="bg-accent text-accent-foreground ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-sans">
                  <SparklesIcon className="size-3" aria-hidden /> AI-authored
                </span>
              )}
            </header>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs leading-5">
                <tbody>{mode === "unified" ? <UnifiedRows lines={f.lines} /> : <SplitRows lines={f.lines} />}</tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
