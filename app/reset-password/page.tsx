"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthAside, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/lib/api/hooks";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!token)
    return (
      <p role="alert" className="text-danger-foreground text-sm">
        This link is incomplete. Open the link from your email again, or request a new one.
      </p>
    );
  if (reset.isSuccess)
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="bg-success-soft text-success-foreground rounded-md p-3 text-sm">
          Your password is changed and every other session was signed out.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  return (
    <form
      className="flex flex-col gap-3"
      aria-label="Choose a new password"
      onSubmit={(e) => {
        e.preventDefault();
        if (password.length < 10) return setError("Use at least 10 characters.");
        if (password !== again) return setError("The two passwords don't match.");
        setError(null);
        reset.mutate({ token, password }, { onError: (err) => setError(err.message) });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="pw-hint"
        />
        <p id="pw-hint" className="text-muted-foreground text-xs">
          At least 10 characters.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password-again">Type it again</Label>
        <Input
          id="new-password-again"
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-danger-foreground text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={reset.isPending}>
        {reset.isPending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell aside={<AuthAside />}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
