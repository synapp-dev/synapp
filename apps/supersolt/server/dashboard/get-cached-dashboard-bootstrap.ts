import { cache } from "react";

import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";
import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";
import { createServerClient } from "@/utils/supabase/server";

export type DashboardBootstrapUnauthenticated = {
  kind: "unauthenticated";
};

export type DashboardBootstrapError = {
  kind: "error";
  message: string;
};

export type DashboardBootstrapOk = {
  kind: "ok";
  userId: string;
  access: AccessContextPayloadDto;
};

export type DashboardBootstrap =
  | DashboardBootstrapUnauthenticated
  | DashboardBootstrapError
  | DashboardBootstrapOk;

/**
 * Single Supabase + access-context fetch per request (layout + page).
 */
export const getCachedDashboardBootstrap = cache(
  async (): Promise<DashboardBootstrap> => {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { kind: "unauthenticated" };
    }

    const loaded = await loadAccessContextForUser(supabase, user.id);
    if (loaded.error) {
      return { kind: "error", message: loaded.error.message };
    }

    return { kind: "ok", userId: user.id, access: loaded.data };
  },
);
