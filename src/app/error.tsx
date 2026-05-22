"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-gray-600 text-center max-w-md">
        We&apos;ve been notified. Try again, or return to the dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">Dashboard</a>
        </Button>
      </div>
    </div>
  );
}
