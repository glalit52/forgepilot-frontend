"use client";
import Link from "next/link";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/api/hooks";
import { planById } from "@/lib/domain/plans";
import { WORKSPACE_KIND_LABEL } from "@/lib/domain/labels";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { cn } from "@/lib/utils";
import { useSignInAndGo } from "./use-sign-in";

function WsAvatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold", className)}>{name.slice(0, 1).toUpperCase()}</span>;
}

export function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { data } = useSession();
  const { switchWorkspace, pending } = useSignInAndGo();
  if (!data) return <div className="bg-muted h-10 animate-pulse rounded-md" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("h-10 w-full justify-start gap-2 px-2", collapsed && "size-10 justify-center p-0")} aria-label={`Workspace: ${data.workspace.name}. Switch workspace`} disabled={pending}>
          <WsAvatar name={data.workspace.name} />
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="max-w-36 truncate text-sm font-semibold">{data.workspace.name}</span>
                <span className="text-muted-foreground text-[11px]">
                  {planById(data.workspace.plan).name}
                  {data.workspace.trialEndsAt ? " · trial" : ""} · {ROLE_LABEL[data.role]}
                </span>
              </span>
              <ChevronsUpDownIcon className="text-muted-foreground ml-auto" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {data.workspaces.map((w) => (
          <DropdownMenuItem key={w.organization.id} onSelect={() => w.organization.id !== data.workspace.id && switchWorkspace(w.organization.id)}>
            <WsAvatar name={w.organization.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{w.organization.name}</span>
              <span className="text-muted-foreground text-xs">
                {WORKSPACE_KIND_LABEL[w.organization.kind]} · {planById(w.organization.plan).name} · {ROLE_LABEL[w.role]}
              </span>
            </span>
            {w.organization.id === data.workspace.id && <CheckIcon aria-label="current" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding?new=1">
            <PlusIcon /> Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
