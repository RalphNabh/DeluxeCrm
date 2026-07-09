"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function InviteAcceptContent() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [invite, setInvite] = useState<{ email?: string; role?: string; orgName?: string } | null>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/org/invitations/${token}`)
      .then((r) => r.json())
      .then(setInvite)
      .catch(() => setError("Invalid invitation"));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, [token]);

  const acceptInvite = async () => {
    setAccepting(true);
    const res = await fetch(`/api/org/invitations/${token}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to accept");
      setAccepting(false);
      return;
    }
    router.push(data.redirectTo || "/dashboard");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Team invitation</CardTitle>
        <CardDescription>
          {invite?.orgName
            ? `Join ${invite.orgName} as ${invite?.role ?? "team member"}`
            : "Loading invitation..."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invite?.email && (
          <p className="text-sm text-gray-600">
            This invite was sent to <strong>{invite.email}</strong>
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loggedIn ? (
          <Button onClick={acceptInvite} disabled={accepting} className="w-full">
            {accepting ? "Accepting..." : "Accept invitation"}
          </Button>
        ) : (
          <>
            <p className="text-sm text-gray-600">Sign in or create an account to accept.</p>
            <Link href={`/login?redirect=/invite/${token}`}>
              <Button className="w-full">Sign in to accept</Button>
            </Link>
            <Link href={`/signup?redirect=/invite/${token}`}>
              <Button variant="outline" className="w-full">Create account</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense>
        <InviteAcceptContent />
      </Suspense>
    </div>
  );
}
