"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState<{ email?: string; clientName?: string; orgName?: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    fetch(`/api/portal/invitations?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setInvite(data);
        if (data.email) setEmail(data.email);
      });
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid invitation link");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_type: "client" } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      const acceptRes = await fetch("/api/portal/invitations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        setError(err.error || "Failed to accept invitation");
        setLoading(false);
        return;
      }
      router.push("/portal");
    }
    setLoading(false);
  };

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
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!invite?.email}
            required
          />
          <Input
            type="password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center">
          <Link href="/portal/login" className="text-blue-600 hover:underline">
            Already have an account? Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function PortalRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
