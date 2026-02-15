"use client";

import { useQuery } from "@tanstack/react-query";
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

const STORAGE_SIGNED_URL_STALE_MS = 45 * 60 * 1000; // 45 min (signed URLs expire in 1h)

/**
 * Resolves a school avatar or banner URL. If it's a storage path (schools/images/...),
 * fetches a signed URL from the server API (required for private bucket auth).
 * Uses React Query for caching so the URL displays immediately when navigating back.
 * Otherwise returns the URL as-is (external URL).
 */
export function useStorageImageUrl(
  urlOrPath: string | null | undefined
): { url: string | null; loading: boolean; error: Error | null } {
  const query = useQuery({
    queryKey: ["storage", "signedUrl", urlOrPath ?? ""],
    queryFn: async (): Promise<string | null> => {
      const value = urlOrPath;
      if (!value || value.trim() === "") return null;
      if (!isStoragePath(value)) return value;

      const result = await apiFetch<{ url: string }>(
        `/storage/signed-url?path=${encodeURIComponent(value)}`
      );
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to load image");
      }
      const signedUrl = result.data?.url;
      if (!signedUrl || !signedUrl.startsWith("http")) {
        throw new Error("Failed to load image");
      }
      return signedUrl;
    },
    enabled:
      !!urlOrPath &&
      typeof urlOrPath === "string" &&
      urlOrPath.trim() !== "" &&
      isStoragePath(urlOrPath),
    staleTime: STORAGE_SIGNED_URL_STALE_MS,
    gcTime: STORAGE_SIGNED_URL_STALE_MS,
  });

  if (!urlOrPath || urlOrPath.trim() === "") {
    return { url: null, loading: false, error: null };
  }
  if (!isStoragePath(urlOrPath)) {
    return { url: urlOrPath, loading: false, error: null };
  }

  return {
    url: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
