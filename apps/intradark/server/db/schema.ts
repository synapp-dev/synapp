import {
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
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * steam_profiles – Steam profile data (matches supabase migration 20241201000000)
 */
export const steamProfiles = pgTable(
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
  (table) => [index("idx_steam_profiles_steamid").on(table.steamid)],
);

/**
 * user_profiles – Links auth.users to steam_profiles (matches supabase migration 20241201000001 + 20241201000002)
 */
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    steamProfileId: bigint("steam_profile_id", { mode: "number" }),
    discordUserId: varchar("discord_user_id", { length: 32 }),
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
      sql`(steam_profile_id IS NOT NULL) OR (username IS NOT NULL) OR (email IS NOT NULL)`,
    ),
  ],
);

/** Role catalog — slugs used by RLS and server gates (see docs/features/admin-panel). */
export const roles = pgTable(
  "roles",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 64 }).notNull(),
    label: varchar({ length: 255 }).notNull(),
    description: text(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("roles_slug_key").on(table.slug)],
);

/** Assigns user_profiles to roles (subject = profile row; `user_profiles.user_id` → auth). */
export const userRoles = pgTable(
  "user_roles",
  {
    userProfileId: uuid("user_profile_id").notNull(),
    roleId: uuid("role_id").notNull(),
    grantedAt: timestamp("granted_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    /** Granting operator’s profile id (optional). */
    grantedBy: uuid("granted_by"),
  },
  (table) => [
    uniqueIndex("user_roles_user_profile_id_role_id_key").on(
      table.userProfileId,
      table.roleId,
    ),
    foreignKey({
      columns: [table.userProfileId],
      foreignColumns: [userProfiles.id],
      name: "user_roles_user_profile_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "user_roles_role_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.grantedBy],
      foreignColumns: [userProfiles.id],
      name: "user_roles_granted_by_fkey",
    }).onDelete("set null"),
  ],
);

/** First-party news articles (body JSON from TipTap). */
export const newsArticles = pgTable(
  "news_articles",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 160 }).notNull(),
    title: varchar({ length: 500 }).notNull(),
    excerpt: text(),
    bodyJson: jsonb("body_json")
      .notNull()
      .default(
        sql`'{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb`,
      ),
    status: varchar({ length: 20 }).notNull().default("draft"),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    authorUserId: uuid("author_user_id").notNull(),
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
    uniqueIndex("news_articles_slug_key").on(table.slug),
    index("news_articles_status_published_at_idx").on(
      table.status,
      table.publishedAt,
    ),
    check(
      "news_articles_status_check",
      sql`(${table.status}) IN ('draft', 'published')`,
    ),
    check(
      "news_articles_published_at_when_published",
      sql`((${table.status}) <> 'published') OR (${table.publishedAt} IS NOT NULL)`,
    ),
  ],
);

/** CS2 / FPS map pools (active duty, reserve, community). */
export const mapPools = pgTable(
  "map_pools",
  {
    id: uuid().primaryKey(),
    slug: varchar({ length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
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
  (table) => [uniqueIndex("map_pools_slug_key").on(table.slug)],
);

/** Canonical maps — referenced by utility lineups and future modules (`/utility`, etc.). */
export const maps = pgTable(
  "maps",
  {
    id: uuid().primaryKey().defaultRandom(),
    game: varchar({ length: 32 }).default("cs2").notNull(),
    slug: varchar({ length: 128 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => mapPools.id, { onDelete: "restrict" }),
    radarImageUrl: text("radar_image_url").notNull(),
    badgeImageUrl: text("badge_image_url").notNull().default(""),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
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
    uniqueIndex("maps_slug_key").on(table.slug),
    index("maps_is_active_sort_idx").on(table.isActive, table.sortOrder),
    index("maps_pool_id_idx").on(table.poolId),
  ],
);

/**
 * Named radar positions per map (throw/land/callouts).
 * Coordinates are normalized 0–1 on the radar art.
 */
export const utilityMapSpots = pgTable(
  "utility_map_spots",
  {
    id: uuid().primaryKey().defaultRandom(),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    slug: varchar({ length: 128 }).notNull(),
    label: text("label").notNull(),
    radarX: doublePrecision("radar_x").notNull(),
    radarY: doublePrecision("radar_y").notNull(),
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
    uniqueIndex("utility_map_spots_map_id_slug_key").on(table.mapId, table.slug),
    index("utility_map_spots_map_id_idx").on(table.mapId),
    check(
      "utility_map_spots_radar_x_check",
      sql`(${table.radarX} >= 0::double precision) AND (${table.radarX} <= 1::double precision)`,
    ),
    check(
      "utility_map_spots_radar_y_check",
      sql`(${table.radarY} >= 0::double precision) AND (${table.radarY} <= 1::double precision)`,
    ),
  ],
);

/** Individual grenade lineups (published rows visible to anon per RLS). */
export const utilityLineups = pgTable(
  "utility_lineups",
  {
    id: uuid().primaryKey().defaultRandom(),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    throwSpotId: uuid("throw_spot_id")
      .notNull()
      .references(() => utilityMapSpots.id, { onDelete: "restrict" }),
    landSpotId: uuid("land_spot_id")
      .notNull()
      .references(() => utilityMapSpots.id, { onDelete: "restrict" }),
    grenadeType: varchar("grenade_type", { length: 32 }).notNull(),
    side: varchar({ length: 16 }).notNull(),
    movement: varchar("movement", { length: 32 }).notNull(),
    technique: varchar("technique", { length: 48 }).notNull(),
    margin: varchar("margin", { length: 16 }).notNull(),
    youtubeUrl: text("youtube_url").notNull(),
    videoStartMs: integer("video_start_ms").default(0).notNull(),
    videoEndMs: integer("video_end_ms"),
    lineupImageUrl: text("lineup_image_url"),
    description: text("description").notNull(),
    setposText: text("setpos_text"),
    authorProfileId: uuid("author_profile_id").references(() => userProfiles.id, {
      onDelete: "set null",
    }),
    status: varchar({ length: 20 }).default("draft").notNull(),
    proVerified: boolean("pro_verified").default(false).notNull(),
    intradarkVerified: boolean("intradark_verified").default(false).notNull(),
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
    index("utility_lineups_map_id_idx").on(table.mapId),
    index("utility_lineups_map_grenade_side_idx").on(
      table.mapId,
      table.grenadeType,
      table.side,
    ),
    index("utility_lineups_land_spot_id_idx").on(table.landSpotId),
    check(
      "utility_lineups_grenade_type_check",
      sql`(${table.grenadeType})::text = ANY ((ARRAY['smoke'::character varying, 'molotov'::character varying, 'flashbang'::character varying, 'he'::character varying])::text[])`,
    ),
    check(
      "utility_lineups_side_check",
      sql`(${table.side})::text = ANY ((ARRAY['t'::character varying, 'ct'::character varying, 'both'::character varying])::text[])`,
    ),
    check(
      "utility_lineups_movement_check",
      sql`(${table.movement})::text = ANY ((ARRAY['stationary'::character varying, 'running'::character varying, 'walking'::character varying, 'crouched'::character varying, 'crouched_walking'::character varying])::text[])`,
    ),
    check(
      "utility_lineups_technique_check",
      sql`(${table.technique})::text = ANY ((ARRAY['left_click'::character varying, 'right_click'::character varying, 'left_and_right_click'::character varying, 'jump_left_click'::character varying, 'jump_right_click'::character varying, 'jump_left_and_right_click'::character varying])::text[])`,
    ),
    check(
      "utility_lineups_margin_check",
      sql`(${table.margin})::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])`,
    ),
    check(
      "utility_lineups_status_check",
      sql`(${table.status})::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[])`,
    ),
  ],
);

/** Forum categories (seeded; see `0006_forums.sql`). */
export const forumCategories = pgTable(
  "forum_categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 64 }).notNull(),
    label: varchar({ length: 255 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("forum_categories_slug_key").on(table.slug)],
);

/** Curated forum tags (optional on threads). */
export const forumTags = pgTable(
  "forum_tags",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 64 }).notNull(),
    label: varchar({ length: 255 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("forum_tags_slug_key").on(table.slug)],
);

/** Forum thread (original post). */
export const forumThreads = pgTable(
  "forum_threads",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => forumCategories.id, { onDelete: "restrict" }),
    slug: varchar({ length: 160 }).notNull(),
    title: varchar({ length: 500 }).notNull(),
    body: text("body").notNull(),
    authorUserId: uuid("author_user_id").notNull(),
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
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("forum_threads_category_id_slug_key").on(
      table.categoryId,
      table.slug,
    ),
    index("forum_threads_category_id_updated_at_idx").on(
      table.categoryId,
      table.updatedAt,
    ),
    index("forum_threads_author_user_id_idx").on(table.authorUserId),
  ],
);

/** Nested replies (Reddit-style tree via `parent_reply_id`). */
export const forumReplies = pgTable(
  "forum_replies",
  {
    id: uuid().primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    parentReplyId: uuid("parent_reply_id"),
    body: text("body").notNull(),
    authorUserId: uuid("author_user_id").notNull(),
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
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("forum_replies_thread_id_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
    index("forum_replies_parent_reply_id_idx").on(table.parentReplyId),
    foreignKey({
      columns: [table.parentReplyId],
      foreignColumns: [table.id],
      name: "forum_replies_parent_reply_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const forumThreadTags = pgTable(
  "forum_thread_tags",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => forumTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.threadId, table.tagId] }),
    index("forum_thread_tags_tag_id_idx").on(table.tagId),
  ],
);
