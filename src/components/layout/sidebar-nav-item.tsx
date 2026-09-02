"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow } from "@/components/ui/tooltip";

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  unreadCount?: number;
  onClick?: () => void;
}

export default function SidebarNavItem({
  item,
  active,
  collapsed,
  unreadCount = 0,
  onClick,
}: SidebarNavItemProps) {
  const Icon = item.icon;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={
        collapsed
          ? `${item.label}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`
          : undefined
      }
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-lg pl-4 pr-4 py-3 text-sm font-medium",
        "transition-colors duration-150",
        "md:transition-[padding-right] md:duration-200 md:ease-out motion-reduce:md:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        active
          ? "bg-teal-500/15 text-teal-200 ring-1 ring-inset ring-teal-400/30"
          : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
        collapsed && "md:pr-0",
      )}
    >
      <span className="relative shrink-0">
        <Icon
          className={cn(
            "h-5 w-5 transition-transform group-hover:scale-110",
            active ? "text-teal-300" : "text-slate-400 group-hover:text-white",
          )}
        />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute -top-0.5 -right-0.5 hidden h-2 w-2 rounded-full bg-teal-500 ring-2 ring-slate-900",
              collapsed && "md:block",
            )}
          />
        )}
      </span>

      <span
        className={cn(
          "flex-1 truncate whitespace-nowrap",
          "md:transition-[max-width,opacity] md:duration-200 md:ease-out motion-reduce:md:transition-none",
          collapsed ? "md:max-w-0 md:opacity-0" : "md:max-w-[10rem] md:opacity-100",
        )}
      >
        {item.label}
      </span>

      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1.5 text-[10px] font-semibold text-white",
            collapsed && "md:hidden",
          )}
        >
          {displayCount}
        </span>
      )}
    </Link>
  );

  if (!collapsed) {
    return <li>{link}</li>;
  }

  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {item.label}
          {unreadCount > 0 && <span className="ml-1.5 text-teal-300">{displayCount}</span>}
          <TooltipArrow />
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
