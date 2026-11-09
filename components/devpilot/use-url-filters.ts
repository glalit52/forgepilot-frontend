"use client";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Read and write a set of filter keys in the URL (replace, no scroll) so views are shareable. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const values = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>,
    [keys, params],
  );
  const set = useCallback(
    (patch: Partial<Record<K | string, string | null>>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v as string) : next.delete(k)));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return [values, set] as const;
}
