"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getLiveState, setLiveState, subscribeLiveState, type LiveState } from "@/lib/live/status";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Subscribes to the server push stream and refreshes exactly what changed.
 * Falls back to polling (handled in hooks) whenever the stream is down.
 */
export function LiveUpdates() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof EventSource === "undefined") return setLiveState("offline");
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const connect = () => {
      setLiveState("connecting");
      es = new EventSource(`${API_BASE}/events`);
      es.addEventListener("ready", () => {
        attempts = 0;
        setLiveState("live");
      });
      es.addEventListener("change", () => qc.invalidateQueries({ refetchType: "active" }));
      es.addEventListener("tick", (e) => {
        const { sessions = [], runs = [] } = JSON.parse((e as MessageEvent).data) as {
          sessions: string[];
          runs: string[];
        };
        sessions.forEach((id) => {
          qc.invalidateQueries({ queryKey: ["session-log", id] });
          qc.invalidateQueries({ queryKey: ["session-detail", id] });
        });
        runs.forEach((id) => qc.invalidateQueries({ queryKey: ["run", id] }));
      });
      es.onerror = () => {
        es?.close();
        setLiveState("offline");
        attempts += 1;
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempts));
      };
    };
    connect();
    return () => {
      clearTimeout(retry);
      es?.close();
    };
  }, [qc]);
  return null;
}

const LABEL: Record<LiveState, string> = {
  live: "Live",
  connecting: "Connecting…",
  offline: "Offline",
};
const HELP: Record<LiveState, string> = {
  live: "Connected: screens update the moment something changes.",
  connecting: "Connecting to live updates…",
  offline:
    "Live updates disconnected. Refreshing every few seconds and reconnecting automatically.",
};

export function LiveIndicator() {
  const state = useSyncExternalStore(
    subscribeLiveState,
    getLiveState,
    () => "connecting" as LiveState,
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="text-muted-foreground hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs sm:inline-flex"
          aria-label={`Live updates: ${LABEL[state]}`}
          data-live-state={state}
        >
          <span className="relative flex size-2" aria-hidden>
            {state === "live" && (
              <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-60" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                state === "live" ? "bg-success" : state === "offline" ? "bg-warning" : "bg-neutral",
              )}
            />
          </span>
          {LABEL[state]}
        </span>
      </TooltipTrigger>
      <TooltipContent>{HELP[state]}</TooltipContent>
    </Tooltip>
  );
}
