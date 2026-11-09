"use client";
import { useRouter } from "next/navigation";
import { Building2Icon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClients } from "@/lib/api/hooks";

/** Console org switcher: jump to a client's workspace. */
export function OrgSwitcher() {
  const { data = [] } = useClients();
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-start gap-2 px-2.5 text-sm" aria-label="Switch client">
          <Building2Icon className="text-muted-foreground" />
          <span className="truncate">All clients</span>
          <ChevronsUpDownIcon className="text-muted-foreground ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Clients</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => router.push("/console/clients")}>All clients</DropdownMenuItem>
        <DropdownMenuSeparator />
        {data.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => router.push(`/console/clients/${c.id}`)}>
            <span className="truncate">{c.name}</span>
            <span className="text-muted-foreground ml-auto text-xs">{c.applications} apps</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
