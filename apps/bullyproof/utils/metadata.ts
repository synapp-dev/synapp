import type { Metadata } from "next";

/**
 * Formats a path segment into a readable title
 * Converts kebab-case to Title Case (e.g., "support-tools" → "Support Tools")
 */
export function formatSegment(segment: string): string {
  if (!segment) return "";

  // Split by hyphens and underscores, then capitalize each word
  return segment
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generates a page title from path segments
 * Uses the last non-empty segment and appends " | Bullyproof"
 */
export function generatePageTitle(segments: string[]): string {
  // Filter out empty segments and get the last one
  const nonEmptySegments = segments.filter(Boolean);

  if (nonEmptySegments.length === 0) {
    return "Bullyproof";
  }

  const lastSegment = nonEmptySegments[nonEmptySegments.length - 1];
  const formattedSegment = formatSegment(lastSegment);

  return `${formattedSegment} | Bullyproof`;
}

/**
 * Tab title for school resource folder URLs: every path segment, e.g.
 * `culture-packs/ap-leaders-guides` → "Culture Packs · Ap Leaders Guides | Bullyproof".
 * Safe to use from client code after navigation (sync with `document.title`).
 */
export function generateResourcesFolderTabTitle(folderSlugSegments: string[]): string {
  const parts = folderSlugSegments
    .filter(Boolean)
    .map((s) => formatSegment(s))
    .filter(Boolean);
  if (parts.length === 0) return "Resources | Bullyproof";
  return `${parts.join(" · ")} | Bullyproof`;
}

/**
 * Generates metadata from path segments
 */
export function generateMetadataFromSegments(segments: string[]): Metadata {
  return {
    title: generatePageTitle(segments),
  };
}

/**
 * Generates metadata from a single segment (useful for dynamic routes)
 */
export function generateMetadataFromSegment(segment: string): Metadata {
  return {
    title: generatePageTitle([segment]),
  };
}
