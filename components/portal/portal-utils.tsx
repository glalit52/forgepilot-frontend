"use client";
import { useCallback, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, FlaskConicalIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/api/hooks";
import { canApprove, canManageTeam } from "@/lib/domain/roles";
import type { Role } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** Current portal role and the permissions derived from it. */
export function usePortalRole(): {
  role: Role | null;
  canApprove: boolean;
  canManageTeam: boolean;
  userName: string | null;
} {
  const { data } = useSession();
  const role = data?.user.role ?? null;
  return {
    role,
    canApprove: role ? canApprove(role) : false,
    canManageTeam: role ? canManageTeam(role) : false,
    userName: data?.user.name ?? null,
  };
}

/**
 * Read/write query-string params (filters, tabs) so views are shareable and
 * survive reloads. Empty values are removed from the URL.
 */
export function useUrlParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = useCallback((key: string) => params.get(key) ?? "", [params]);
  const set = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router, pathname],
  );
  return { get, set, params };
}

/** Trigger a browser download of an in-memory file. */
export function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Inline note for viewer roles explaining why actions are missing. */
export function ReadOnlyNote({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-muted-foreground inline-flex items-center gap-1.5 text-xs", className)}>
      <EyeIcon className="size-3.5" aria-hidden />
      {children ?? "Read-only access — your role can view changes but not approve them."}
    </p>
  );
}

/** Label for actions that are placeholders in Phase 1 (e.g. PDF export). */
export function StubLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "border-warning/40 bg-warning-soft text-warning-foreground inline-flex items-center gap-1 rounded px-1 py-px text-[10px] font-medium uppercase",
        className,
      )}
    >
      <FlaskConicalIcon className="size-2.5" aria-hidden />
      Stub
    </span>
  );
}

/** Small label/value pair used in detail headers. */
export function Meta({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

export function formatWaiting(hours: number) {
  if (hours < 1) return "under 1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Labelled search input. Keeps its own text so typing never lags behind URL updates. */
export function SearchField({
  label = "Search",
  value,
  onChange,
  placeholder,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  // Follow an external reset (e.g. "Clear filters") without fighting in-flight typing.
  if (value !== prev) {
    setPrev(value);
    if (value === "") setText("");
  }
  return (
    <div className={cn("flex min-w-56 flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <div className="relative">
        <SearchIcon
          className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id={id}
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="h-8 pl-8"
        />
      </div>
    </div>
  );
}

/** Labelled native date input (keyboard and screen-reader friendly). */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-40"
      />
    </div>
  );
}
