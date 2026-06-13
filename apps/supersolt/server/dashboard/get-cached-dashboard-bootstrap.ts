import { cache } from "react";



import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";

import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";

import { getServerRequestAuthContext } from "@/server/auth/server-context";



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

    const ctx = await getServerRequestAuthContext();

    if (!ctx) {

      return { kind: "unauthenticated" };

    }



    const loaded = await loadAccessContextForUser(ctx.appDb, ctx.userId);

    if (loaded.error) {

      return { kind: "error", message: loaded.error.message };

    }



    return { kind: "ok", userId: ctx.userId, access: loaded.data };

  },

);

