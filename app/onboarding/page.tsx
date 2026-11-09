import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata: Metadata = { title: "Set up ForgePilot" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/" aria-label="ForgePilot home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/app" className="text-muted-foreground hover:text-foreground text-sm">
            Skip to dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Suspense>
          <OnboardingWizard />
        </Suspense>
      </main>
    </div>
  );
}
