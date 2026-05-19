"use client";

import { useCallback, useState } from "react";
import { usersApi } from "@/entities/users/api/endpoints";
import type { UserLookupResponse } from "@/entities/users/types/user-lookup";

export function useUserEmailLookup() {
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<UserLookupResponse | null>(
    null
  );

  const resetLookup = useCallback(() => {
    setLookupResult(null);
    setLookupError(null);
    setLookupLoading(false);
  }, []);

  const lookupByEmail = useCallback(
    async (email: string, schoolId?: string): Promise<UserLookupResponse> => {
      setLookupLoading(true);
      setLookupError(null);
      try {
        const result = await usersApi.get.lookup({ email, schoolId });
        if (result.error || !result.data) {
          const message =
            result.error?.message ?? "Failed to look up email. Please try again.";
          setLookupError(message);
          throw new Error(message);
        }
        setLookupResult(result.data);
        return result.data;
      } finally {
        setLookupLoading(false);
      }
    },
    []
  );

  return {
    lookupByEmail,
    lookupLoading,
    lookupError,
    lookupResult,
    resetLookup,
    userExists: lookupResult?.exists ?? false,
  };
}
