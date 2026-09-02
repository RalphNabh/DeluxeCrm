import { cookies } from "next/headers";
import AppShell from "@/components/layout/app-shell";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  return <AppShell initialSidebarCollapsed={initialSidebarCollapsed}>{children}</AppShell>;
}
