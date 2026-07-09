"use client";

import React from "react";
import {
  SidebarProvider,
  useSidebar,
} from "@workspace/ui/components/sidebar";

type ResponsiveSidebarProviderProps = React.ComponentProps<
  typeof SidebarProvider
>;

/**
 * Wrapper around SidebarProvider that adds auto-collapse behavior
 * when window width is less than 2xl (1536px).
 * Users can still manually open the sidebar even when below 2xl.
 */
function ResponsiveSidebarProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobile, open, setOpen } = useSidebar();

  // Auto-collapse sidebar when window width becomes less than 2xl (1536px)
  React.useEffect(() => {
    if (isMobile) return; // Don't interfere with mobile behavior

    let previousWidth = window.innerWidth;

    const checkWidth = () => {
      const currentWidth = window.innerWidth;
      const isBelow2xl = currentWidth < 1536; // 2xl breakpoint
      const wasAbove2xl = previousWidth >= 1536;

      // Only auto-collapse when transitioning from >= 2xl to < 2xl
      // This allows users to manually open the sidebar even if < 2xl
      if (wasAbove2xl && isBelow2xl && open) {
        setOpen(false);
      }

      previousWidth = currentWidth;
    };

    // Check on resize
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [isMobile, open, setOpen]);

  return <>{children}</>;
}

export function ResponsiveSidebarProvider({
  defaultOpen = true,
  ...props
}: ResponsiveSidebarProviderProps) {
  // Always start with defaultOpen on both server and client to avoid hydration mismatch
  // Then update after mount based on window width
  const [open, setOpen] = React.useState(defaultOpen);
  const [, setMounted] = React.useState(false);

  // Update state after mount to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
    // Determine initial open state based on window width (2xl = 1536px)
    const isBelow2xl = window.innerWidth < 1536;
    if (isBelow2xl) {
      setOpen(false);
    }
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen} {...props}>
      <ResponsiveSidebarProviderInner>
        {props.children}
      </ResponsiveSidebarProviderInner>
    </SidebarProvider>
  );
}
