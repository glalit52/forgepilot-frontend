"use client";
import { PageHeader } from "@/components/shared/page-header";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

/** P-10 Onboarding wizard (J1). */
export default function OnboardingPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Onboard a new client"
        description="Six steps: company, Git connection, repositories, application mapping, SLA tier, then a health scan. Demo: this creates a new workspace in the mock data; reset it any time from the user menu."
      />
      <OnboardingWizard />
    </div>
  );
}
