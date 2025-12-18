"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // Give Stripe webhook a moment to process
      setTimeout(() => {
        verifySubscription();
      }, 2000);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const verifySubscription = async () => {
    try {
      const response = await fetch('/api/stripe/subscription-status');
      if (response.ok) {
        const data = await response.json();
        if (data.isActive) {
          setVerified(true);
        }
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <CardTitle>Processing your subscription...</CardTitle>
            </>
          ) : verified ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Subscription Activated!</CardTitle>
            </>
          ) : (
            <>
              <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Payment Successful</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {loading ? (
            <p className="text-gray-600">
              Please wait while we activate your subscription...
            </p>
          ) : verified ? (
            <>
              <p className="text-gray-600">
                Your subscription has been successfully activated. You now have full access to all features.
              </p>
              <Link href="/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Your payment was successful. Your subscription is being processed and will be active shortly.
              </p>
              <div className="space-y-2">
                <Link href="/dashboard">
                  <Button className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full">
                    View Subscription
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}

