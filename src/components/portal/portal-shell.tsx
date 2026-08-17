"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out";
import { cn } from "@/lib/utils";

type PortalMe = {
  email?: string | null;
  client?: { name: string; email: string | null };
  organization?: { name: string };
};

const NAV = [
  { href: "/portal", label: "Home", exact: true },
  { href: "/portal/requests", label: "Requests" },
  { href: "/portal/messages", label: "Messages" },
];

export default function PortalShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<PortalMe | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/portal/login");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setMe(d));
  }, [router]);

  useEffect(() => {
    const loadUnread = () => {
      fetch("/api/portal/conversations/unread-summary")
        .then((r) => r.json())
        .then((d) => setUnreadMessages(Number(d?.total) || 0))
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30_000);
    return () => clearInterval(interval);
  }, [pathname]);

  const orgName = me?.organization?.name ?? "Client Hub";
  const clientName = me?.client?.name;
  const email = me?.client?.email ?? me?.email;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              Client Hub
            </p>
            <p className="text-lg font-semibold text-slate-900 truncate">
              {orgName}
            </p>
            {(clientName || email) && (
              <p className="text-sm text-slate-600 truncate">
                {clientName ? `Signed in as ${clientName}` : "Signed in"}
                {email ? ` · ${email}` : ""}
              </p>
            )}
          </div>
          <SignOutButton />
        </div>
        <nav className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto pb-px">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap relative",
                  active
                    ? "bg-slate-50 text-teal-800 border-b-2 border-teal-700"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {item.label}
                {item.href === "/portal/messages" && unreadMessages > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      {title && (
        <div className="max-w-3xl mx-auto px-4 pt-5">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        </div>
      )}
      {children}
    </div>
  );
}
