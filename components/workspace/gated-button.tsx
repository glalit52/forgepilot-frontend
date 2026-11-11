"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A button that explains itself when it can't be used. Disabled buttons don't
 * receive pointer events, so the tooltip hangs off a focusable wrapper and the
 * reason is also exposed to screen readers via aria-describedby.
 */
export function GatedButton({
  disabledReason,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { disabledReason?: string | null }) {
  const id = React.useId();
  const blocked = !!disabledReason;
  const button = (
    <Button
      {...props}
      disabled={disabled || blocked}
      aria-describedby={blocked ? id : props["aria-describedby"]}
    >
      {children}
    </Button>
  );
  if (!blocked) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="focus-visible:ring-ring/50 inline-flex rounded-md outline-none focus-visible:ring-[3px]"
        >
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
      <span id={id} className="sr-only">
        {disabledReason}
      </span>
    </Tooltip>
  );
}
