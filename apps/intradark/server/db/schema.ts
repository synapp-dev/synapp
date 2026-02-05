import {
  pgSchema,
  pgTable,
  bigint,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const publicSchema = pgSchema("public");

/**
 * steam_profiles – Steam profile data (matches supabase migration 20241201000000)
 */
export const steamProfiles = publicSchema.table(
  "steam_profiles",
  {
    steamid64: bigint({ mode: "number" }).primaryKey(),
    steamid: varchar({ length: 20 }).notNull(),
    personaname: varchar({ length: 255 }).notNull(),
    profileurl: varchar({ length: 500 }),
    avatar: varchar({ length: 500 }),
    avatarmedium: varchar({ length: 500 }),
    avatarfull: varchar({ length: 500 }),
    personastate: integer().default(0),
    communityvisibilitystate: integer().default(0),
    profilestate: integer().default(0),
    lastlogoff: timestamp({ withTimezone: true, mode: "string" }),
    commentpermission: integer().default(0),
    realname: varchar({ length: 255 }),
    primaryclanid: varchar({ length: 20 }),
    timecreated: timestamp({ withTimezone: true, mode: "string" }),
    gameid: integer(),
    gameserverip: varchar({ length: 50 }),
    gameextrainfo: varchar({ length: 255 }),
    cityid: integer(),
    loccountrycode: varchar({ length: 2 }),
    locstatecode: varchar({ length: 2 }),
    loccityid: integer(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_steam_profiles_steamid").on(table.steamid),
  ]
);

/**
 * user_profiles – Links auth.users to steam_profiles (matches supabase migration 20241201000001 + 20241201000002)
 */
export const userProfiles = publicSchema.table(
  "user_profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    steamProfileId: bigint("steam_profile_id", { mode: "number" }),
    username: varchar({ length: 255 }).unique(),
    displayName: varchar("display_name", { length: 255 }),
    bio: text(),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    email: varchar({ length: 255 }),
    isVerified: boolean("is_verified").default(false),
    isPremium: boolean("is_premium").default(false),
    preferences: jsonb("preferences").default(sql`'{}'::jsonb`),
    lastActive: timestamp("last_active", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_profiles_user_id").on(table.userId),
    index("idx_user_profiles_steam_profile_id").on(table.steamProfileId),
    index("idx_user_profiles_username").on(table.username),
    foreignKey({
      columns: [table.steamProfileId],
      foreignColumns: [steamProfiles.steamid64],
      name: "user_profiles_steam_profile_id_fkey",
    }).onDelete("set null"),
    check(
      "check_steam_or_username_or_email",
      sql`(steam_profile_id IS NOT NULL) OR (username IS NOT NULL) OR (email IS NOT NULL)`
    ),
  ]
);
