import {
  ActivityIcon,
  AppWindowIcon,
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  CheckSquareIcon,
  FileCheck2Icon,
  FolderGit2Icon,
  GaugeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  PlugIcon,
  SettingsIcon,
  SirenIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/schemas";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match for "home" items. */
  exact?: boolean;
  badge?: "approvals" | "queue";
  roles?: Role[];
  disabled?: { reason: string };
}

export const PORTAL_NAV: NavItem[] = [
  { href: "/portal", label: "Overview", icon: LayoutDashboardIcon, exact: true },
  { href: "/portal/applications", label: "Applications", icon: AppWindowIcon },
  { href: "/portal/work", label: "Work", icon: WrenchIcon },
  { href: "/portal/approvals", label: "Approvals", icon: CheckSquareIcon, badge: "approvals" },
  { href: "/portal/evidence", label: "Evidence", icon: FileCheck2Icon },
  { href: "/portal/reports", label: "Reports", icon: BarChart3Icon },
  { href: "/portal/settings", label: "Settings", icon: SettingsIcon },
];

export const CONSOLE_NAV: NavItem[] = [
  { href: "/console", label: "My queue", icon: InboxIcon, exact: true, badge: "queue" },
  { href: "/console/tasks", label: "Tasks", icon: ListTodoIcon },
  { href: "/console/clients", label: "Clients", icon: Building2Icon },
  { href: "/console/repositories", label: "Repositories", icon: FolderGit2Icon },
  { href: "/console/ops", label: "Ops dashboard", icon: GaugeIcon, roles: ["fp_manager"] },
  { href: "/console/integrations", label: "Agents & integrations", icon: PlugIcon },
  {
    href: "#agents",
    label: "Agents",
    icon: BotIcon,
    disabled: { reason: "Phase 2 · coming soon" },
  },
  {
    href: "#incidents",
    label: "Incidents",
    icon: SirenIcon,
    disabled: { reason: "Phase 3 · coming soon" },
  },
];

/** Static labels for breadcrumb segments. Dynamic ids are labelled by pages. */
export const SEGMENT_LABEL: Record<string, string> = {
  portal: "Portal",
  console: "Console",
  applications: "Applications",
  work: "Work",
  approvals: "Approvals",
  evidence: "Evidence",
  reports: "Reports",
  settings: "Settings",
  onboarding: "Onboarding",
  tasks: "Tasks",
  clients: "Clients",
  repositories: "Repositories",
  ops: "Ops dashboard",
  integrations: "Agents & integrations",
  dev: "Developer",
  components: "Component gallery",
};

export { ActivityIcon };
