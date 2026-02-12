"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/fetcher.client";

/**
 * Matches both path formats:
 * - Old: schools/images/avatar/{schoolId}.{ext}, schools/images/banner/{schoolId}.{ext}
 * - New: schools/{schoolId}/images/avatar.{ext}, schools/{schoolId}/images/banner.{ext}
 */
function isStoragePath(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath || typeof urlOrPath !== "string") return false;
  return !urlOrPath.startsWith("http") && urlOrPath.startsWith("schools/");
}

/**
 * Resolves a school avatar or banner URL. If it's a storage path (schools/images/...),
 * fetches a signed URL from the server API (required for private bucket auth).
 * Uses apiFetch so the Bearer token is sent for authentication.
 * Otherwise returns the URL as-is (external URL).
 */
export function useStorageImageUrl(
  urlOrPath: string | null | undefined
): { url: string | null; loading: boolean; error: Error | null } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const resolve = useCallback(async (value: string | null | undefined) => {
    if (!value || value.trim() === "") {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isStoragePath(value)) {
      setUrl(value);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ url: string }>(
        `/storage/signed-url?path=${encodeURIComponent(value)}`
      );

      if (result.error) {
        setError(new Error(result.error.message ?? "Failed to load image"));
        setUrl(null);
        return;
      }

      const signedUrl = result.data?.url;
      if (!signedUrl || !signedUrl.startsWith("http")) {
        setError(new Error("Failed to load image"));
        setUrl(null);
      } else {
        setUrl(signedUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolve(urlOrPath);
  }, [urlOrPath, resolve]);

  return { url, loading, error };
}
