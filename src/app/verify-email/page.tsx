"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const checkStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !user) {
          router.push('/login');
          return;
        }

        setEmail(user.email || null);
        
        // Check if email is verified
        if (user.email_confirmed_at) {
          setVerified(true);
          setMessage('Email verified successfully! Redirecting...');
          setTimeout(() => {
            router.push('/account-verified');
          }, 2000);
        } else {
          setVerified(false);
        }
      } catch (err) {
        console.error('Error checking verification:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkStatus();
    
    // Listen for auth state changes (when email is verified)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && mounted) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          setVerified(true);
          setMessage('Email verified successfully! Redirecting...');
          setTimeout(() => {
            router.push('/account-verified');
          }, 2000);
        }
      }
    });

    // Periodically check verification status in case user verified in another tab
    const interval = setInterval(() => {
      if (mounted && !verified) {
        checkStatus();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router, verified]);

  const checkVerificationStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || null);
      
      // Check if email is verified
      if (user.email_confirmed_at) {
        setVerified(true);
        setMessage('Email verified successfully! Redirecting...');
        // Redirect to account verified page after 2 seconds
        setTimeout(() => {
          router.push('/account-verified');
        }, 2000);
      } else {
        setVerified(false);
      }
    } catch (err) {
      console.error('Error checking verification:', err);
    } finally {
      setLoading(false);
    }
  };


  const resendConfirmationEmail = async () => {
    if (!email) return;
    
    setResending(true);
    setMessage(null);
    
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setMessage('Failed to resend email. Please try again.');
      } else {
        setMessage('Confirmation email sent! Please check your inbox.');
      }
    } catch (err) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Checking verification status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-center text-green-600">Email Verified!</CardTitle>
            <CardDescription className="text-center">
              Your email has been successfully verified. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent a confirmation email to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>Please check your email and click the confirmation link to verify your account.</p>
              <p className="font-medium">You won't be able to access the app until your email is verified.</p>
            </div>

            {message && (
              <div className={`rounded-md p-4 border ${
                message.includes('sent') || message.includes('verified')
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <div className="flex items-center">
                  {message.includes('sent') || message.includes('verified') ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 mr-2" />
                  )}
                  {message}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={resendConfirmationEmail}
                disabled={resending || !email}
                variant="outline"
                className="w-full"
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Confirmation Email
                  </>
                )}
              </Button>

              <Button
                onClick={checkVerificationStatus}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Verification Status
              </Button>

              <div className="text-center pt-4 border-t">
                <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                  Back to Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

