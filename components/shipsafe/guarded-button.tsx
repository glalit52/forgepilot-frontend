"use client";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A button that stays visible when the action isn't available and explains why
 * in a tooltip (and to screen readers via aria-describedby).
 */
export function GuardedButton({
  disabledReason,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { disabledReason?: string | null }) {
  const id = useId();
  if (!disabledReason) return <Button {...props}>{children}</Button>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="focus-visible:ring-ring/50 inline-flex rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
          aria-describedby={id}
        >
          <Button {...props} disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent id={id} className="max-w-64">
        {disabledReason}
      </TooltipContent>
    </Tooltip>
  );
}
