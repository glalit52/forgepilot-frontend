import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Subscription for the workspace, transparent metering for agent runtime and browser minutes.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Simple plans. Honest metering.
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Every plan includes all three modules. Pay for collaboration and quotas; expensive
          execution is metered transparently with optional hard caps.
        </p>
      </div>
      <PricingTable />
    </div>
  );
}
