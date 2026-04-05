"use client";

import { useEffect } from "react";
import { ErrorRecoveryShell } from "@/app/_components/error-recovery-shell";

export default function Error({
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
    <ErrorRecoveryShell
      title="The workspace hit an unexpected snag."
      message="Sherpa caught the error before the entire app blanked out. Try the recovery action below, then jump back into your rules experience."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  );
}
