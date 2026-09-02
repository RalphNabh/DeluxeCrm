"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

/**
 * Module-level cache so the desktop sidebar's collapsed state survives the
 * full unmount/remount that happens on every top-level section navigation
 * (each route group has its own layout.tsx, so PageSidebar is not a stable
 * element across navigations). Only the very first mount in a tab pays the
 * cost of reading localStorage; every later remount reads this synchronously.
 */
let cachedValue: boolean | null = null;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * `initialCollapsed` comes from the `sidebar-collapsed` cookie, read server-side
 * in crm-layout.tsx, so the very first paint (SSR + hydration) already matches
 * the user's saved preference — no flash of the wrong width on a hard reload.
 * localStorage remains the source of truth after that (kept in sync with the
 * cookie on every toggle) and is what the module-level cache above reads from.
 */
export function useSidebarCollapsed(initialCollapsed = false) {
  const [collapsed, setCollapsedState] = useState<boolean>(() =>
    cachedValue !== null ? cachedValue : initialCollapsed,
  );

  useIsomorphicLayoutEffect(() => {
    if (cachedValue !== null) return;
    let stored = initialCollapsed;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      stored = initialCollapsed;
    }
    cachedValue = stored;
    if (stored !== collapsed) setCollapsedState(stored);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    cachedValue = value;
    setCollapsedState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* private browsing / storage disabled — degrade to in-memory only */
    }
    try {
      document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      /* cookies unavailable — SSR just falls back to the default next load */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return { collapsed, setCollapsed, toggle };
}
