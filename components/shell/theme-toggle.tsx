"use client";
import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is unknown during server render; use a neutral label until hydrated.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const label = !mounted ? "Toggle theme" : dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={() => setTheme(dark ? "light" : "dark")}>
          <SunIcon className="hidden dark:block" />
          <MoonIcon className="dark:hidden" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
