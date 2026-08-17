import type { LucideIcon } from "lucide-react";
import type { OrgRole } from "@/lib/org";
import { hasPermission, type Permission } from "@/lib/rbac";
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Calendar,
  CheckSquare,
  Package,
  BarChart3,
  UsersRound,
  Zap,
  Gift,
  Settings,
  Inbox,
  MessageSquare,
} from "lucide-react";

/**
 * Single source of truth for the authenticated sidebar navigation.
 * Order, labels, and routes must change here only — not per page.
 *
 * Adding a new section? Add it here once.
 * Reordering? Reorder here once.
 */
export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  /**
   * Permission a user must hold for this section to appear. Omitted means every
   * member sees it. Mirrors what the API routes enforce, so the sidebar does not
   * offer a worker links that return 403.
   */
  permission?: Permission;
}

export const SIDEBAR_ITEMS: readonly NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: "view_all_clients" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates", permission: "create_estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices", permission: "create_invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: Package, label: "Materials", href: "/materials" },
  { icon: BarChart3, label: "Reports", href: "/reports", permission: "view_all_clients" },
  { icon: UsersRound, label: "Team", href: "/team", permission: "invite_team" },
  { icon: Inbox, label: "Requests", href: "/requests", permission: "manage_requests" },
  { icon: MessageSquare, label: "Messages", href: "/messages", permission: "messaging" },
  { icon: Zap, label: "Automations", href: "/automations", permission: "manage_requests" },
  { icon: Gift, label: "Affiliates", href: "/affiliates", permission: "billing" },
  { icon: Settings, label: "Settings", href: "/settings" },
] as const;

/** The sections a given role should see. */
export function navItemsForRole(
  role: OrgRole | null | undefined,
): readonly NavItem[] {
  if (!role) return SIDEBAR_ITEMS;
  return SIDEBAR_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  );
}

/**
 * Determines which nav item should be marked active for a given pathname.
 * Uses prefix matching so /clients/123 highlights the "Clients" entry.
 * Dashboard is exact-match only (otherwise it would always win).
 */
export function isNavItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
