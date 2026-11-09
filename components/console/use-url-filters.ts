"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters kept in the URL so views are shareable and deep-linkable
 * (e.g. the command palette opens `/console/tasks?state=awaiting_review`).
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>;

  const replace = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const set = (key: K, value: string) =>
    replace((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

  const clear = () => replace((next) => keys.forEach((k) => next.delete(k)));

  const active = keys.filter((k) => values[k]).length;
  return { values, set, clear, active };
}
