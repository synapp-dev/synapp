"use client";

import { useEffect } from "react";

/**
 * Registers the push/notification service worker once on the client. Mounted
 * app-wide via Providers. Silent no-op where service workers aren't supported.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[sw] registration failed:", error);
    });
  }, []);

  return null;
}
