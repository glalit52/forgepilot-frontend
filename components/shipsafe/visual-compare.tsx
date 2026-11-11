"use client";
import { useId, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  Columns2Icon,
  LayersIcon,
  MonitorIcon,
  SmartphoneIcon,
  SplitIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDecideVisual, useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { formatRelative } from "@/lib/domain/format";
import { VisualDecisionInputSchema, type VisualSnapshotListItem } from "@/lib/schemas";
import { CommitSha } from "@/components/shared/misc";
import { ToneBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

type Region = VisualSnapshotListItem["regions"][number];

const STATUS: Record<
  VisualSnapshotListItem["status"],
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }
> = {
  unchanged: { label: "No change", tone: "neutral" },
  changed: { label: "Needs decision", tone: "warning" },
  new: { label: "New page", tone: "info" },
  approved: { label: "Baseline approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export function VisualStatusBadge({ status }: { status: VisualSnapshotListItem["status"] }) {
  return <ToneBadge tone={STATUS[status].tone}>{STATUS[status].label}</ToneBadge>;
}

/**
 * Deterministic mock "screenshot" of an app page (no real images in the demo).
 * The candidate version applies a visible change inside each diff region.
 */
export function MockScreenshot({
  snap,
  candidate,
  className,
}: {
  snap: Pick<VisualSnapshotListItem, "variant" | "theme" | "viewport" | "regions" | "name">;
  candidate?: boolean;
  className?: string;
}) {
  const W = snap.viewport === "mobile" ? 390 : 1280;
  const H = snap.viewport === "mobile" ? 844 : 800;
  const dark = snap.theme === "dark";
  const bg = dark ? "#16151c" : "#fbfbfd";
  const card = dark ? "#211f29" : "#ffffff";
  const line = dark ? "#33313d" : "#e6e5ec";
  const text = dark ? "#c9c7d3" : "#3b3946";
  const muted = dark ? "#6f6c7a" : "#b9b7c3";
  const accents = ["#6d4ae8", "#0f9d8a", "#d97706", "#db2777", "#2563eb"];
  const accent = accents[snap.variant % accents.length];
  const changedAccent = accents[(snap.variant + 2) % accents.length];
  const mobile = snap.viewport === "mobile";
  const inRegion = (x: number, y: number) =>
    candidate &&
    snap.regions.some(
      (r) =>
        x >= (r.x / 100) * W &&
        x <= ((r.x + r.w) / 100) * W &&
        y >= (r.y / 100) * H &&
        y <= ((r.y + r.h) / 100) * H,
    );
  // Candidate changes: inside a region, blocks shift and change colour.
  const shift = (x: number, y: number) => (inRegion(x, y) ? 18 : 0);
  const fill = (x: number, y: number, base: string) => (inRegion(x, y) ? changedAccent : base);
  const side = mobile ? 0 : 220;
  const rows = mobile ? 7 : 6;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label={`${candidate ? "Candidate" : "Baseline"} screenshot of ${snap.name}`}
    >
      <rect width={W} height={H} fill={bg} />
      {/* top bar */}
      <rect width={W} height={56} fill={card} />
      <rect y={56} width={W} height={1} fill={line} />
      <rect x={20} y={18} width={20} height={20} rx={5} fill={accent} />
      <rect x={50} y={22} width={110} height={12} rx={4} fill={text} opacity={0.8} />
      {!mobile && (
        <rect x={W - 330} y={16} width={240} height={24} rx={6} fill={bg} stroke={line} />
      )}
      {/* sidebar */}
      {!mobile && (
        <g>
          <rect y={57} width={side} height={H - 57} fill={card} />
          <rect x={side} y={57} width={1} height={H - 57} fill={line} />
          {Array.from({ length: 9 }).map((_, i) => (
            <rect
              key={i}
              x={20}
              y={84 + i * 36}
              width={i === 1 ? 160 : 120 - (i % 3) * 14}
              height={12}
              rx={4}
              fill={i === 1 ? accent : muted}
              opacity={i === 1 ? 0.9 : 0.7}
            />
          ))}
        </g>
      )}
      {/* heading */}
      <rect x={side + 32} y={84} width={mobile ? 220 : 300} height={20} rx={5} fill={text} />
      <rect x={side + 32} y={114} width={mobile ? 280 : 460} height={10} rx={4} fill={muted} />
      <rect
        x={W - (mobile ? 120 : 160) - 24 + shift(W - 150, 90)}
        y={82 + shift(W - 150, 90) / 3}
        width={mobile ? 96 : 130}
        height={34}
        rx={8}
        fill={fill(W - 150, 90, accent)}
      />
      {/* KPI cards */}
      {Array.from({ length: mobile ? 2 : 4 }).map((_, i) => {
        const cw = mobile ? (W - 32 * 2 - 16) / 2 : (W - side - 64 - 48) / 4;
        const x = side + 32 + i * (cw + 16);
        const y = 150;
        return (
          <g key={i} transform={`translate(${shift(x + 10, y + 10)},${shift(x + 10, y + 10) / 2})`}>
            <rect x={x} y={y} width={cw} height={96} rx={10} fill={card} stroke={line} />
            <rect x={x + 16} y={y + 18} width={cw * 0.45} height={9} rx={4} fill={muted} />
            <rect
              x={x + 16}
              y={y + 42}
              width={cw * 0.35}
              height={22}
              rx={5}
              fill={i === 0 ? fill(x + 10, y + 10, accent) : text}
            />
          </g>
        );
      })}
      {/* table */}
      <g>
        <rect
          x={side + 32}
          y={272}
          width={W - side - 64}
          height={rows * 48 + 52}
          rx={10}
          fill={card}
          stroke={line}
        />
        <rect x={side + 52} y={292} width={140} height={11} rx={4} fill={text} />
        {Array.from({ length: rows }).map((_, i) => {
          const y = 330 + i * 48;
          const dx = shift(side + 60, y + 10);
          return (
            <g key={i}>
              <rect x={side + 32} y={y - 8} width={W - side - 64} height={1} fill={line} />
              <rect
                x={side + 52 + dx}
                y={y + 6}
                width={mobile ? 150 : 260 - (i % 3) * 30}
                height={10}
                rx={4}
                fill={text}
                opacity={0.75}
              />
              {!mobile && (
                <rect x={side + 400} y={y + 6} width={120} height={10} rx={4} fill={muted} />
              )}
              <rect
                x={W - (mobile ? 110 : 190) + dx}
                y={y + 2}
                width={mobile ? 70 : 90}
                height={18}
                rx={9}
                fill={fill(W - 170, y + 6, i % 3 === 0 ? "#16a34a" : muted)}
                opacity={0.85}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function DiffOverlay({ regions }: { regions: Region[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {regions.map((r, i) => (
        <span
          key={i}
          className="absolute rounded-sm border-2 border-fuchsia-500 bg-fuchsia-500/25"
          style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
        />
      ))}
    </div>
  );
}

type Mode = "side" | "swipe" | "diff";

/** Baseline vs candidate with side-by-side, swipe and highlighted-diff views. */
export function VisualCompare({ snap }: { snap: VisualSnapshotListItem }) {
  const [mode, setMode] = useState<Mode>(snap.status === "unchanged" ? "side" : "diff");
  const [pos, setPos] = useState(50);
  const sliderId = useId();
  const frame = cn(
    "bg-muted/40 relative overflow-hidden rounded-md border",
    snap.viewport === "mobile" && "mx-auto max-w-[260px]",
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Comparison view"
          className="bg-muted inline-flex rounded-lg p-0.5"
        >
          {(
            [
              ["side", "Side by side", Columns2Icon],
              ["swipe", "Swipe", SplitIcon],
              ["diff", "Highlight diff", LayersIcon],
            ] as const
          ).map(([m, label, Icon]) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? "secondary" : "ghost"}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn("h-7", mode === m && "bg-background shadow-sm")}
            >
              <Icon /> {label}
            </Button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">
          baseline <CommitSha sha={snap.baselineSha} /> → candidate{" "}
          <CommitSha sha={snap.candidateSha} /> · {snap.diffPct}% of pixels differ
        </span>
      </div>
      {mode === "side" && (
        <div
          className={cn(
            "grid gap-3",
            snap.viewport === "mobile" ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2",
          )}
        >
          {[false, true].map((candidate) => (
            <figure key={String(candidate)} className="flex flex-col gap-1.5">
              <figcaption className="text-muted-foreground text-xs font-medium">
                {candidate ? "Candidate (this PR)" : "Approved baseline"}
              </figcaption>
              <div className={frame}>
                <MockScreenshot snap={snap} candidate={candidate} />
              </div>
            </figure>
          ))}
        </div>
      )}
      {mode === "swipe" && (
        <div className="flex flex-col gap-2">
          <div className={frame}>
            <MockScreenshot snap={snap} candidate />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            >
              <MockScreenshot snap={snap} />
            </div>
            <span
              className="bg-primary absolute inset-y-0 w-0.5"
              style={{ left: `${pos}%` }}
              aria-hidden
            />
            <span className="bg-background/90 absolute top-2 left-2 rounded px-1.5 text-[10px] font-medium">
              Baseline
            </span>
            <span className="bg-background/90 absolute top-2 right-2 rounded px-1.5 text-[10px] font-medium">
              Candidate
            </span>
          </div>
          <Label htmlFor={sliderId} className="text-muted-foreground text-xs font-normal">
            Drag to compare
          </Label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            className="accent-[var(--primary)]"
          />
        </div>
      )}
      {mode === "diff" && (
        <figure className="flex flex-col gap-1.5">
          <figcaption className="text-muted-foreground text-xs">
            Candidate with changed regions highlighted ({snap.regions.length} region
            {snap.regions.length === 1 ? "" : "s"})
          </figcaption>
          <div className={frame}>
            <MockScreenshot snap={snap} candidate />
            <DiffOverlay regions={snap.regions} />
          </div>
        </figure>
      )}
    </div>
  );
}

/** Approve as new baseline / reject (requires a reason; files a visual-regression bug). */
export function VisualDecision({ snap }: { snap: VisualSnapshotListItem }) {
  const { data: session } = useSession();
  const decide = useDecideVisual();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const allowed = can(session?.role, "suite.manage");
  const pending = snap.status === "changed" || snap.status === "new";

  if (!pending)
    return (
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <VisualStatusBadge status={snap.status} />
        {snap.decidedByUser && (
          <span suppressHydrationWarning>
            by {snap.decidedByUser.name} {snap.decidedAt ? formatRelative(snap.decidedAt) : ""}
          </span>
        )}
        {snap.comment && <span>· “{snap.comment}”</span>}
        {snap.bugId && (
          <Link className="text-primary hover:underline" href={`/app/shipsafe/bugs/${snap.bugId}`}>
            View bug
          </Link>
        )}
      </div>
    );

  const submit = (decision: "approved" | "rejected") => {
    const parsed = VisualDecisionInputSchema.safeParse({ decision, comment });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form");
    decide.mutate(
      { id: snap.id, ...parsed.data },
      {
        onSuccess: () => {
          setRejecting(false);
          toast.success(
            decision === "approved"
              ? "New baseline approved"
              : "Change rejected and filed as a bug",
            { description: `${snap.name} (${snap.viewport})` },
          );
        },
        onError: (e) => toast.error("Could not save the decision", { description: e.message }),
      },
    );
  };

  const disabledReason = allowed ? null : "Viewers can't decide visual baselines.";
  const btn = (node: React.ReactElement) =>
    disabledReason ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{node}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    ) : (
      node
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {btn(
        <Button
          size="sm"
          onClick={() => submit("approved")}
          disabled={!allowed || decide.isPending}
          aria-label={`Approve new baseline for ${snap.name} (${snap.viewport})`}
        >
          <CheckIcon /> Approve new baseline
        </Button>,
      )}
      {btn(
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRejecting(true)}
          disabled={!allowed || decide.isPending}
          aria-label={`Reject change to ${snap.name} (${snap.viewport})`}
        >
          <XIcon /> Reject change
        </Button>,
      )}
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this visual change?</DialogTitle>
            <DialogDescription>
              The baseline stays as it is. ShipSafe files a visual-regression bug on this PR so a
              fix task can pick it up.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`rej-${snap.id}`}>What looks wrong?</Label>
            <Textarea
              id={`rej-${snap.id}`}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError(null);
              }}
              placeholder="e.g. The save button overlaps the card on narrow screens"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? `rej-${snap.id}-err` : undefined}
            />
            {error && (
              <p id={`rej-${snap.id}-err`} role="alert" className="text-danger-foreground text-xs">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submit("rejected")}
              disabled={decide.isPending}
            >
              Reject and file bug
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** One snapshot: header, comparison and decision. */
export function VisualCard({
  snap,
  showPr = true,
}: {
  snap: VisualSnapshotListItem;
  showPr?: boolean;
}) {
  return (
    <article
      className="bg-card flex flex-col gap-4 rounded-lg border p-4"
      aria-labelledby={`vis-${snap.id}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`vis-${snap.id}`} className="flex items-center gap-2 font-medium">
            {snap.viewport === "mobile" ? (
              <SmartphoneIcon className="text-muted-foreground size-4" aria-hidden />
            ) : (
              <MonitorIcon className="text-muted-foreground size-4" aria-hidden />
            )}
            {snap.name}
            <span className="text-muted-foreground font-mono text-xs font-normal">
              {snap.route}
            </span>
          </h3>
          <span className="text-muted-foreground text-xs">
            {snap.viewport === "mobile" ? "Mobile 390×844" : "Desktop 1280×800"} · {snap.theme}{" "}
            theme · {snap.repositoryName}
            {showPr && snap.pullRequestNumber && (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/app/pull-requests/${snap.pullRequestId}`}
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  PR #{snap.pullRequestNumber} {snap.pullRequestTitle}
                </Link>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {snap.diffPct > 0 && <Badge variant="outline">{snap.diffPct}% diff</Badge>}
          <VisualStatusBadge status={snap.status} />
        </div>
      </header>
      {snap.status !== "unchanged" && <VisualCompare snap={snap} />}
      <VisualDecision snap={snap} />
    </article>
  );
}

/** Compact grid of all screenshots for a run or PR, changed ones expanded first. */
export function VisualSummary({ snaps }: { snaps: VisualSnapshotListItem[] }) {
  const changed = snaps.filter((s) => s.status !== "unchanged");
  const same = snaps.filter((s) => s.status === "unchanged");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {snaps.length} screenshot{snaps.length === 1 ? "" : "s"} compared ·{" "}
        {snaps.filter((s) => s.status === "changed").length} need a decision · {same.length}{" "}
        unchanged. Passing checks never approve a visual change; a person does.
      </p>
      {changed.map((s) => (
        <VisualCard key={s.id} snap={s} showPr={false} />
      ))}
      {same.length > 0 && (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          aria-label="Unchanged screenshots"
        >
          {same.map((s) => (
            <li key={s.id} className="flex flex-col gap-1.5 rounded-md border p-2">
              <div
                className={cn(
                  "overflow-hidden rounded border",
                  s.viewport === "mobile" && "mx-auto w-1/2",
                )}
              >
                <MockScreenshot snap={s} />
              </div>
              <span className="truncate text-xs font-medium">{s.name}</span>
              <span className="text-muted-foreground text-[11px]">
                {s.viewport} · matches baseline
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
