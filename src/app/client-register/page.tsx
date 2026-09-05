"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client accounts are invite-only (see /portal/register). This route predates
 * that model and used to let anyone self-register a client account with no
 * organization link — redirect instead of leaving a dead-end signup form live.
 */
export default function ClientRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Redirecting to Client Hub...
    </div>
  );
}
