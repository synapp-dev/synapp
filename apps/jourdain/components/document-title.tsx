"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageTitle } from "@/lib/page-titles";

export function DocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const title = pageTitle(pathname);
    document.title = title ? `${title} · Jourdain` : "Jourdain";
  }, [pathname]);

  return null;
}
