import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppShell area="portal">{children}</AppShell>
    </Suspense>
  );
}
