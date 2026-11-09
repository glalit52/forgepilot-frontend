"use client";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filters live in the URL so views are shareable and survive reloads. */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>;
  const set = useCallback(
    (patch: Partial<Record<string, string | null>>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, router, pathname],
  );
  return [values, set] as const;
}
