"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CheckEmailPanel from "@/components/auth/check-email-panel";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getEmailConfirmationRedirectUrl } from "@/lib/auth-email-redirect";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkStatus = async () => {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/login");
      return null;
    }

    setEmail(user.email ?? null);

    if (user.email_confirmed_at) {
      setVerified(true);
      setMessage("Email verified successfully! Redirecting…");
      setTimeout(() => router.push("/account-verified"), 1500);
      return user;
    }

    return user;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await checkStatus();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.user?.email_confirmed_at
      ) {
        setVerified(true);
        setMessage("Email verified successfully! Redirecting…");
        setTimeout(() => router.push("/account-verified"), 1500);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
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

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const user = await checkStatus();
      if (user && !user.email_confirmed_at) {
        setMessage(
          "Email not verified yet. Please click the link in your inbox, then try again.",
        );
      }
    } catch {
      setMessage("Could not refresh status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-emerald-700">
              Email verified!
            </p>
            <p className="text-sm text-gray-600">Taking you to your account…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <CheckEmailPanel
        email={email}
        variant="pending-verification"
        message={message}
        resending={resending}
        onResend={handleResend}
        onCheckStatus={handleCheckStatus}
        checkingStatus={checking}
      />
    </div>
  );
}
