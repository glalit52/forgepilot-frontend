import type { Role } from "@/lib/schemas";

export type Area = "portal" | "console";

export const PORTAL_ROLES: Role[] = ["client_admin", "client_approver", "client_viewer"];
export const CONSOLE_ROLES: Role[] = ["fp_engineer", "fp_manager"];

export function areaForRole(role: Role): Area {
  return PORTAL_ROLES.includes(role) ? "portal" : "console";
}

export function homeForRole(role: Role): string {
  return areaForRole(role) === "portal" ? "/portal" : "/console";
}

export function canApprove(role: Role) {
  return role === "client_admin" || role === "client_approver";
}

export function canManageTeam(role: Role) {
  return role === "client_admin";
}

export function isManager(role: Role) {
  return role === "fp_manager";
}

/** Console routes only the delivery manager may open. */
export const MANAGER_ONLY_PATHS = ["/console/ops"];

export function canAccessPath(role: Role, pathname: string): boolean {
  const area = areaForRole(role);
  if (pathname.startsWith("/portal")) return area === "portal";
  if (pathname.startsWith("/console")) {
    if (area !== "console") return false;
    if (MANAGER_ONLY_PATHS.some((p) => pathname.startsWith(p))) return isManager(role);
    return true;
  }
  return true;
}

export const SESSION_COOKIE = "fp_session";
export const ROLE_COOKIE = "fp_role";
