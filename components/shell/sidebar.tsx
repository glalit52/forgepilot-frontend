"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CONSOLE_NAV, PORTAL_NAV, type NavItem } from "@/lib/nav";
import { useApprovals, useSession, useTasks } from "@/lib/api/hooks";
import type { Area } from "@/lib/domain/roles";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { OrgSwitcher } from "./org-switcher";

function useBadges(area: Area) {
  // Each area only calls its own endpoints (/approvals is portal-only).
  const approvals = useApprovals({ enabled: area === "portal" });
  const queue = useTasks({ mine: true }, { enabled: area === "console" });
  if (area === "portal") return { approvals: approvals.data?.length ?? 0, queue: 0 };
  const needs = (queue.data ?? []).filter((t) =>
    ["awaiting_review", "escalated", "plan_approved", "retrying", "rejected"].includes(t.state),
  ).length;
  return { approvals: 0, queue: needs };
}

function NavLink({ item, collapsed, count, onNavigate }: { item: NavItem; collapsed: boolean; count: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.disabled && (
        <span className="text-muted-foreground ml-auto rounded border px-1 text-[10px]">Soon</span>
      )}
      {count > 0 && (
        <span
          className={cn(
            "bg-primary text-primary-foreground flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            collapsed ? "absolute top-0.5 right-0.5 min-w-4 px-1 text-[9px]" : "ml-auto",
          )}
          aria-label={`${count} pending`}
        >
          {count}
        </span>
      )}
    </>
  );
  const cls = cn(
    "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
    collapsed && "justify-center px-0",
    active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
    item.disabled && "cursor-not-allowed opacity-55 hover:bg-transparent",
  );
  const link = item.disabled ? (
    <span className={cls} aria-disabled="true" role="link" tabIndex={0} title={item.disabled.reason}>
      {content}
      <span className="sr-only">({item.disabled.reason})</span>
    </span>
  ) : (
    <Link href={item.href} className={cls} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      {content}
    </Link>
  );
  if (!collapsed && !item.disabled) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.disabled ? `${item.label} — ${item.disabled.reason}` : item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({ area, collapsed = false, onNavigate }: { area: Area; collapsed?: boolean; onNavigate?: () => void }) {
  const { data: session } = useSession();
  const badges = useBadges(area);
  const items = (area === "portal" ? PORTAL_NAV : CONSOLE_NAV).filter(
    (i) => !i.roles || (session && i.roles.includes(session.user.role)),
  );
  return (
    <nav aria-label={area === "portal" ? "Client portal" : "Console"} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          count={item.badge ? badges[item.badge] : 0}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function Sidebar({
  area,
  collapsed,
  onToggle,
}: {
  area: Area;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "bg-sidebar border-sidebar-border sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <Link href={area === "portal" ? "/portal" : "/console"} aria-label="ForgePilot home">
          {collapsed ? <Logo className="[&>span]:hidden" /> : <Logo area={area} />}
        </Link>
      </div>
      {area === "console" && !collapsed && (
        <div className="px-3 pb-2">
          <OrgSwitcher />
        </div>
      )}
      <div className={cn("flex-1 overflow-y-auto px-3 py-2", collapsed && "px-2")}>
        <SidebarNav area={area} collapsed={collapsed} />
      </div>
      <div className={cn("border-sidebar-border flex flex-col gap-1 border-t p-3", collapsed && "items-center p-2")}>
        <UserMenu compact={collapsed} />
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn(!collapsed && "justify-start")}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
          {!collapsed && <span className="text-muted-foreground text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}

