"use client";
import { useId } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Labelled multi-select filter. Value is a comma-separated list; "" = all. */
export function MultiFilter({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = useId();
  const selected = new Set(value.split(",").filter(Boolean));
  const summary =
    selected.size === 0
      ? "All"
      : selected.size === 1
        ? (options.find((o) => selected.has(o.value))?.label ?? "1 selected")
        : `${selected.size} selected`;
  const toggle = (v: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(v);
    else next.delete(v);
    onChange(
      options
        .filter((o) => next.has(o.value))
        .map((o) => o.value)
        .join(","),
    );
  };
  return (
    <div className={cn("flex min-w-36 flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            size="sm"
            className="justify-between font-normal"
            aria-label={`${label}: ${summary}`}
          >
            <span className="truncate">{summary}</span>
            <ChevronDownIcon className="opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          <div role="group" aria-label={label} className="flex flex-col">
            {options.map((o) => (
              <label
                key={o.value}
                className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <Checkbox
                  checked={selected.has(o.value)}
                  onCheckedChange={(c) => toggle(o.value, c === true)}
                />
                {o.label}
              </label>
            ))}
          </div>
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => onChange("")}>
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
