"use client";
import Link from "next/link";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMarkNotificationsRead, useNotifications } from "@/lib/api/hooks";
import { formatRelative } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { data = [] } = useNotifications();
  const mark = useMarkNotificationsRead();
  const unread = data.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications, ${unread} unread`}
        >
          <BellIcon />
          {unread > 0 && (
            <span className="bg-danger absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mark.mutate(undefined)}
            disabled={!unread}
          >
            <CheckCheckIcon /> Mark all read
          </Button>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {data.length === 0 && (
            <li className="text-muted-foreground px-4 py-8 text-center text-sm">
              You&apos;re all caught up.
            </li>
          )}
          {data.map((n) => (
            <li key={n.id} className="border-b last:border-0">
              <Link
                href={n.href}
                onClick={() => !n.read && mark.mutate([n.id])}
                className="hover:bg-accent flex gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-primary",
                  )}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn("text-sm", !n.read && "font-medium")}>{n.title}</span>
                  <span className="text-muted-foreground truncate text-xs">{n.body}</span>
                  <span className="text-muted-foreground text-xs">{formatRelative(n.at)}</span>
                </span>
                {!n.read && <span className="sr-only">unread</span>}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
