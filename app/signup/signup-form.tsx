"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthOptions, useSignUp } from "@/lib/api/hooks";
import { SignUpInputSchema } from "@/lib/schemas";
import { GithubMark } from "@/components/auth/auth-shell";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signup = useSignUp();
  const router = useRouter();
  const auth = useAuthOptions();
  const options = auth.data;
  // A real deployment needs a password (or GitHub); the demo creates accounts without one.
  const real = !!options && !options.demo;
  const invitationToken = useSearchParams().get("invitation") ?? undefined;

  const submit = (method: "github" | "email") => {
    const input =
      method === "github"
        ? {
            name: name || "New developer",
            email: email || `dev${Date.now() % 10000}@example.com`,
            method,
          }
        : { name, email, method, ...(real ? { password, invitationToken } : {}) };
    const parsed = SignUpInputSchema.safeParse(input);
    if (real && method === "email" && !password)
      return setErrors({ password: "Choose a password (at least 10 characters)" });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (e[String(i.path[0])] ??= i.message));
      return setErrors(e);
    }
    setErrors({});
    signup.mutate(parsed.data, {
      onSuccess: (u) => {
        toast.success(`Welcome, ${u.name.split(" ")[0]}!`, {
          description: "Let's set up your workspace.",
        });
        // An invitation already put the new account in a workspace.
        router.push(invitationToken ? "/app" : "/onboarding");
      },
      onError: (e) => toast.error("Could not create account", { description: e.message }),
    });
  };

  // Wait for the answer so a real deployment never shows the demo's instant sign-up.
  if (auth.isPending) return <Skeleton className="h-72" aria-busy="true" />;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Free forever for one repository. Team features free for 14 days.
        </p>
      </div>
      {real ? (
        options.githubSignInUrl && (
          <Button size="lg" variant="outline" asChild>
            <a href={options.githubSignInUrl}>
              <GithubMark /> Sign up with GitHub
            </a>
          </Button>
        )
      ) : (
        <Button
          size="lg"
          variant="outline"
          onClick={() => submit("github")}
          disabled={signup.isPending}
        >
          <GithubMark /> Sign up with GitHub
        </Button>
      )}
      {(!real || options.githubSignInUrl) && (
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">or with email</span>
          <Separator className="flex-1" />
        </div>
      )}
      <form
        className="flex flex-col gap-3"
        aria-label="Sign up with email"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit("email");
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-name">Full name</Label>
          <Input
            id="su-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? "su-name-err" : undefined}
          />
          {errors.name && (
            <p id="su-name-err" role="alert" className="text-danger-foreground text-xs">
              {errors.name}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-email">Work email</Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email || undefined}
            aria-describedby={errors.email ? "su-email-err" : undefined}
          />
          {errors.email && (
            <p id="su-email-err" role="alert" className="text-danger-foreground text-xs">
              {errors.email}
            </p>
          )}
        </div>
        {real && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-password">Password</Label>
            <Input
              id="su-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password || undefined}
              aria-describedby={errors.password ? "su-password-err" : "su-password-hint"}
            />
            {errors.password ? (
              <p id="su-password-err" role="alert" className="text-danger-foreground text-xs">
                {errors.password}
              </p>
            ) : (
              <p id="su-password-hint" className="text-muted-foreground text-xs">
                At least 10 characters.
              </p>
            )}
          </div>
        )}
        <Button type="submit" disabled={signup.isPending}>
          <MailIcon /> {signup.isPending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="text-muted-foreground text-xs">
        By continuing you agree to the Terms and Privacy Policy{real ? "" : " (demo)"}. Already have
        an account?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
