"use client";

import Link from "next/link";
import { LucideIcon, X } from "lucide-react";
import UserProfile from "@/components/layout/user-profile";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

interface PageSidebarProps {
  items: SidebarItem[];
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PageSidebar({ items, isOpen = false, onClose }: PageSidebarProps) {
  const handleLinkClick = (e: React.MouseEvent) => {
    // Close sidebar on mobile when a link is clicked
    // Check if we're on mobile (screen width < 768px = md breakpoint)
    if (onClose && typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay - only show on mobile when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {/* On desktop (md+): always visible (md:translate-x-0)
          On mobile: controlled by isOpen state */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-slate-800 border-r border-slate-700 
          flex flex-col h-screen transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 flex-shrink-0 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-teal-400">
            DyluxePro
          </Link>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="flex-1 px-4 overflow-y-auto min-h-0">
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      item.active
                        ? "bg-teal-500/20 text-teal-300 border-r-2 border-teal-400"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-shrink-0 mt-auto">
          <UserProfile />
        </div>
      </div>
    </>
  );
}

