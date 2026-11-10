"use client";
import { useId, useState } from "react";
import { LockIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** The API's own message (403/409/402…) is the most useful copy we can show. */
export function errorMessage(e: unknown, fallback = "Something went wrong") {
  return e instanceof Error && e.message ? e.message : fallback;
}
export function errorStatus(e: unknown) {
  return e instanceof ApiError ? e.status : undefined;
}

/** Calm explanation of why something is read-only or unavailable. */
export function PermissionNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        className,
      )}
    >
      <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Wraps a (possibly disabled) control with a tooltip that explains why it is disabled. */
export function Guarded({
  reason,
  children,
}: {
  /** When set, the control is considered disabled and this explains why. */
  reason?: string | null;
  children: React.ReactElement;
}) {
  if (!reason) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="text-danger-foreground text-xs" role="alert">
      {message}
    </p>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Editable list of short strings (paths, hosts, check names). */
export function ListEditor({
  label,
  description,
  values,
  onChange,
  placeholder,
  disabled,
  mono = true,
}: {
  label: string;
  description?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  mono?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setErr(`“${v}” is already in the list`);
      return;
    }
    onChange([...values, v]);
    setDraft("");
    setErr(null);
  };
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Current ${label.toLowerCase()}`}>
          {values.map((v) => (
            <li
              key={v}
              className={cn(
                "bg-muted inline-flex items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2 text-xs",
                mono && "font-mono",
              )}
            >
              {v}
              {!disabled && (
                <button
                  type="button"
                  className="hover:bg-background focus-visible:ring-ring/50 rounded p-0.5 outline-none focus-visible:ring-2"
                  aria-label={`Remove ${v}`}
                  onClick={() => onChange(values.filter((x) => x !== v))}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs italic">None configured.</p>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={draft}
            placeholder={placeholder}
            className={cn("h-8", mono && "font-mono text-xs")}
            onChange={(e) => {
              setDraft(e.target.value);
              setErr(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
            <PlusIcon /> Add
          </Button>
        </div>
      )}
      <FieldError message={err} />
    </div>
  );
}

/** Two-column settings row: label/description left, control right. */
export function SettingRow({
  title,
  description,
  children,
  htmlFor,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-6">
      <div>
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {title}
          </label>
        ) : (
          <p className="text-sm font-medium">{title}</p>
        )}
        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
