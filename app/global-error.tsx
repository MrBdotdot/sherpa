"use client";

import { useEffect } from "react";
import "./globals.css";
import { ErrorRecoveryShell } from "@/app/_components/error-recovery-shell";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <title>Something went wrong | Sherpa</title>
        <ErrorRecoveryShell
          title="Sherpa ran into a root-level error."
          message="A deeper app shell failure interrupted the workspace. Use the recovery action below or head back to the main studio."
          digest={error.digest}
          onRetry={unstable_retry}
        />
      </body>
    </html>
  );
}
