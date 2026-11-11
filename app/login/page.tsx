import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthAside, AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell aside={<AuthAside />}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
