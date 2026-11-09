"use client";
import { CheckIcon, LogOutIcon, RotateCcwIcon, UserCogIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useResetDemo, useSession } from "@/lib/api/hooks";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { initials } from "@/lib/domain/format";
import { PORTAL_ROLES } from "@/lib/domain/roles";
import { useSwitchAndGoHome } from "./use-switch-persona";

/** User menu with the mock-session role switcher and demo reset. */
export function UserMenu({ compact }: { compact?: boolean }) {
  const { data } = useSession();
  const { switchTo, pending } = useSwitchAndGoHome();
  const reset = useResetDemo();
  const router = useRouter();
  if (!data) return <div className="bg-muted size-8 animate-pulse rounded-full" />;
  const { user, personas, organization } = data;
  const portal = personas.filter((p) => PORTAL_ROLES.includes(p.role));
  const console_ = personas.filter((p) => !PORTAL_ROLES.includes(p.role));
  const orgName = (id: string | null) => (id ? id.replace("org_", "").replace(/_/g, " ") : "ForgePilot");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={compact ? "size-9 rounded-full p-0" : "h-auto w-full justify-start gap-2 px-2 py-1.5"}
          aria-label={`User menu: ${user.name}, ${ROLE_LABEL[user.role]}. Switch role`}
          disabled={pending}
        >
          <Avatar className="size-7">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="flex min-w-0 flex-col items-start text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">{ROLE_LABEL[user.role]}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-foreground">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-muted-foreground text-xs font-normal">
            {user.email} · {organization?.name ?? "ForgePilot"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <UserCogIcon className="size-3.5" aria-hidden /> Switch role (mock session)
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="pt-0 text-[11px] uppercase">Client portal</DropdownMenuLabel>
          {portal.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => p.id !== user.id && switchTo(p.id)} data-testid={`persona-${p.role}-${p.id}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{p.name}</span>
                <span className="text-muted-foreground truncate text-xs capitalize">
                  {ROLE_LABEL[p.role]} · {orgName(p.orgId)}
                </span>
              </span>
              {p.id === user.id && <CheckIcon aria-label="current" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuLabel className="text-[11px] uppercase">ForgePilot console</DropdownMenuLabel>
          {console_.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => p.id !== user.id && switchTo(p.id)} data-testid={`persona-${p.role}-${p.id}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{p.name}</span>
                <span className="text-muted-foreground text-xs">{ROLE_LABEL[p.role]}</span>
              </span>
              {p.id === user.id && <CheckIcon aria-label="current" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            reset.mutate(undefined, {
              onSuccess: () => toast.success("Demo data reset", { description: "Everything is back to the seeded story." }),
            })
          }
        >
          <RotateCcwIcon /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            document.cookie = "fp_session=; Max-Age=0; path=/";
            document.cookie = "fp_role=; Max-Age=0; path=/";
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
