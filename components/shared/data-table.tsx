"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./states";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number | null;
  className?: string;
  align?: "left" | "right";
  /** Hide below this breakpoint to keep tables usable at 1024px and on phones. */
  hideBelow?: "md" | "lg" | "xl";
}

type SortState = { id: string; dir: "asc" | "desc" } | null;

/**
 * Sortable, paginated table. Rows navigate on click/Enter when `rowHref` is set.
 * Paginates beyond `pageSize` rows (non-functional spec: >100 rows paginate).
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  rowHref,
  pageSize = 25,
  initialSort = null,
  selectable = false,
  selected,
  onSelectedChange,
  isRowSelectable,
  empty,
  caption,
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;
  pageSize?: number;
  initialSort?: SortState;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  isRowSelectable?: (row: T) => boolean;
  empty?: React.ReactNode;
  caption: string;
  className?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === vb) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : 1) * dir;
    });
  }, [rows, columns, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (id: string) =>
    setSort((s) =>
      s?.id !== id ? { id, dir: "asc" } : s.dir === "asc" ? { id, dir: "desc" } : null,
    );

  const hide = (c: Column<T>) =>
    c.hideBelow === "md"
      ? "hidden md:table-cell"
      : c.hideBelow === "lg"
        ? "hidden lg:table-cell"
        : c.hideBelow === "xl"
          ? "hidden xl:table-cell"
          : "";

  const selectableRows = selectable ? visible.filter((r) => isRowSelectable?.(r) ?? true) : [];
  const allChecked =
    selectableRows.length > 0 && selectableRows.every((r) => selected?.has(getRowId(r)));

  if (!rows.length) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="rounded-lg border">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={allChecked}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      selectableRows.forEach((r) =>
                        v ? next.add(getRowId(r)) : next.delete(getRowId(r)),
                      );
                      onSelectedChange?.(next);
                    }}
                  />
                </TableHead>
              )}
              {columns.map((c) => {
                const active = sort?.id === c.id;
                const Icon = !active
                  ? ArrowUpDownIcon
                  : sort.dir === "asc"
                    ? ArrowUpIcon
                    : ArrowDownIcon;
                return (
                  <TableHead
                    key={c.id}
                    className={cn(c.align === "right" && "text-right", hide(c), c.className)}
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.id)}
                        className={cn(
                          "hover:text-foreground inline-flex items-center gap-1 rounded",
                          active && "text-foreground",
                        )}
                      >
                        {c.header}
                        <Icon className="size-3 opacity-60" aria-hidden />
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const id = getRowId(row);
              const href = rowHref?.(row);
              const canSelect = isRowSelectable?.(row) ?? true;
              return (
                <TableRow
                  key={id}
                  data-state={selected?.has(id) ? "selected" : undefined}
                  className={cn(href && "cursor-pointer")}
                  onClick={(e) => {
                    if (!href) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("a,button,[role=checkbox],input,label")) return;
                    router.push(href);
                  }}
                  onKeyDown={(e) => {
                    if (href && e.key === "Enter" && e.target === e.currentTarget)
                      router.push(href);
                  }}
                  tabIndex={href ? 0 : undefined}
                  aria-label={href ? `Open ${id}` : undefined}
                >
                  {selectable && (
                    <TableCell className="w-10">
                      <Checkbox
                        aria-label={`Select ${id}`}
                        disabled={!canSelect}
                        checked={selected?.has(id) ?? false}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(id);
                          else next.delete(id);
                          onSelectedChange?.(next);
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell
                      key={c.id}
                      className={cn(
                        c.align === "right" && "text-right tabular-nums",
                        hide(c),
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {pages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </Button>
            <span>
              Page {current + 1} of {pages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small filter bar container + a labelled select helper. */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="search" className={cn("flex flex-wrap items-end gap-2", className)}>
      {children}
    </div>
  );
}
