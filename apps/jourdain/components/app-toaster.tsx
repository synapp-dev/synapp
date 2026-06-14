"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@workspace/ui/components/sonner";

/** Sonner toaster — bottom-left on desktop, top on mobile. */
export function AppToaster() {
  const [position, setPosition] = useState<"bottom-left" | "top-center">(
    "bottom-left"
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setPosition(mq.matches ? "top-center" : "bottom-left");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return <Toaster position={position} richColors />;
}
