import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { CommandPalette } from "@/components/console/command-palette";
import { ConsoleUIProvider } from "@/components/console/console-ui";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ConsoleUIProvider>
        <AppShell area="console" topbarExtra={<CommandPalette />}>
          {children}
        </AppShell>
      </ConsoleUIProvider>
    </Suspense>
  );
}
