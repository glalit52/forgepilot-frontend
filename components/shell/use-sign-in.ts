"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSignIn, useSwitchWorkspace } from "@/lib/api/hooks";
import { ROLE_LABEL } from "@/lib/domain/permissions";

/** Sign in as a persona (optionally into a workspace) and land on the app. */
export function useSignInAndGo() {
  const router = useRouter();
  const signIn = useSignIn();
  const sw = useSwitchWorkspace();
  return {
    pending: signIn.isPending || sw.isPending,
    signInAs: (userId: string, orgId?: string, next = "/app") =>
      signIn.mutate(
        { userId, orgId },
        {
          onSuccess: (s) => {
            toast.success(`Signed in as ${s.user.name}`, {
              description: `${s.workspace.name} · ${ROLE_LABEL[s.role]}`,
            });
            router.push(next);
            router.refresh();
          },
          onError: (e) => toast.error("Could not sign in", { description: e.message }),
        },
      ),
    switchWorkspace: (orgId: string) =>
      sw.mutate(orgId, {
        onSuccess: (s) => {
          toast.success(`Switched to ${s.workspace.name}`, { description: ROLE_LABEL[s.role] });
          router.push("/app");
          router.refresh();
        },
        onError: (e) => toast.error("Could not switch workspace", { description: e.message }),
      }),
  };
}
