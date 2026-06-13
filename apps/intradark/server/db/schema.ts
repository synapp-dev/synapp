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
    steamid64: text().primaryKey(),
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
    vacBanned: boolean("vac_banned"),
    gameBanned: boolean("game_banned"),
    communityBanned: boolean("community_banned"),
    economyBan: text("economy_ban"),
    banAgeDays: integer("ban_age_days"),
    cs2PlaytimeMinutes: integer("cs2_playtime_minutes"),
    badgeCount: integer("badge_count"),
    steamLevel: integer("steam_level"),
    friendsCount: integer("friends_count"),
    enrichmentFetchedAt: timestamp("enrichment_fetched_at", {
      withTimezone: true,
      mode: "string",
    }),
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
    steamProfileId: text("steam_profile_id"),
    discordUserId: varchar("discord_user_id", { length: 32 }),
    username: varchar({ length: 255 }).unique(),
    displayName: varchar("display_name", { length: 255 }),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    bio: text(),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    email: varchar({ length: 255 }),
    isVerified: boolean("is_verified").default(false),
    isPremium: boolean("is_premium").default(false),
    preferences: jsonb("preferences").default(sql`'{}'::jsonb`),
    anthemUrl: text("anthem_url"),
    twitchUrl: text("twitch_url"),
    xUrl: text("x_url"),
    instagramUrl: text("instagram_url"),
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

/** Named bundles of `roles` rows for assign-once membership (navigation RBAC). */
export const roleTemplates = pgTable(
  "role_templates",
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
  (table) => [uniqueIndex("role_templates_slug_key").on(table.slug)],
);

/** Which atomic roles belong to a template. */
export const roleTemplateRoles = pgTable(
  "role_template_roles",
  {
    templateId: uuid("template_id").notNull(),
    roleId: uuid("role_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.templateId, table.roleId] }),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [roleTemplates.id],
      name: "role_template_roles_template_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "role_template_roles_role_id_fkey",
    }).onDelete("cascade"),
  ],
);

/** User profile → template assignment (expands to slugs via `role_template_roles`). */
export const userRoleTemplates = pgTable(
  "user_role_templates",
  {
    userProfileId: uuid("user_profile_id").notNull(),
    templateId: uuid("template_id").notNull(),
    grantedAt: timestamp("granted_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    grantedBy: uuid("granted_by"),
  },
  (table) => [
    primaryKey({ columns: [table.userProfileId, table.templateId] }),
    foreignKey({
      columns: [table.userProfileId],
      foreignColumns: [userProfiles.id],
      name: "user_role_templates_user_profile_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [roleTemplates.id],
      name: "user_role_templates_template_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.grantedBy],
      foreignColumns: [userProfiles.id],
      name: "user_role_templates_granted_by_fkey",
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
    mapScreenshotUrl: text("map_screenshot_url").notNull().default(""),
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

/**
 * Named radar zones (callouts) per map — polygon ring in normalized 0–1 radar space.
 * Higher `priority` wins when a point lies inside overlapping polygons (tie-break).
 */
export const mapCallouts = pgTable(
  "map_callouts",
  {
    id: uuid().primaryKey().defaultRandom(),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    slug: varchar({ length: 128 }).notNull(),
    label: text("label").notNull(),
    polygonRing: jsonb("polygon_ring")
      .$type<[number, number][]>()
      .notNull(),
    priority: integer("priority").default(0).notNull(),
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
    uniqueIndex("map_callouts_map_id_slug_key").on(table.mapId, table.slug),
    index("map_callouts_map_id_idx").on(table.mapId),
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
    throwSpotX: doublePrecision("throw_spot_x").notNull(),
    throwSpotY: doublePrecision("throw_spot_y").notNull(),
    landSpotX: doublePrecision("land_spot_x").notNull(),
    landSpotY: doublePrecision("land_spot_y").notNull(),
    throwLabel: text("throw_label").notNull(),
    landLabel: text("land_label").notNull(),
    grenadeType: varchar("grenade_type", { length: 32 }).notNull(),
    side: varchar({ length: 16 }).notNull(),
    movement: varchar("movement", { length: 32 }).notNull(),
    technique: varchar("technique", { length: 48 }).notNull(),
    margin: varchar("margin", { length: 16 }).notNull(),
    youtubeUrl: text("youtube_url"),
    /** `intradark-media` object path (no leading slash), e.g. utility/de_mirage/smoke/uuid.mp4 */
    videoObjectPath: text("video_object_path"),
    videoStartMs: integer("video_start_ms").default(0).notNull(),
    videoEndMs: integer("video_end_ms"),
    /** Editorial still-frame times (ms) — stand POV, throw POV, land/bloom on site */
    stillStandMs: integer("still_stand_ms"),
    stillThrowMs: integer("still_throw_ms"),
    stillLandMs: integer("still_land_ms"),
    /** Grenade release / smoke or utility bloom (ms) within clip */
    grenadeReleaseMs: integer("grenade_release_ms"),
    grenadeBloomMs: integer("grenade_bloom_ms"),
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
    index("utility_lineups_map_land_xy_idx").on(
      table.mapId,
      table.landSpotX,
      table.landSpotY,
    ),
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
      sql`(${table.status})::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'pending'::character varying])::text[])`,
    ),
    check(
      "utility_lineups_video_source_check",
      sql`(${table.status})::text = 'draft'::text OR NULLIF(btrim(COALESCE(${table.youtubeUrl}, '')), '') IS NOT NULL OR NULLIF(btrim(COALESCE(${table.videoObjectPath}, '')), '') IS NOT NULL`,
    ),
    check(
      "utility_lineups_throw_spot_x_check",
      sql`(${table.throwSpotX} >= 0::double precision) AND (${table.throwSpotX} <= 1::double precision)`,
    ),
    check(
      "utility_lineups_throw_spot_y_check",
      sql`(${table.throwSpotY} >= 0::double precision) AND (${table.throwSpotY} <= 1::double precision)`,
    ),
    check(
      "utility_lineups_land_spot_x_check",
      sql`(${table.landSpotX} >= 0::double precision) AND (${table.landSpotX} <= 1::double precision)`,
    ),
    check(
      "utility_lineups_land_spot_y_check",
      sql`(${table.landSpotY} >= 0::double precision) AND (${table.landSpotY} <= 1::double precision)`,
    ),
  ],
);

/**
 * Companion enemy POV videos for a utility lineup (`0015`). Each row references the
 * source `utility_lineups` row; storage path lives under `utility/enemy-pov/...`.
 */
export const utilityLineupEnemyPovVideos = pgTable(
  "utility_lineup_enemy_pov_videos",
  {
    id: uuid().primaryKey().defaultRandom(),
    lineupId: uuid("lineup_id")
      .notNull()
      .references(() => utilityLineups.id, { onDelete: "cascade" }),
    authorProfileId: uuid("author_profile_id").references(
      () => userProfiles.id,
      { onDelete: "set null" },
    ),
    videoObjectPath: text("video_object_path").notNull(),
    description: text("description"),
    videoStartMs: integer("video_start_ms").default(0).notNull(),
    videoEndMs: integer("video_end_ms"),
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
    index("utility_lineup_enemy_pov_videos_lineup_id_idx").on(table.lineupId),
    index("utility_lineup_enemy_pov_videos_author_idx").on(
      table.authorProfileId,
    ),
    check(
      "utility_lineup_enemy_pov_videos_video_end_after_start",
      sql`${table.videoEndMs} IS NULL OR ${table.videoEndMs} > ${table.videoStartMs}`,
    ),
  ],
);

/** Background utility lineup video uploads — one row per queued upload until finalize (`0014`). */
export const utilityLineupUploadJobs = pgTable(
  "utility_lineup_upload_jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    authorProfileId: uuid("author_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(),
    /** `'lineup'` (main video) or `'enemy_pov'` (companion). See `0015`. */
    kind: text("kind").default("lineup").notNull(),
    /** Set on enemy POV jobs to the parent `utility_lineups.id` (NULL for main jobs). */
    parentLineupId: uuid("parent_lineup_id").references(
      () => utilityLineups.id,
      { onDelete: "cascade" },
    ),
    /** Set after enemy POV job finalize when the companion row is inserted. */
    enemyPovVideoId: uuid("enemy_pov_video_id").references(
      () => utilityLineupEnemyPovVideos.id,
      { onDelete: "set null" },
    ),
    payloadJson: jsonb("payload_json").notNull(),
    videoObjectPath: text("video_object_path").notNull(),
    expectedByteLength: integer("expected_byte_length").notNull(),
    errorMessage: text("error_message"),
    lineupId: uuid("lineup_id").references(() => utilityLineups.id, {
      onDelete: "set null",
    }),
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
    index("utility_lineup_upload_jobs_profile_status_idx").on(
      table.authorProfileId,
      table.status,
      table.createdAt,
    ),
    index("utility_lineup_upload_jobs_kind_status_idx").on(
      table.kind,
      table.status,
      table.createdAt,
    ),
    index("utility_lineup_upload_jobs_parent_lineup_idx").on(
      table.parentLineupId,
    ),
    check(
      "utility_lineup_upload_jobs_status_check",
      sql`(${table.status})::text = ANY ((ARRAY[
        'queued'::character varying,
        'uploading'::character varying,
        'finalizing'::character varying,
        'completed'::character varying,
        'failed'::character varying,
        'cancelled'::character varying
      ])::text[])`,
    ),
    check(
      "utility_lineup_upload_jobs_kind_check",
      sql`${table.kind} IN ('lineup', 'enemy_pov')`,
    ),
    check(
      "utility_lineup_upload_jobs_kind_parent_check",
      sql`(${table.kind} = 'enemy_pov' AND ${table.parentLineupId} IS NOT NULL)
        OR (${table.kind} = 'lineup' AND ${table.parentLineupId} IS NULL)`,
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

/** players registry (steamid64 keyed). */
export const players = pgTable(
  "players",
  {
    steamid64: text().primaryKey(),
    userProfileId: uuid("user_profile_id").references(() => userProfiles.id, {
      onDelete: "set null",
    }),
    steamVanity: varchar("steam_vanity", { length: 255 }),
    faceitPlayerId: uuid("faceit_player_id"),
    faceitNickname: varchar("faceit_nickname", { length: 255 }),
    countryFlag: varchar("country_flag", { length: 2 }),
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    lastFetchedAt: timestamp("last_fetched_at", {
      withTimezone: true,
      mode: "string",
    }),
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
    index("idx_players_user_profile_id").on(table.userProfileId),
  ],
);

/** Faceit-shaped team row. */
export const teams = pgTable(
  "teams",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 160 }).notNull(),
    faceitTeamId: uuid("faceit_team_id"),
    name: varchar({ length: 255 }).notNull(),
    nickname: varchar({ length: 255 }),
    avatar: text(),
    coverImage: text("cover_image"),
    description: text(),
    primaryColor: varchar("primary_color", { length: 7 }),
    secondaryColor: varchar("secondary_color", { length: 7 }),
    game: varchar({ length: 32 }).default("cs2").notNull(),
    teamType: varchar("team_type", { length: 32 }),
    leaderSteamid64: text("leader_steamid64").references(() => players.steamid64, {
      onDelete: "set null",
    }),
    chatRoomId: text("chat_room_id"),
    faceitUrl: text("faceit_url"),
    facebook: text(),
    twitter: text(),
    website: text(),
    youtube: text(),
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
    uniqueIndex("idx_teams_slug").on(sql`LOWER(${table.slug})`),
    uniqueIndex("idx_teams_faceit_team_id")
      .on(table.faceitTeamId)
      .where(sql`${table.faceitTeamId} IS NOT NULL`),
    index("idx_teams_leader_steamid64").on(table.leaderSteamid64),
  ],
);

export const playerLegitimacyScores = pgTable(
  "player_legitimacy_scores",
  {
    steamid64: text()
      .primaryKey()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    score: integer().notNull(),
    tier: varchar({ length: 32 }).notNull(),
    confidence: varchar({ length: 8 }).notNull(),
    coverage: doublePrecision().notNull(),
    breakdown: jsonb().notNull(),
    computedAt: timestamp("computed_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
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
    index("idx_legitimacy_tier").on(table.tier),
    index("idx_legitimacy_computed_at").on(table.computedAt),
    check("player_legitimacy_scores_score_check", sql`score >= 0 AND score <= 100`),
    check(
      "player_legitimacy_scores_tier_check",
      sql`tier IN ('suspicious', 'unverified', 'established', 'trusted')`,
    ),
    check(
      "player_legitimacy_scores_confidence_check",
      sql`confidence IN ('low', 'med', 'high')`,
    ),
    check(
      "player_legitimacy_scores_coverage_check",
      sql`coverage >= 0 AND coverage <= 1`,
    ),
  ],
);

export const playerTeams = pgTable(
  "player_teams",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    role: varchar({ length: 32 }).default("member").notNull(),
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.steamid64] }),
    index("idx_player_teams_steamid64").on(table.steamid64),
    index("idx_player_teams_team_id").on(table.teamId),
  ],
);

/** Threaded comments on a player profile (keyed by subject steamid64). */
export const playerProfileComments = pgTable(
  "player_profile_comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    subjectSteamid64: text("subject_steamid64")
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    parentCommentId: uuid("parent_comment_id"),
    body: text().notNull(),
    authorUserId: uuid("author_user_id").notNull(),
    trustSignal: varchar("trust_signal", { length: 16 }),
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
    index("idx_ppc_subject_created_at").on(
      table.subjectSteamid64,
      table.createdAt,
    ),
    index("idx_ppc_parent_comment_id").on(table.parentCommentId),
    index("idx_ppc_author_subject_created").on(
      table.authorUserId,
      table.subjectSteamid64,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
      name: "player_profile_comments_parent_comment_id_fkey",
    }).onDelete("cascade"),
    check(
      "player_profile_comments_trust_signal_check",
      sql`trust_signal IS NULL OR trust_signal IN ('legit', 'suspicious')`,
    ),
  ],
);

/** One active legit/suspicious signal per voter per profile subject. */
export const playerProfileTrustVotes = pgTable(
  "player_profile_trust_votes",
  {
    subjectSteamid64: text("subject_steamid64")
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    voterUserId: uuid("voter_user_id").notNull(),
    signal: varchar({ length: 16 }).notNull(),
    sourceCommentId: uuid("source_comment_id").references(
      () => playerProfileComments.id,
      { onDelete: "set null" },
    ),
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
    primaryKey({ columns: [table.subjectSteamid64, table.voterUserId] }),
    index("idx_pptv_subject_signal").on(table.subjectSteamid64, table.signal),
    check(
      "player_profile_trust_votes_signal_check",
      sql`signal IN ('legit', 'suspicious')`,
    ),
  ],
);

/** Stored reports; no mod UI in MVP. */
export const playerProfileCommentReports = pgTable(
  "player_profile_comment_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => playerProfileComments.id, { onDelete: "cascade" }),
    reporterUserId: uuid("reporter_user_id").notNull(),
    reason: text(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_ppcr_comment_reporter").on(
      table.commentId,
      table.reporterUserId,
    ),
  ],
);
