"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagesIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVisualSnapshots } from "@/lib/api/hooks";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { MockDataBadge } from "@/components/shared/misc";
import { VisualCard } from "@/components/shipsafe/visual-compare";

const TABS = [
  { key: "pending", label: "Needs decision", status: "changed,new" },
  { key: "decided", label: "Decided", status: "approved,rejected" },
] as const;

/** Visual review queue: every changed screenshot across open PRs (PRD §7.5). */
export default function VisualReviewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = TABS.find((t) => t.key === params.get("tab")) ?? TABS[0];
  const q = useVisualSnapshots({ status: tab.status });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visual review"
        description="ShipSafe captures each tracked page on every verification run and compares it with the approved baseline. A change never becomes the new baseline on its own: someone approves it, or rejects it and a visual-regression bug is filed."
        meta={<MockDataBadge />}
      />
      <Tabs value={tab.key} onValueChange={(v) => router.replace(`/app/shipsafe/visual?tab=${v}`)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {q.isPending ? (
        <PageSkeleton />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon={ImagesIcon}
          title={tab.key === "pending" ? "No visual changes waiting" : "No decisions yet"}
          description={
            tab.key === "pending"
              ? "When a pull request changes how a tracked page looks, it shows up here for an explicit decision."
              : "Approved and rejected screenshots are kept here with who decided and why."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {q.data.map((s) => (
            <VisualCard key={s.id} snap={s} />
          ))}
        </div>
      )}
    </div>
  );
}
