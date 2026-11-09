"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSwitchPersona } from "@/lib/api/hooks";
import { homeForRole } from "@/lib/domain/roles";
import { ROLE_LABEL } from "@/lib/domain/labels";

/** Switch mock persona and go to that role's home (FE-04 AC). */
export function useSwitchAndGoHome() {
  const router = useRouter();
  const m = useSwitchPersona();
  return {
    pending: m.isPending,
    switchTo: (userId: string, next?: string) =>
      m.mutate(userId, {
        onSuccess: (s) => {
          toast.success(`Signed in as ${s.user.name}`, { description: ROLE_LABEL[s.user.role] });
          router.push(next ?? homeForRole(s.user.role));
          router.refresh();
        },
        onError: (e) => toast.error("Could not switch role", { description: e.message }),
      }),
  };
}
