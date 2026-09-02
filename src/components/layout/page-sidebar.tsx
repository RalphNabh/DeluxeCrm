"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LucideIcon, X } from "lucide-react";
import UserProfile from "@/components/layout/user-profile";
import SidebarNavItem from "@/components/layout/sidebar-nav-item";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isNavItemActive, navItemsForRole, type NavItem } from "@/lib/navigation";
import { useCurrentMemberQuery } from "@/lib/query/hooks";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { UNREAD_CHANGED_EVENT } from "@/lib/messaging/unread-badge";
import { REQUESTS_UNREAD_CHANGED_EVENT } from "@/lib/requests/unread-badge";

/**
 * Legacy item shape used by older pages that pass `items` directly.
 * New code should rely on the shared SIDEBAR_ITEMS source of truth and
 * let PageSidebar auto-detect the active route via usePathname().
 */
interface LegacySidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

interface PageSidebarProps {
  /**
   * Optional override of the shared sidebar list. Prefer omitting this
   * so the shared list in src/lib/navigation.ts stays the single source
   * of truth. The `active` flag is ignored — active state is derived
   * from the current pathname.
   */
  items?: LegacySidebarItem[] | readonly NavItem[];
  isOpen?: boolean;
  onClose?: () => void;
  /** SSR-derived initial value (from the `sidebar-collapsed` cookie) so first paint matches the saved preference. */
  initialCollapsed?: boolean;
}

export default function PageSidebar({ items, isOpen = false, onClose, initialCollapsed = false }: PageSidebarProps) {
  const pathname = usePathname();
  const { data: member } = useCurrentMemberQuery();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed(initialCollapsed);

  useEffect(() => {
    if (!member?.role) return;
    const load = () => {
      fetch("/api/conversations/unread-summary")
        .then((r) => (r.ok ? r.json() : { total: 0 }))
        .then((d) => setUnreadMessages(Number(d?.total) || 0))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60_000);
    window.addEventListener(UNREAD_CHANGED_EVENT, load);
    return () => {
      clearInterval(interval);
      window.removeEventListener(UNREAD_CHANGED_EVENT, load);
    };
  }, [member?.role, pathname]);

  useEffect(() => {
    if (!member?.role) return;
    const load = () => {
      fetch("/api/requests/unread-summary")
        .then((r) => (r.ok ? r.json() : { total: 0 }))
        .then((d) => setUnreadRequests(Number(d?.total) || 0))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60_000);
    window.addEventListener(REQUESTS_UNREAD_CHANGED_EVENT, load);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REQUESTS_UNREAD_CHANGED_EVENT, load);
    };
  }, [member?.role, pathname]);

  // Until the role is known, show the unfiltered list rather than flashing a
  // shortened menu and then expanding it.
  const resolvedItems: readonly NavItem[] =
    items && items.length > 0
      ? (items as readonly NavItem[])
      : navItemsForRole(member?.role);

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked.
    if (onClose && typeof window !== "undefined" && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden print:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        data-tutorial="navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,85vw)] flex-col",
          "relative border-r border-slate-800 bg-slate-900",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          "transition-transform duration-300 ease-in-out print:hidden",
          "md:sticky md:top-0 md:z-auto md:h-dvh md:translate-x-0 md:flex-shrink-0 md:self-start",
          "md:transition-[width] md:duration-300 md:ease-in-out motion-reduce:md:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-20" : "md:w-64",
        )}
      >
        <div
          className={cn(
            "flex flex-shrink-0 items-center justify-between p-6",
            collapsed && "md:justify-center md:px-3",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-xl font-bold tracking-tight text-transparent",
              collapsed && "md:hidden",
            )}
          >
            DyluxePro
          </Link>
          <Link
            href="/dashboard"
            aria-label="DyluxePro"
            className={cn("hidden", collapsed && "md:block")}
          >
            <Image
              src="/logo.png"
              alt="DyluxePro"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
          </Link>
          <Button
            variant="ghost"
            className="h-11 w-11 p-0 text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav id="primary-navigation" className="min-h-0 flex-1 overflow-y-auto px-4" aria-label="Primary">
          <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <ul className="space-y-1">
              {resolvedItems.map((item) => {
                const active = isNavItemActive(item, pathname);
                const unreadCount =
                  item.href === "/messages"
                    ? unreadMessages
                    : item.href === "/requests"
                      ? unreadRequests
                      : 0;
                return (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={active}
                    collapsed={collapsed}
                    unreadCount={unreadCount}
                    onClick={handleLinkClick}
                  />
                );
              })}
            </ul>
          </TooltipProvider>
        </nav>

        <div className="flex-shrink-0 mt-auto">
          <div className="hidden border-t border-slate-800 p-3 md:flex md:justify-center">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              aria-controls="primary-navigation"
              className="flex h-9 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm transition-colors
                         hover:bg-white hover:text-slate-900
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <ArrowLeft
                className={cn(
                  "h-5 w-5 transition-transform duration-300 ease-in-out motion-reduce:transition-none",
                  collapsed && "rotate-180",
                )}
              />
            </button>
          </div>
          <div className="border-t border-slate-800">
            <UserProfile collapsed={collapsed} />
          </div>
        </div>
      </aside>
    </>
  );
}
