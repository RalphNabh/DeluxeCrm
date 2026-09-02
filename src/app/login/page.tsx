"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupOAuthButtons } from "@/components/signup/signup-oauth-buttons";
import { createClient } from "@/lib/supabase/client";
import { formatAuthErrorMessage } from "@/lib/auth-email-redirect";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not verified")) {
          router.push(`/signup/confirm?email=${encodeURIComponent(email.trim())}`);
          return;
        }
        setError(formatAuthErrorMessage(error.message));
      } else {
        // Check if email is verified
        if (data.user && !data.user.email_confirmed_at) {
          router.push("/verify-email");
        } else {
          const personaRes = await fetch("/api/auth/persona?prefer=contractor");
          const persona = await personaRes.json();

          // CRM login is contractor-only. Clients are signed out and pointed to Hub.
          if (!persona.hasCrmAccess) {
            await supabase.auth.signOut();
            setError(
              persona.hasPortalAccess
                ? "This is a Client Hub account. Use Client login instead."
                : "This account does not have CRM access.",
            );
            return;
          }

          const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
          router.push(safeNext || persona.redirectTo || "/home");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to DyluxePro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Manage your contracting business with our professional CRM
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Create a new account
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Contractor Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
                <div className="flex justify-end mt-1">
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </Link>
                </div>
              </div>
              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>

              <SignupOAuthButtons mode="login" disabled={loading} onError={setError} />
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-gray-600">
          Client?{" "}
          <Link href="/portal/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in to the Client Hub
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}