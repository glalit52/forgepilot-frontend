"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthAside, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/lib/api/hooks";

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  return (
    <AuthShell aside={<AuthAside />}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your email and we&apos;ll send a link to choose a new password.
          </p>
        </div>
        {forgot.isSuccess ? (
          // The same message whether or not the address has an account, so it can't be used to find accounts.
          <p
            role="status"
            className="bg-success-soft text-success-foreground rounded-md p-3 text-sm"
          >
            If an account exists for {email}, a reset link is on its way. It works once and expires
            in an hour.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            aria-label="Request a password reset"
            onSubmit={(e) => {
              e.preventDefault();
              forgot.mutate(email.trim());
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {forgot.error && (
              <p role="alert" className="text-danger-foreground text-sm">
                {forgot.error.message}
              </p>
            )}
            <Button type="submit" disabled={forgot.isPending || !email}>
              {forgot.isPending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link href="/login" className="text-primary text-sm underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
