"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV, type NavItem } from "@/lib/nav";
import { useSession } from "@/lib/api/hooks";
import { planById } from "@/lib/domain/plans";
import { ModuleDot } from "@/components/shared/misc";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

function NavLink({ item, collapsed, count, onNavigate }: { item: NavItem; collapsed: boolean; count: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {count > 0 && (
        <span className={cn("bg-primary text-primary-foreground flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums", collapsed ? "absolute -top-0.5 -right-0.5 min-w-4 px-1 text-[9px]" : "ml-auto")} aria-label={`${count} pending`}>
          {count}
        </span>
      )}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { data } = useSession();
  const counts = { approvals: data?.counts.pendingApprovals ?? 0, review: data?.counts.reviewReady ?? 0 };
  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {NAV.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {g.label && !collapsed && (
            <span className="text-muted-foreground mb-1 flex items-center gap-1.5 px-2.5 text-[11px] font-medium tracking-wide uppercase">
              {g.module && <ModuleDot module={g.module} />}
              {g.label}
            </span>
          )}
          {g.label && collapsed && <span className="bg-sidebar-border mx-3 my-1 h-px" aria-hidden />}
          {g.items.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} count={item.badge ? counts[item.badge] : 0} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function PlanCard() {
  const { data } = useSession();
  if (!data) return null;
  const plan = planById(data.workspace.plan);
  const trialDays = data.workspace.trialEndsAt ? Math.max(0, Math.ceil((Date.parse(data.workspace.trialEndsAt) - Date.now()) / 86_400_000)) : null;
  if (data.workspace.plan !== "free" && data.workspace.plan !== "developer" && trialDays === null) return null;
  return (
    <div className="bg-accent/50 rounded-lg border p-3 text-xs">
      <p className="font-medium">{trialDays !== null ? `Team trial · ${trialDays} days left` : `You're on ${plan.name}`}</p>
      <p className="text-muted-foreground mt-0.5">Approvals, policies and shared budgets come with Team.</p>
      <Button asChild size="sm" className="mt-2 w-full">
        <Link href="/app/billing?upgrade=1">
          <SparklesIcon /> Upgrade
        </Link>
      </Button>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={cn("bg-sidebar border-sidebar-border sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] lg:flex", collapsed ? "w-16" : "w-64")}>
      <div className={cn("flex h-14 items-center px-4", collapsed && "justify-center px-0")}>
        <Link href="/app" aria-label="ForgePilot home">
          <Logo compact={collapsed} />
        </Link>
      </div>
      <div className={cn("px-3 pb-2", collapsed && "px-3")}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>
      <div className={cn("flex-1 overflow-y-auto px-3 py-2", collapsed && "px-3")}>
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className={cn("border-sidebar-border flex flex-col gap-2 border-t p-3", collapsed && "items-center p-2")}>
        {!collapsed && <PlanCard />}
        <UserMenu compact={collapsed} />
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} className={cn(!collapsed && "justify-start")} onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
          {!collapsed && <span className="text-muted-foreground text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
