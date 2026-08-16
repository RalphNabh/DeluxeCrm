"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState<{
    email?: string;
    clientName?: string;
    orgName?: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setInviteError("This invite link is missing a token.");
      return;
    }
    fetch(`/api/portal/invitations?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setInviteError(data.error || "Invalid invitation");
          return;
        }
        setInvite(data);
      })
      .catch(() => setInviteError("Could not load invitation"));
  }, [token]);

  // If they already signed in (e.g. after a previous confirm-email attempt),
  // finish linking the invite without creating a new account.
  useEffect(() => {
    if (!token || !invite?.email || linking) return;

    let cancelled = false;
    const linkIfSignedIn = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email || cancelled) return;

      if (user.email.toLowerCase() !== invite.email!.toLowerCase()) {
        setError(
          `You're signed in as ${user.email}, but this invite is for ${invite.email}. Sign out and try again.`,
        );
        return;
      }

      setLinking(true);
      const acceptRes = await fetch("/api/portal/invitations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (cancelled) return;
      if (!acceptRes.ok) {
        const err = await acceptRes.json().catch(() => ({}));
        setError(err.error || "Failed to accept invitation");
        setLinking(false);
        return;
      }
      router.push("/portal");
    };

    void linkIfSignedIn();
    return () => {
      cancelled = true;
    };
  }, [token, invite?.email, linking, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid invitation link");
      return;
    }
    if (!invite?.email) {
      setError("Invitation email is missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email || invite.email,
        password,
      });
      if (signInError) {
        setError(
          "Your account is ready. Sign in to the Client Hub with this email and password.",
        );
        setLoading(false);
        return;
      }

      router.push("/portal");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (inviteError) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Client Hub</CardTitle>
          <CardDescription>{inviteError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/portal/login" className="text-teal-800 font-medium hover:underline">
            Go to Client Hub login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join Client Hub</CardTitle>
        <CardDescription>
          {invite?.orgName
            ? `${invite.orgName} invited you as ${invite.clientName ?? "a client"}`
            : "Create your client portal account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={invite?.email || ""}
              disabled
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This must match the email your contractor invited.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Choose a password
            </label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || linking || !token || !invite?.email}
          >
            {loading || linking ? "Setting up…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link
            href="/portal/login"
            className="text-teal-800 font-medium hover:underline"
          >
            Sign in to the Client Hub
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function PortalRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
