import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthAside, AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthShell aside={<AuthAside />}>
      {/* The form reads ?invitation= from the URL, which needs a Suspense boundary. */}
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
