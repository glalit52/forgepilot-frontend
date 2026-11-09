/** Locale-aware formatting. Dates use the viewer's locale and show the time zone. */
const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function formatNumber(n: number, digits = 0) {
  return digits === 0
    ? nf0.format(n)
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}

export function formatUsd(n: number, compact = false) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(n);
}

export function formatPct(n: number, digits = 0) {
  return `${formatNumber(n, digits)}%`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  // dateStyle/timeStyle can't be combined with timeZoneName, so spell the fields out.
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "medium" }).format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelative(iso: string, now = Date.now()) {
  const diffSec = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

/** "2h 14m" / "3d 4h" / "45s". Negative input is treated as its absolute value. */
export function formatDuration(totalSeconds: number) {
  const s = Math.abs(Math.round(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}
