"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageSidebar from "@/components/layout/page-sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <PageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden print:hidden">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-11 shrink-0 p-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/dashboard"
            className="text-lg font-bold text-teal-600"
          >
            DyluxePro
          </Link>
        </div>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
