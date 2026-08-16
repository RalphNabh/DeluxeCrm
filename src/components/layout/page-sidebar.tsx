"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, X } from "lucide-react";
import UserProfile from "@/components/layout/user-profile";
import { Button } from "@/components/ui/button";
import { isNavItemActive, navItemsForRole, type NavItem } from "@/lib/navigation";
import { useCurrentMemberQuery } from "@/lib/query/hooks";

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
}

export default function PageSidebar({ items, isOpen = false, onClose }: PageSidebarProps) {
  const pathname = usePathname();
  const { data: member } = useCurrentMemberQuery();

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
        className={`
          fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,85vw)] flex-col
          border-r border-slate-800 bg-slate-900
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          transition-transform duration-300 ease-in-out print:hidden
          md:sticky md:top-0 md:z-auto md:h-dvh md:w-64 md:translate-x-0 md:flex-shrink-0 md:self-start
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex flex-shrink-0 items-center justify-between p-6">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-xl font-bold tracking-tight text-transparent"
          >
            DyluxePro
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

        <nav className="min-h-0 flex-1 overflow-y-auto px-4" aria-label="Primary">
          <ul className="space-y-1">
            {resolvedItems.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-teal-500/15 text-teal-200 ring-1 ring-inset ring-teal-400/30"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                        active ? "text-teal-300" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-shrink-0 mt-auto border-t border-slate-800">
          <UserProfile />
        </div>
      </aside>
    </>
  );
}
