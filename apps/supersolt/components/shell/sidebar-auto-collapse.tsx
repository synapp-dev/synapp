"use client";

import { useEffect } from "react";

import { useSidebar } from "@workspace/ui/components/sidebar";

import { SIDEBAR_AUTO_COLLAPSE_BREAKPOINT } from "@/lib/responsive-breakpoints";

/**
 * Auto-collapses the left navigation sidebar to its icon rail on narrow
 * viewports and re-expands it when the viewport grows past the breakpoint.
 * A manual toggle still works at any width; this only acts when the
 * viewport crosses the breakpoint (plus once on load when already narrow).
 */
export function SidebarAutoCollapse() {
  const { setOpen } = useSidebar();

  useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT - 1}px)`,
    );
    const onChange = () => setOpen(!mql.matches);
    if (mql.matches) setOpen(false);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [setOpen]);

  return null;
}
