"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <h1>Application error</h1>
          <p>Please refresh the page or try again later.</p>
          <button type="button" onClick={() => reset()} style={{ marginTop: "1rem" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
