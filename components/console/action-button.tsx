"use client";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = React.ComponentProps<typeof Button> & {
  /** When set, the button is disabled and the reason shows in a tooltip (also on keyboard focus). */
  disabledReason?: string;
};

/**
 * Button that explains itself when disabled. Disabled buttons swallow pointer
 * events, so the tooltip hangs off a focusable wrapper instead.
 */
export const ActionButton = forwardRef<HTMLButtonElement, Props>(function ActionButton(
  { disabledReason, disabled, children, ...props },
  ref,
) {
  const isDisabled = disabled || !!disabledReason;
  if (!disabledReason) {
    return (
      <Button ref={ref} disabled={isDisabled} {...props}>
        {children}
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="focus-visible:ring-ring/50 inline-flex rounded-md outline-none focus-visible:ring-[3px]"
        >
          <Button ref={ref} disabled aria-disabled="true" {...props}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
});
