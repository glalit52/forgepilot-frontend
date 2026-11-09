"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BellIcon,
  BotIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { PlanBadge } from "@/components/shared/misc";
import { PageSkeleton, QueryState } from "@/components/shared/states";
import { GeneralTab } from "@/components/settings/general-tab";
import { MembersTab } from "@/components/settings/members-tab";
import { AgentsTab } from "@/components/settings/agents-tab";
import { PoliciesTab } from "@/components/settings/policies-tab";
import { ApiKeysTab } from "@/components/settings/api-keys-tab";
import { AuditTab } from "@/components/settings/audit-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { useSession } from "@/lib/api/hooks";
import { ROLE_LABEL } from "@/lib/domain/permissions";

const TABS = [
  { id: "general", label: "General", icon: SlidersHorizontalIcon },
  { id: "members", label: "Members", icon: UsersIcon },
  { id: "agents", label: "Agents", icon: BotIcon },
  { id: "policies", label: "Policies", icon: ShieldIcon },
  { id: "api-keys", label: "API keys", icon: KeyRoundIcon },
  { id: "audit", label: "Audit log", icon: ScrollTextIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "general";

  const setTab = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    if (next === "general") sp.delete("tab");
    else sp.set("tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Workspace, people, agent runtimes, policies and access."
        meta={
          session.data && (
            <>
              <PlanBadge plan={session.data.workspace.plan} />
              <span className="text-muted-foreground text-xs">
                {session.data.workspace.name} · you&apos;re{" "}
                {ROLE_LABEL[session.data.role].toLowerCase()}
              </span>
            </>
          )
        }
      />
      <QueryState query={session} loading={<PageSkeleton />}>
        {(s) => (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Settings sections" className="w-full justify-start sm:w-fit">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  <t.icon aria-hidden /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="general">
              <GeneralTab session={s} />
            </TabsContent>
            <TabsContent value="members">
              <MembersTab session={s} />
            </TabsContent>
            <TabsContent value="agents">
              <AgentsTab session={s} />
            </TabsContent>
            <TabsContent value="policies">
              <PoliciesTab session={s} />
            </TabsContent>
            <TabsContent value="api-keys">
              <ApiKeysTab session={s} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditTab session={s} />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>
          </Tabs>
        )}
      </QueryState>
    </div>
  );
}
