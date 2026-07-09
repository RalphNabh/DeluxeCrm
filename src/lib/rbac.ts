import type { OrgRole } from "@/lib/org";

export type Permission =
  | "billing"
  | "invite_team"
  | "manage_clients"
  | "view_all_clients"
  | "view_assigned_clients"
  | "create_estimates"
  | "create_invoices"
  | "view_assigned_jobs"
  | "manage_jobs"
  | "submit_requests"
  | "messaging"
  | "manage_requests";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "billing",
    "invite_team",
    "manage_clients",
    "view_all_clients",
    "create_estimates",
    "create_invoices",
    "view_assigned_jobs",
    "manage_jobs",
    "messaging",
    "manage_requests",
  ],
  admin: [
    "invite_team",
    "manage_clients",
    "view_all_clients",
    "create_estimates",
    "create_invoices",
    "view_assigned_jobs",
    "manage_jobs",
    "messaging",
    "manage_requests",
  ],
  manager: [
    "manage_clients",
    "view_all_clients",
    "create_estimates",
    "create_invoices",
    "view_assigned_jobs",
    "manage_jobs",
    "messaging",
    "manage_requests",
  ],
  worker: ["view_assigned_clients", "view_assigned_jobs", "messaging"],
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isManagerOrAbove(role: OrgRole): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canInviteTeam(role: OrgRole): boolean {
  return hasPermission(role, "invite_team");
}

export function getDefaultRouteForRole(role: OrgRole): string {
  if (role === "worker") return "/field";
  return "/dashboard";
}

export const CLIENT_PERMISSIONS: Permission[] = [
  "submit_requests",
  "messaging",
];

export function isClientPersona(persona: string | null | undefined): boolean {
  return persona === "client";
}
