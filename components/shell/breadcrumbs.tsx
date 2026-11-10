"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { SEGMENT_LABEL } from "@/lib/nav";

type Labels = Record<string, string>;
const Ctx = createContext<{ labels: Labels; setLabel: (seg: string, label: string) => void }>({
  labels: {},
  setLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Labels>({});
  const value = useMemo(
    () => ({
      labels,
      setLabel: (seg: string, label: string) =>
        setLabels((l) => (l[seg] === label ? l : { ...l, [seg]: label })),
    }),
    [labels],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Detail pages call this so the breadcrumb shows a name instead of an id. */
export function useBreadcrumbLabel(segment: string, label: string | undefined) {
  const { setLabel } = useContext(Ctx);
  useEffect(() => {
    if (label) setLabel(segment, label);
  }, [segment, label, setLabel]);
}

export function Breadcrumbs({ workspace }: { workspace?: string }) {
  const pathname = usePathname();
  const { labels } = useContext(Ctx);
  const segs = pathname.split("/").filter(Boolean);
  const crumbs = segs.map((s, i) => ({
    href: "/" + segs.slice(0, i + 1).join("/"),
    label: labels[s] ?? SEGMENT_LABEL[s] ?? s,
  }));
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="text-muted-foreground flex min-w-0 items-center gap-1 text-sm">
        {workspace && (
          <li className="hidden shrink-0 items-center gap-1 sm:flex">
            <span className="max-w-40 truncate">{workspace}</span>
            <ChevronRightIcon className="size-3.5" aria-hidden />
          </li>
        )}
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="text-foreground truncate font-medium">
                {c.label}
              </span>
            ) : (
              <Link href={c.href} className="hover:text-foreground truncate">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
