"use client";
/**
 * Live-updates connection state. While the server push stream is connected,
 * queries stop polling and refresh only when the server says something changed.
 * If the stream drops, the same queries fall back to periodic polling.
 */
export type LiveState = "connecting" | "live" | "offline";

let state: LiveState = "connecting";
const listeners = new Set<() => void>();

export function getLiveState() {
  return state;
}
export function setLiveState(next: LiveState) {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}
export function subscribeLiveState(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export const isLive = () => state === "live";

/** refetchInterval helper: no polling while live, fallback interval otherwise. */
export function poll<Q>(ms: number | ((q: Q) => number | false)) {
  return (q: Q) => (isLive() ? false : typeof ms === "function" ? ms(q) : ms);
}
