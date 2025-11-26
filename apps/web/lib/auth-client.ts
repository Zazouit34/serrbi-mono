"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function useAuthRedirect(enabled: boolean, callbackPath: string) {
  const { status } = useSession();

  useEffect(() => {
    if (!enabled) return;
    if (status === "unauthenticated") {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(
        callbackPath,
      )}`;
    }
  }, [enabled, status, callbackPath]);

  return status;
}

