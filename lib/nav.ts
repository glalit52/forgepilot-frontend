import {
  BarChart3Icon,
  BugIcon,
  CheckSquareIcon,
  CreditCardIcon,
  FlaskConicalIcon,
  FolderKanbanIcon,
  GitPullRequestIcon,
  HeartPulseIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PackageIcon,
  PlugIcon,
  RadarIcon,
  SettingsIcon,
  ShieldAlertIcon,
  TerminalSquareIcon,
  BoxesIcon,
  BotIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { Module } from "@/lib/schemas";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "approvals" | "review";
}
export interface NavGroup {
  label?: string;
  module?: Module;
  items: NavItem[];
}

/** PRD §11.1 primary navigation. */
export const NAV: NavGroup[] = [
  {
    items: [
      { href: "/app", label: "Overview", icon: LayoutDashboardIcon, exact: true },
      { href: "/app/projects", label: "Projects", icon: FolderKanbanIcon },
    ],
  },
  {
    label: "DevPilot",
    module: "devpilot",
    items: [
      { href: "/app/devpilot", label: "Command centre", icon: BotIcon, exact: true },
      { href: "/app/devpilot/tasks", label: "Tasks", icon: ListChecksIcon },
      { href: "/app/devpilot/sessions", label: "Sessions", icon: TerminalSquareIcon },
      { href: "/app/devpilot/workspaces", label: "Workspaces", icon: BoxesIcon },
    ],
  },
  {
    label: "ShipSafe",
    module: "shipsafe",
    items: [
      { href: "/app/shipsafe", label: "Testing dashboard", icon: RadarIcon, exact: true },
      { href: "/app/shipsafe/suites", label: "Test suites", icon: FlaskConicalIcon },
      { href: "/app/shipsafe/runs", label: "Verification runs", icon: ListChecksIcon },
      { href: "/app/shipsafe/bugs", label: "Bugs", icon: BugIcon },
    ],
  },
  {
    label: "CodeKeeper",
    module: "codekeeper",
    items: [
      { href: "/app/codekeeper", label: "Repository health", icon: HeartPulseIcon, exact: true },
      { href: "/app/codekeeper/dependencies", label: "Dependencies", icon: PackageIcon },
      { href: "/app/codekeeper/findings", label: "Security findings", icon: ShieldAlertIcon },
      { href: "/app/codekeeper/maintenance", label: "Maintenance tasks", icon: WrenchIcon },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/app/pull-requests", label: "Pull requests", icon: GitPullRequestIcon, badge: "review" },
      { href: "/app/approvals", label: "Approvals", icon: CheckSquareIcon, badge: "approvals" },
      { href: "/app/analytics", label: "Analytics", icon: BarChart3Icon },
      { href: "/app/integrations", label: "Integrations", icon: PlugIcon },
      { href: "/app/billing", label: "Usage & billing", icon: CreditCardIcon },
      { href: "/app/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export const SEGMENT_LABEL: Record<string, string> = {
  app: "Overview",
  projects: "Projects",
  repositories: "Repositories",
  devpilot: "DevPilot",
  tasks: "Tasks",
  sessions: "Sessions",
  workspaces: "Workspaces",
  shipsafe: "ShipSafe",
  suites: "Test suites",
  runs: "Verification runs",
  bugs: "Bugs",
  codekeeper: "CodeKeeper",
  dependencies: "Dependencies",
  findings: "Security findings",
  maintenance: "Maintenance tasks",
  "pull-requests": "Pull requests",
  approvals: "Approvals",
  analytics: "Analytics",
  integrations: "Integrations",
  billing: "Usage & billing",
  settings: "Settings",
};
