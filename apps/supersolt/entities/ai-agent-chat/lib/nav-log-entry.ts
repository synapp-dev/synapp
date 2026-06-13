import { APP_NAVIGATION_CATALOG } from "./app-navigation-catalog";
import { isReservedTopLevelSegment } from "@/lib/reserved-top-level-segments";

export type NavLogEntry = {
  id: string;
  pathname: string;
  label: string;
  scopeLabel: string | null;
  timestamp: number;
};

function formatSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Derive a friendly label for a navigation log entry from a pathname.
 *
 * - Reserved top-level routes (e.g. /agent, /dashboard) → just the segment label.
 * - `/{org}/{venue}` routes → look up by pathSuffix in the navigation catalog
 *   and use the catalog title; fall back to formatted segments if unknown.
 */
export function deriveNavLogLabel(pathname: string): {
  label: string;
  scopeLabel: string | null;
} {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { label: "Home", scopeLabel: null };
  }

  const first = segments[0]!;
  if (isReservedTopLevelSegment(first)) {
    return { label: formatSegmentLabel(first), scopeLabel: null };
  }

  const second = segments[1];
  if (!second) {
    return { label: formatSegmentLabel(first), scopeLabel: null };
  }

  const scopeLabel = `${formatSegmentLabel(first)} · ${formatSegmentLabel(second)}`;
  const suffix = "/" + segments.slice(2).join("/");

  if (suffix !== "/") {
    for (const entry of Object.values(APP_NAVIGATION_CATALOG)) {
      if (entry.pathSuffix === suffix) {
        return { label: entry.title, scopeLabel };
      }
    }
  }

  if (segments.length === 2) {
    return { label: formatSegmentLabel(second), scopeLabel: null };
  }

  return {
    label: segments.slice(2).map(formatSegmentLabel).join(" / "),
    scopeLabel,
  };
}

export function createNavLogEntry(pathname: string, now: number): NavLogEntry {
  const { label, scopeLabel } = deriveNavLogLabel(pathname);
  const rand =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: rand,
    pathname,
    label,
    scopeLabel,
    timestamp: now,
  };
}
