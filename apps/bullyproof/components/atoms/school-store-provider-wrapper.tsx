"use client";

import { useEffect, useState } from "react";
import { SchoolStoreProvider } from "./school-store-provider";

interface SchoolStoreProviderWrapperProps {
  slug: string | null;
}

/**
 * Wrapper component that ensures SchoolStoreProvider only renders on the client side.
 * This prevents Zustand hook errors during SSR.
 */
export function SchoolStoreProviderWrapper({
  slug,
}: SchoolStoreProviderWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render the provider after the component has mounted on the client
  if (!mounted) {
    return null;
  }

  return <SchoolStoreProvider slug={slug} />;
}
