"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type ScopedContext = {
  organisationSlug: string;
  venueSlug: string;
};

/**
 * Parses `/{organisationSlug}/{venueSlug}/…` from the pathname.
 * Mirrors the reserved-segment rules used by the venue switcher in `AppSidebar`.
 */
export function getScopedContextFromPathname(
  pathname: string,
): ScopedContext | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [first, second] = segments;
  if (
    !first ||
    !second ||
    first === "auth" ||
    first === "agent" ||
    first === "dashboard" ||
    first === "support" ||
    first === "settings" ||
    first === "logout" ||
    first === "setup"
  ) {
    return null;
  }

  return {
    organisationSlug: first,
    venueSlug: second,
  };
}

type ScopedNavigationContextValue = {
  activeScopedContext: ScopedContext | null;
  resolvedScope: ScopedContext | null;
  setScopedContext: Dispatch<SetStateAction<ScopedContext | null>>;
};

const ScopedNavigationContext =
  createContext<ScopedNavigationContextValue | null>(null);

export function ScopedNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeScopedContext = useMemo(
    () => getScopedContextFromPathname(pathname),
    [pathname],
  );
  const [selectedScopedContext, setSelectedScopedContext] =
    useState<ScopedContext | null>(activeScopedContext);

  useEffect(() => {
    if (!activeScopedContext) {
      return;
    }

    setSelectedScopedContext((previous) => {
      if (
        previous?.organisationSlug === activeScopedContext.organisationSlug &&
        previous?.venueSlug === activeScopedContext.venueSlug
      ) {
        return previous;
      }

      return activeScopedContext;
    });
  }, [activeScopedContext?.organisationSlug, activeScopedContext?.venueSlug]);

  const resolvedScope = selectedScopedContext ?? activeScopedContext;

  const value = useMemo<ScopedNavigationContextValue>(
    () => ({
      activeScopedContext,
      resolvedScope,
      setScopedContext: setSelectedScopedContext,
    }),
    [activeScopedContext, resolvedScope],
  );

  return (
    <ScopedNavigationContext.Provider value={value}>
      {children}
    </ScopedNavigationContext.Provider>
  );
}

export function useScopedNavigation(): ScopedNavigationContextValue {
  const ctx = useContext(ScopedNavigationContext);
  if (!ctx) {
    throw new Error(
      "useScopedNavigation must be used within ScopedNavigationProvider",
    );
  }
  return ctx;
}
