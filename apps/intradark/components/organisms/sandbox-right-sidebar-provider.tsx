"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type SandboxRightSidebarContextValue = {
  sidebarMountElement: HTMLElement | null;
  setSidebarMountElement: (el: HTMLElement | null) => void;
  sidebarOccupied: boolean;
  setSidebarOccupied: (v: boolean) => void;
};

const SandboxRightSidebarContext =
  React.createContext<SandboxRightSidebarContextValue | null>(null);

export function SandboxRightSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarMountElement, setSidebarMountElement] =
    React.useState<HTMLElement | null>(null);
  const [sidebarOccupied, setSidebarOccupied] = React.useState(false);

  const value = React.useMemo(
    () => ({
      sidebarMountElement,
      setSidebarMountElement,
      sidebarOccupied,
      setSidebarOccupied,
    }),
    [sidebarMountElement, sidebarOccupied],
  );

  return (
    <SandboxRightSidebarContext.Provider value={value}>
      {children}
    </SandboxRightSidebarContext.Provider>
  );
}

export function useSandboxRightSidebar(): SandboxRightSidebarContextValue {
  const ctx = React.useContext(SandboxRightSidebarContext);
  if (!ctx) {
    throw new Error(
      "useSandboxRightSidebar must be used within SandboxRightSidebarProvider",
    );
  }
  return ctx;
}

export function useSandboxRightSidebarRegistrar(): Pick<
  SandboxRightSidebarContextValue,
  | "sidebarMountElement"
  | "setSidebarMountElement"
  | "setSidebarOccupied"
> {
  const ctx = React.useContext(SandboxRightSidebarContext);
  if (!ctx) {
    throw new Error(
      "useSandboxRightSidebarRegistrar must be used within SandboxRightSidebarProvider",
    );
  }
  return {
    sidebarMountElement: ctx.sidebarMountElement,
    setSidebarMountElement: ctx.setSidebarMountElement,
    setSidebarOccupied: ctx.setSidebarOccupied,
  };
}

/**
 * Portals `render()` into the app right sidebar mount node. The portal stays
 * in the caller's React subtree (preserves context from MatchLobbyMockProvider,
 * etc.) while DOM appears in the right column.
 */
export function useRegisterSandboxRightSidebar(
  render: () => React.ReactNode,
  deps: React.DependencyList,
) {
  const { sidebarMountElement, setSidebarOccupied } =
    useSandboxRightSidebarRegistrar();
  const renderRef = React.useRef(render);
  renderRef.current = render;

  React.useLayoutEffect(() => {
    if (!sidebarMountElement) return;
    setSidebarOccupied(true);
  }, [sidebarMountElement, setSidebarOccupied, ...deps]);

  React.useLayoutEffect(() => {
    return () => {
      setSidebarOccupied(false);
    };
  }, [setSidebarOccupied]);

  if (!sidebarMountElement) {
    return null;
  }

  return createPortal(renderRef.current(), sidebarMountElement);
}
