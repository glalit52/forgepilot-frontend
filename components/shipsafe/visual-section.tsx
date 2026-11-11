"use client";
import Link from "next/link";
import { ImagesIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useVisualSnapshots } from "@/lib/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { VisualSummary } from "./visual-compare";

/** Visual comparison for one verification run; renders nothing if the repository tracks no pages. */
export function VisualSection({ runId }: { runId: string }) {
  const q = useVisualSnapshots({ runId });
  if (q.isPending) return <Skeleton className="h-40" />;
  if (q.error || !q.data.length) return null;
  const snaps = q.data;
  return (
    <Card className="flex flex-col gap-4 p-4" aria-labelledby="visual-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="visual-heading" className="flex items-center gap-2 text-sm font-semibold">
          <ImagesIcon className="size-4" aria-hidden /> Visual comparison
        </h2>
        <Link
          href="/app/shipsafe/visual"
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Visual review queue →
        </Link>
      </div>
      <VisualSummary snaps={snaps} />
    </Card>
  );
}
