"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthAside, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifyEmail } from "@/lib/api/hooks";

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const { mutate, isIdle, isPending, isSuccess, error } = useVerifyEmail();
  // The link is single-use: confirm once as soon as the page opens.
  useEffect(() => {
    if (token && isIdle) mutate(token);
  }, [token, isIdle, mutate]);

  if (!token)
    return (
      <p role="alert" className="text-danger-foreground text-sm">
        This link is incomplete. Open the link from your email again.
      </p>
    );
  if (isSuccess)
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="bg-success-soft text-success-foreground rounded-md p-3 text-sm">
          Your email address is confirmed.
        </p>
        <Button asChild>
          <Link href="/app">Continue to ForgePilot</Link>
        </Button>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-danger-foreground text-sm">
          {error.message}. Links work once and expire after 3 days; sign in to request a new one.
        </p>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  return (
    <Skeleton
      className="h-10"
      aria-busy={isPending || undefined}
      aria-label="Confirming your email"
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell aside={<AuthAside />}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Confirming your email</h1>
        <Suspense>
          <Verify />
        </Suspense>
      </div>
    </AuthShell>
  );
}
