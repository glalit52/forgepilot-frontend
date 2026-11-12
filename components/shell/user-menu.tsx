"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenIcon, CheckIcon, LogOutIcon, RotateCcwIcon, UserCogIcon } from "lucide-react";
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
import { useAuthOptions, useLogout, useResetDemo, useSession } from "@/lib/api/hooks";
import { initials } from "@/lib/domain/format";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { useSignInAndGo } from "./use-sign-in";

/** User menu: profile, demo persona switcher, demo reset, sign out. */
export function UserMenu({ compact }: { compact?: boolean }) {
  const { data } = useSession();
  const { signInAs, pending } = useSignInAndGo();
  const reset = useResetDemo();
  const logout = useLogout();
  const demo = useAuthOptions().data?.demo ?? false;
  const router = useRouter();
  if (!data) return <div className="bg-muted size-8 animate-pulse rounded-full" />;
  const { user, personas } = data;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            compact ? "size-9 rounded-full p-0" : "h-auto w-full justify-start gap-2 px-2 py-1.5"
          }
          aria-label={`User menu: ${user.name}`}
          disabled={pending}
        >
          <Avatar className="size-7">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="flex min-w-0 flex-col items-start text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-80">
        <DropdownMenuLabel className="text-foreground">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-muted-foreground text-xs font-normal">
            {user.title || user.email}
          </div>
        </DropdownMenuLabel>
        {personas.length > 0 && <DropdownMenuSeparator />}
        {personas.length > 0 && (
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <UserCogIcon className="size-3.5" aria-hidden /> Demo: sign in as someone else
          </DropdownMenuLabel>
        )}
        <DropdownMenuGroup>
          {personas.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => p.id !== user.id && signInAs(p.id, p.workspaces[0]?.orgId)}
              data-testid={`persona-${p.id}`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{p.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {p.workspaces.map((w) => `${w.name} (${ROLE_LABEL[w.role]})`).join(" · ")}
                </span>
              </span>
              {p.id === user.id && <CheckIcon aria-label="current" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/docs">
            <BookOpenIcon /> Docs & API contract
          </Link>
        </DropdownMenuItem>
        {demo && (
          <DropdownMenuItem
            onSelect={() =>
              reset.mutate(undefined, {
                onSuccess: () =>
                  toast.success("Demo data reset", {
                    description: "Everything is back to the seeded story.",
                  }),
              })
            }
          >
            <RotateCcwIcon /> Reset demo data
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            // The server ends the session: its cookie is HttpOnly and can't be cleared from here.
            const leave = () => {
              router.push("/login");
              router.refresh();
            };
            logout.mutate(undefined, { onSettled: leave });
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ROLE_LABEL };
