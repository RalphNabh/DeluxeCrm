"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, X } from "lucide-react";
import UserProfile from "@/components/layout/user-profile";
import { Button } from "@/components/ui/button";
import { SIDEBAR_ITEMS, isNavItemActive, type NavItem } from "@/lib/navigation";

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
  const resolvedItems: readonly NavItem[] =
    items && items.length > 0
      ? (items as readonly NavItem[])
      : SIDEBAR_ITEMS;

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
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-slate-900 border-r border-slate-800
          flex flex-col h-screen transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-6 flex-shrink-0 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xl font-bold bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent tracking-tight"
          >
            DyluxePro
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto min-h-0" aria-label="Primary">
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
                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
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
