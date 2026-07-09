"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CheckEmailPanel from "@/components/auth/check-email-panel";
import { createClient } from "@/lib/supabase/client";
import {
  getEmailConfirmationRedirectUrl,
  SIGNUP_PENDING_EMAIL_KEY,
} from "@/lib/auth-email-redirect";

function SignupConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email")?.trim() ?? "";

  const [showPostSignup, setShowPostSignup] = useState(false);
  const [ready, setReady] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!emailParam || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam)) {
      router.replace("/signup");
      return;
    }

    const pending = sessionStorage.getItem(SIGNUP_PENDING_EMAIL_KEY);
    if (pending && pending.toLowerCase() === emailParam.toLowerCase()) {
      sessionStorage.removeItem(SIGNUP_PENDING_EMAIL_KEY);
      setShowPostSignup(true);
    }

    setReady(true);
  }, [emailParam, router]);

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailParam,
        options: {
          emailRedirectTo: getEmailConfirmationRedirectUrl(),
        },
      });
      if (error) {
        setMessage(error.message || "Failed to resend email. Please try again.");
      } else {
        setMessage("Confirmation email sent! Please check your inbox.");
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <CheckEmailPanel
        email={emailParam}
        variant={showPostSignup ? "post-signup" : "pending-verification"}
        message={message}
        resending={resending}
        onResend={handleResend}
      />
    </div>
  );
}

export default function SignupConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      }
    >
      <SignupConfirmContent />
    </Suspense>
  );
}
