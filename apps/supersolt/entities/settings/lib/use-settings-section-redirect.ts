"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UseScopedSettingsAccessResult } from "@/entities/access/model/use-scoped-settings-access";

export function useSettingsSectionRedirect(
  access: UseScopedSettingsAccessResult,
  allowed: boolean,
) {
  const router = useRouter();

  useEffect(() => {
    if (access.isLoading || allowed) {
      return;
    }
    if (access.firstAllowedHref) {
      router.replace(access.firstAllowedHref);
    }
  }, [access.isLoading, allowed, access.firstAllowedHref, router]);

  const showForbidden =
    !access.isLoading && !allowed && !access.firstAllowedHref;
  const isRedirecting =
    !access.isLoading && !allowed && Boolean(access.firstAllowedHref);

  return { showForbidden, isRedirecting };
}
