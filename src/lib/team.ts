import type { OrgRole } from "@/lib/org";

/** How a role is written in the database versus shown in the UI. */
const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  worker: "Worker",
};

export type TeamMemberStatus = "Active" | "Invited" | "Disabled" | "Expired";

/**
 * A row on the Team page. Covers both people who have accepted and people who
 * have only been invited, because the page shows one list.
 */
export type TeamMemberView = {
  id: string;
  /** Distinguishes a membership from an invitation, since actions differ. */
  kind: "member" | "invitation";
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: TeamMemberStatus;
  joined_at: string;
  last_active?: string | null;
  jobs_completed: number;
  total_hours: number;
  avatar?: string | null;
  /** Present for pending invitations so the UI can offer the link again. */
  invite_token?: string;
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as OrgRole] ?? "Worker";
}

/** Convert a UI role label back to the value the database constrains to. */
export function roleValue(label: string): OrgRole {
  const match = (Object.keys(ROLE_LABELS) as OrgRole[]).find(
    (role) => ROLE_LABELS[role].toLowerCase() === label.toLowerCase(),
  );
  return match ?? "worker";
}

export function membershipStatusLabel(status: string): TeamMemberStatus {
  if (status === "active") return "Active";
  if (status === "disabled") return "Disabled";
  return "Invited";
}

/** Fall back to the local part of an email when nobody has set a name yet. */
export function displayNameFor(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  const localPart = email?.split("@")[0];
  return localPart || "Team member";
}
