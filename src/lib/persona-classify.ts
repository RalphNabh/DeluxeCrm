export type PersonaType = "contractor" | "client";
export type PersonaPrefer = "client" | "contractor";

export type PersonaResult = {
  type: PersonaType;
  redirectTo: string;
  hasPortalAccess: boolean;
  hasCrmAccess: boolean;
  orgId?: string;
  role?: "owner" | "admin" | "manager" | "worker";
  clientId?: string;
};

type PortalRow = {
  client_id: string;
  organization_id: string;
};

type MembershipRow = {
  org_id: string;
  role: "owner" | "admin" | "manager" | "worker";
};

function crmHome(role: MembershipRow["role"]): string {
  return role === "worker" ? "/field" : "/dashboard";
}

/**
 * Hub vs CRM is based on portal membership and org membership, not the
 * user_profiles.persona column.
 *
 * `prefer` is the login door:
 * - prefer=client  → Client Hub only (requires portal access)
 * - prefer=contractor → CRM only (requires org membership)
 * Without prefer, portal-only → client; membership → contractor.
 */
export function classifyPersona(
  portal: PortalRow | null,
  membership: MembershipRow | null,
  prefer?: PersonaPrefer,
): PersonaResult {
  const hasPortalAccess = Boolean(portal);
  const hasCrmAccess = Boolean(membership);

  if (prefer === "client") {
    if (portal) {
      return {
        type: "client",
        redirectTo: "/portal",
        hasPortalAccess: true,
        hasCrmAccess,
        orgId: portal.organization_id,
        clientId: portal.client_id,
        role: membership?.role,
      };
    }
    // Wrong door: contractor (or unknown) used Client Hub login
    return {
      type: "contractor",
      redirectTo: "/login",
      hasPortalAccess: false,
      hasCrmAccess,
      orgId: membership?.org_id,
      role: membership?.role,
    };
  }

  if (prefer === "contractor") {
    if (membership) {
      return {
        type: "contractor",
        redirectTo: crmHome(membership.role),
        hasPortalAccess,
        hasCrmAccess: true,
        orgId: membership.org_id,
        role: membership.role,
        clientId: portal?.client_id,
      };
    }
    // Wrong door: client (or unknown) used CRM login
    return {
      type: "client",
      redirectTo: "/portal/login",
      hasPortalAccess,
      hasCrmAccess: false,
      orgId: portal?.organization_id,
      clientId: portal?.client_id,
    };
  }

  if (portal && !membership) {
    return {
      type: "client",
      redirectTo: "/portal",
      hasPortalAccess: true,
      hasCrmAccess: false,
      orgId: portal.organization_id,
      clientId: portal.client_id,
    };
  }

  if (membership) {
    return {
      type: "contractor",
      redirectTo: crmHome(membership.role),
      hasPortalAccess,
      hasCrmAccess: true,
      orgId: membership.org_id,
      role: membership.role,
      clientId: portal?.client_id,
    };
  }

  if (portal) {
    return {
      type: "client",
      redirectTo: "/portal",
      hasPortalAccess: true,
      hasCrmAccess: false,
      orgId: portal.organization_id,
      clientId: portal.client_id,
    };
  }

  return {
    type: "contractor",
    redirectTo: "/dashboard",
    hasPortalAccess: false,
    hasCrmAccess: false,
  };
}
