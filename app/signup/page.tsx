import type { Metadata } from "next";
import { AuthAside, AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthShell aside={<AuthAside />}>
      <SignupForm />
    </AuthShell>
  );
}
