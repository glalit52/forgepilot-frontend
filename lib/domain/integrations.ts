import type { IntegrationCategory } from "@/lib/schemas";

export interface IntegrationProvider {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  availability: "available" | "phase_2" | "phase_3";
  scopes: string[];
  /** Short monogram used as a neutral icon (no third-party logos). */
  monogram: string;
}

export const INTEGRATION_CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  source_control: "Source control",
  work_intake: "Work intake",
  notifications: "Notifications",
  security: "Security scanning",
  identity: "Identity & SSO",
  observability: "Observability & alerts",
  agents: "Coding agents",
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  { id: "github", name: "GitHub", category: "source_control", monogram: "GH", availability: "available", description: "Read repositories, open pull requests and post verification checks.", scopes: ["repo:read", "pull_request:write", "checks:write"] },
  { id: "gitlab", name: "GitLab", category: "source_control", monogram: "GL", availability: "available", description: "Read projects, open merge requests and post pipeline status.", scopes: ["read_repository", "api"] },
  { id: "bitbucket", name: "Bitbucket", category: "source_control", monogram: "BB", availability: "available", description: "Read repositories and open pull requests.", scopes: ["repository", "pullrequest:write"] },
  { id: "azure_devops", name: "Azure DevOps", category: "source_control", monogram: "AZ", availability: "available", description: "Read Azure Repos and open pull requests.", scopes: ["vso.code_write"] },
  { id: "jira", name: "Jira", category: "work_intake", monogram: "JI", availability: "available", description: "Link tasks to tickets and post status back as comments.", scopes: ["issues:read", "comments:write"] },
  { id: "servicenow", name: "ServiceNow", category: "work_intake", monogram: "SN", availability: "phase_2", description: "Create tasks from change requests and incidents automatically.", scopes: ["change_request:read"] },
  { id: "linear", name: "Linear", category: "work_intake", monogram: "LI", availability: "phase_2", description: "Create tasks from Linear issues.", scopes: ["issues:read"] },
  { id: "slack", name: "Slack", category: "notifications", monogram: "SL", availability: "available", description: "Approval requests and SLA alerts in a channel you choose.", scopes: ["chat:write"] },
  { id: "teams", name: "Microsoft Teams", category: "notifications", monogram: "MT", availability: "available", description: "Approval requests and SLA alerts in Teams.", scopes: ["ChannelMessage.Send"] },
  { id: "email", name: "Email digest", category: "notifications", monogram: "EM", availability: "available", description: "Daily digest of approvals, evidence and SLA status.", scopes: [] },
  { id: "snyk", name: "Snyk", category: "security", monogram: "SY", availability: "available", description: "Import open vulnerabilities into the health score and backlog.", scopes: ["projects:read"] },
  { id: "sonarqube", name: "SonarQube", category: "security", monogram: "SQ", availability: "available", description: "Import code-quality and coverage results.", scopes: ["browse"] },
  { id: "okta", name: "Okta", category: "identity", monogram: "OK", availability: "phase_2", description: "Single sign-on and user provisioning (SCIM).", scopes: ["openid", "profile"] },
  { id: "entra", name: "Microsoft Entra ID", category: "identity", monogram: "EN", availability: "phase_2", description: "Single sign-on with Entra ID (Azure AD).", scopes: ["openid", "profile"] },
  { id: "datadog", name: "Datadog", category: "observability", monogram: "DD", availability: "phase_3", description: "Alert intake and change-linked root cause.", scopes: ["monitors_read"] },
  { id: "pagerduty", name: "PagerDuty", category: "observability", monogram: "PD", availability: "phase_3", description: "Incident intake and on-call routing.", scopes: ["incidents:read"] },
];

/** Agent runtimes ForgePilot runs internally (console only). */
export const AGENT_RUNTIMES = [
  { id: "claude_code", name: "Claude Code", models: ["claude-sonnet", "claude-opus"], status: "active" as const, sandbox: "Isolated container per task, no prod credentials" },
  { id: "codex", name: "OpenAI Codex", models: ["gpt-codex"], status: "active" as const, sandbox: "Isolated container per task, no prod credentials" },
  { id: "devin", name: "Devin", models: ["devin"], status: "phase_2" as const, sandbox: "Planned for Phase 2 routing" },
];

export function providerById(id: string) {
  return INTEGRATION_PROVIDERS.find((p) => p.id === id);
}
