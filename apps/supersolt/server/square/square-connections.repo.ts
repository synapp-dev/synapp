import { eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { venueSquareConnections } from "@/server/db/schema";

export type SquareConnectionRow = typeof venueSquareConnections.$inferSelect;

export type SquareConnectionCredentials = {
  squareAccessToken: string;
  environment: string;
  squareLocationId: string | null;
};

export const squareConnectionsRepo = {
  async getConnectionForVenueRls(
    tx: RlsTx,
    venueId: string,
  ): Promise<SquareConnectionCredentials | null> {
    const rows = await tx
      .select({
        squareAccessToken: venueSquareConnections.squareAccessToken,
        environment: venueSquareConnections.environment,
        squareLocationId: venueSquareConnections.squareLocationId,
      })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    if (!row?.squareAccessToken) {
      return null;
    }
    return row;
  },

  async getConnectionForVenueAdmin(
    appDb: AppDb,
    venueId: string,
  ): Promise<SquareConnectionCredentials | null> {
    const rows = await appDb.admin
      .select({
        squareAccessToken: venueSquareConnections.squareAccessToken,
        environment: venueSquareConnections.environment,
        squareLocationId: venueSquareConnections.squareLocationId,
      })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    if (!row?.squareAccessToken) {
      return null;
    }
    return row;
  },

  async updateLocationId(
    appDb: AppDb,
    args: { venueId: string; squareLocationId: string },
  ): Promise<void> {
    await appDb.admin
      .update(venueSquareConnections)
      .set({
        squareLocationId: args.squareLocationId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(venueSquareConnections.venueId, args.venueId));
  },

  async loadConnectionForVenue(
    appDb: AppDb,
    venueId: string,
    rlsFirst: boolean,
  ): Promise<SquareConnectionCredentials | null> {
    if (rlsFirst) {
      const viaRls = await appDb.rls((tx) =>
        squareConnectionsRepo.getConnectionForVenueRls(tx, venueId),
      );
      if (viaRls) {
        return viaRls;
      }
    }
    return squareConnectionsRepo.getConnectionForVenueAdmin(appDb, venueId);
  },
};
