"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Check your email for a password reset link.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Enter your account email and we&apos;ll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:underline">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
