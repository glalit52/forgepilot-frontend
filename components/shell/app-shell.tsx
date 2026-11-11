"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircleIcon, MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { MockDataBadge } from "@/components/shared/misc";
import { AppUIProvider } from "@/components/app/app-ui";
import { Breadcrumbs, BreadcrumbProvider } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { ContextPanelProvider } from "./context-panel";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { LiveIndicator, LiveUpdates } from "./live-updates";
import { Sidebar, SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

const COLLAPSE_KEY = "fp.sidebar.collapsed";

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  return [collapsed, toggle] as const;
}

/** Client-side session guard (proxy.ts does the optimistic redirect). */
function SessionGate({ children }: { children: React.ReactNode }) {
  const { data, error, isPending } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) router.replace("/login");
    if (error instanceof ApiError && error.status === 403) router.replace("/onboarding");
  }, [error, router]);
  if (isPending || !data)
    return (
      <div
        className="text-muted-foreground flex h-64 items-center justify-center text-sm"
        aria-busy="true"
      >
        Loading your workspace…
      </div>
    );
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, toggle] = useCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data } = useSession();
  return (
    <BreadcrumbProvider>
      <ContextPanelProvider>
        <AppUIProvider>
          <LiveUpdates />
          <div className="flex min-h-screen">
            <Sidebar collapsed={collapsed} onToggle={toggle} />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="bg-background/85 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-4 backdrop-blur lg:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation"
                >
                  <MenuIcon />
                </Button>
                <div className="min-w-0 flex-1">
                  <Breadcrumbs workspace={data?.workspace.name} />
                </div>
                <div className="hidden xl:block">
                  <MockDataBadge />
                </div>
                <LiveIndicator />
                <CommandPalette />
                <NotificationsBell />
                <Button variant="ghost" size="icon" asChild aria-label="Docs">
                  <a href="/docs">
                    <HelpCircleIcon />
                  </a>
                </Button>
                <ThemeToggle />
                <div className="lg:hidden">
                  <UserMenu compact />
                </div>
              </header>
              <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8">
                <SessionGate>{children}</SessionGate>
              </main>
            </div>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-72 gap-3 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Logo />
              <WorkspaceSwitcher />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </AppUIProvider>
      </ContextPanelProvider>
    </BreadcrumbProvider>
  );
}
