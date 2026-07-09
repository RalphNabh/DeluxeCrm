"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientLogin() {
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
