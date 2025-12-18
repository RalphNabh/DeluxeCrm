"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import UserProfile from "@/components/layout/user-profile";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

interface PageSidebarProps {
  items: SidebarItem[];
}

export default function PageSidebar({ items }: PageSidebarProps) {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transition-colors">
      <div className="p-6 flex-shrink-0">
        <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
          DyluxePro
        </Link>
      </div>
      
      <nav className="flex-1 px-4 overflow-y-auto min-h-0">
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
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
  );
}

