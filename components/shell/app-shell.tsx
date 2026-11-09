"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MenuIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/lib/api/hooks";
import { areaForRole, canAccessPath, homeForRole, type Area } from "@/lib/domain/roles";
import { MockDataBadge } from "@/components/shared/misc";
import { Breadcrumbs, BreadcrumbProvider } from "./breadcrumbs";
import { ContextPanelProvider } from "./context-panel";
import { GlobalSearch } from "./global-search";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { Sidebar, SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

const COLLAPSE_KEY = "fp.sidebar.collapsed";

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // Restore a per-viewer preference; harmless if storage is unavailable.
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

/** Client-side guard (the proxy does the same on navigation). */
function RoleGuard({ area, children }: { area: Area; children: React.ReactNode }) {
  const { data, error, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const denied = params.get("denied");
  const allowed =
    !!data && canAccessPath(data.user.role, pathname) && areaForRole(data.user.role) === area;
  useEffect(() => {
    if (error) router.replace("/login");
    else if (data && !allowed)
      router.replace(`${homeForRole(data.user.role)}?denied=${encodeURIComponent(pathname)}`);
  }, [data, error, allowed, router, pathname]);
  useEffect(() => {
    if (denied)
      toast.warning("You don't have access to that page", {
        description: `${denied} isn't available for your role.`,
        id: "denied",
      });
  }, [denied]);
  if (isPending || !allowed)
    return (
      <div
        className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm"
        aria-busy="true"
      >
        <ShieldAlertIcon className="size-4" aria-hidden /> Checking access…
      </div>
    );
  return <>{children}</>;
}

export function AppShell({
  area,
  children,
  topbarExtra,
}: {
  area: Area;
  children: React.ReactNode;
  topbarExtra?: React.ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <BreadcrumbProvider>
      <ContextPanelProvider>
        <div className="flex min-h-screen">
          <Sidebar area={area} collapsed={collapsed} onToggle={toggle} />
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
                <Breadcrumbs />
              </div>
              <div className="hidden xl:block">
                <MockDataBadge />
              </div>
              {topbarExtra ?? <GlobalSearch />}
              <NotificationsBell />
              <ThemeToggle />
              <div className="lg:hidden">
                <UserMenu compact />
              </div>
            </header>
            <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-6">
              <RoleGuard area={area}>{children}</RoleGuard>
            </main>
          </div>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Logo area={area} />
            <SidebarNav area={area} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </ContextPanelProvider>
    </BreadcrumbProvider>
  );
}
