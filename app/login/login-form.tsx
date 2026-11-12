"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, FlaskConicalIcon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthOptions, useLogin, usePersonas, useTwoFactorVerify } from "@/lib/api/hooks";
import { initials } from "@/lib/domain/format";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { ErrorState } from "@/components/shared/states";
import { useSignInAndGo } from "@/components/shell/use-sign-in";
import { GithubMark } from "@/components/auth/auth-shell";

/** Real deployments: email + password, and GitHub when the backend has it configured. */
const SIGN_IN_ERRORS: Record<string, string> = {
  sso_unavailable: "Single sign-on isn't set up for that email address. Use your password instead.",
  sso_not_member:
    "Your company uses single sign-on, but you aren't in its workspace yet. Ask an admin to invite you.",
  sso_wrong_domain: "Sign in with your company email address.",
  sso_inactive: "Single sign-on is not active for your company right now.",
  sso_failed: "Single sign-on didn't complete. Try again.",
};

function PasswordLogin({
  next,
  githubUrl,
  ssoUrl,
}: {
  next: string;
  githubUrl: string | null;
  ssoUrl: string | null;
}) {
  const login = useLogin();
  const verify = useTwoFactorVerify();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  /** Set once the password was accepted and only the authenticator code is missing. */
  const [codeFor, setCodeFor] = useState<{ hasWorkspace: boolean } | null>(null);
  const error = params.get("error");
  const errorText = error
    ? (SIGN_IN_ERRORS[error] ??
      "GitHub sign-in didn't complete. Try again, or use your email and password.")
    : null;
  const enter = (hasWorkspace: boolean) => {
    router.push(hasWorkspace ? next : "/onboarding");
    router.refresh();
  };

  if (codeFor)
    return (
      <form
        className="flex flex-col gap-4"
        aria-label="Two-factor code"
        onSubmit={(e) => {
          e.preventDefault();
          verify.mutate(code, {
            onSuccess: () => enter(codeFor.hasWorkspace),
            onError: (err) => toast.error("That code didn't work", { description: err.message }),
          });
        }}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enter your code</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Open your authenticator app and type the 6-digit code for ForgePilot.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={verify.isPending || code.replace(/\D/g, "").length !== 6}>
          {verify.isPending ? "Checking…" : "Continue"}
        </Button>
      </form>
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          New to ForgePilot?{" "}
          <Link
            href="/signup"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
      {errorText && (
        <p role="alert" className="text-danger-foreground text-sm">
          {errorText}
        </p>
      )}
      {githubUrl && (
        <>
          <Button size="lg" variant="outline" asChild>
            <a href={githubUrl}>
              <GithubMark /> Continue with GitHub
            </a>
          </Button>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">or</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}
      <form
        className="flex flex-col gap-3"
        aria-label="Sign in with email"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate(
            { email: email.trim(), password },
            {
              onSuccess: (r) =>
                r.twoFactorRequired
                  ? setCodeFor({ hasWorkspace: r.hasWorkspace })
                  : enter(r.hasWorkspace),
              onError: (err) => toast.error("Could not sign in", { description: err.message }),
            },
          );
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
            placeholder="you@company.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-primary text-xs underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={login.isPending || !email || !password}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
        {ssoUrl &&
          (email.includes("@") ? (
            <Button variant="outline" asChild>
              {/* The identity provider is chosen from the email's domain, on the server. */}
              <a href={`${ssoUrl}?email=${encodeURIComponent(email.trim())}`}>
                Sign in with single sign-on
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled title="Enter your work email first">
              Sign in with single sign-on
            </Button>
          ))}
      </form>
    </div>
  );
}

export function LoginForm() {
  const options = useAuthOptions();
  const params = useSearchParams();
  // Wait for the answer so a real deployment never flashes the demo personas.
  if (options.isPending) return <Skeleton className="h-64" aria-busy="true" />;
  if (options.data && !options.data.demo)
    return (
      <PasswordLogin
        next={params.get("next") ?? "/app"}
        githubUrl={options.data.githubSignInUrl}
        ssoUrl={options.data.ssoSignInUrl ?? null}
      />
    );
  return <DemoLogin />;
}

function DemoLogin() {
  const personas = usePersonas();
  const { signInAs, pending } = useSignInAndGo();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const [email, setEmail] = useState("");

  const byEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const p = personas.data?.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p)
      return toast.error("No account with that email", {
        description: "In this demo, pick a persona below or create an account.",
      });
    signInAs(p.id, p.workspaces[0]?.orgId, next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          New to ForgePilot?{" "}
          <Link
            href="/signup"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
      <Button
        size="lg"
        variant="outline"
        disabled={pending || !personas.data}
        onClick={() => {
          const p = personas.data?.[0];
          if (p) signInAs(p.id, p.workspaces[0]?.orgId, next);
        }}
      >
        <GithubMark /> Continue with GitHub
      </Button>
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>
      <form onSubmit={byEmail} className="flex flex-col gap-3" aria-label="Sign in with email">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <Button type="submit" disabled={pending || !email}>
          <MailIcon /> Send magic link
        </Button>
      </form>

      <section aria-labelledby="demo-heading" className="flex flex-col gap-3 rounded-xl border p-4">
        <div>
          <h2 id="demo-heading" className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConicalIcon className="text-warning-foreground size-4" aria-hidden /> Explore a
            demo workspace
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Sign in instantly as a fictional teammate. Each role sees different controls.
          </p>
        </div>
        {personas.error ? (
          <ErrorState error={personas.error} onRetry={() => personas.refetch()} />
        ) : personas.isPending ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)
        ) : (
          <ul className="flex flex-col gap-1.5">
            {personas.data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => signInAs(p.id, p.workspaces[0]?.orgId, next)}
                  data-testid={`login-${p.id}`}
                  className="hover:bg-accent focus-visible:ring-ring/50 group flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(p.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">
                      {p.name}{" "}
                      <span className="text-muted-foreground font-normal">· {p.title}</span>
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {p.workspaces.map((w) => `${w.name} (${ROLE_LABEL[w.role]})`).join(" · ")}
                    </span>
                  </span>
                  <ArrowRightIcon
                    className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-muted-foreground text-center text-xs">
        Demo build · sign-in is mocked · all data is fictional
      </p>
    </div>
  );
}
