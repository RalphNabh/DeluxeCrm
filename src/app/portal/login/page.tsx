"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const personaRes = await fetch("/api/auth/persona?prefer=client");
    const persona = await personaRes.json();

    // Client Hub login is portal-only. Wrong accounts are signed out.
    if (!persona.hasPortalAccess) {
      await supabase.auth.signOut();
      setError(
        persona.hasCrmAccess
          ? "This is a contractor account. Use CRM login instead."
          : "This email isn’t linked to Client Hub yet. Open the invite link from your contractor to finish setup.",
      );
      setLoading(false);
      return;
    }

    router.push("/portal");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Client Hub</CardTitle>
          <CardDescription>
            Sign in to view estimates, pay invoices, and request work from your contractor.
            Access is by invitation - check your email for a Client Hub invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-gray-600">
            Contractor?{" "}
            <Link href="/login" className="text-teal-800 font-medium hover:underline">
              Sign in to the CRM
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
