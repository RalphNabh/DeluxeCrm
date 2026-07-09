import type { LucideIcon } from "lucide-react";
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
}

export const SIDEBAR_ITEMS: readonly NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: Package, label: "Materials", href: "/materials" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: UsersRound, label: "Team", href: "/team" },
  { icon: Inbox, label: "Requests", href: "/requests" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings" },
] as const;

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
