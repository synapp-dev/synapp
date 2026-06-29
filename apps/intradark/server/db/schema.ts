import {
  pgTable,
  pgView,
  bigint,
  numeric,
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
    coverImageUrl: text("cover_image_url"),
    /** Provenance for auto-ingested articles, e.g. "steam_cs2"; null for hand-written. */
    source: varchar({ length: 64 }),
    /** Stable upstream id (Steam news gid) for dedupe; unique per source. */
    externalId: varchar("external_id", { length: 128 }),
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
    /** Raw total view count — bumped +1 on every page load (see migration 0040). */
    viewCount: integer("view_count").notNull().default(0),
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
    uniqueIndex("news_articles_source_external_id_key")
      .on(table.source, table.externalId)
      .where(sql`${table.externalId} IS NOT NULL`),
  ],
);

/** News tag taxonomy (public filter + admin queue triage). */
export const newsTags = pgTable(
  "news_tags",
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
  (table) => [uniqueIndex("news_tags_slug_key").on(table.slug)],
);

/** Article <-> tag join. */
export const newsArticleTags = pgTable(
  "news_article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => newsArticles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => newsTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "news_article_tags_pk",
      columns: [table.articleId, table.tagId],
    }),
    index("news_article_tags_tag_id_idx").on(table.tagId),
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
    tierId: uuid("tier_id"),
    regionId: uuid("region_id"),
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

/**
 * reactions — generic polymorphic emoji reactions, one per user per target.
 * Targets span comments and entities app-wide (player profiles/comments, news
 * articles/comments, forum threads/replies). `targetId` is text so it can hold
 * uuids and steamid64 keys alike. See migration 0039_reactions.sql.
 */
export const reactions = pgTable(
  "reactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: text("target_id").notNull(),
    reactType: varchar("react_type", { length: 16 }).notNull(),
    userId: uuid("user_id").notNull(),
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
    uniqueIndex("reactions_target_user_key").on(
      table.targetType,
      table.targetId,
      table.userId,
    ),
    index("idx_reactions_target").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
    check(
      "reactions_react_type_check",
      sql`react_type IN ('like', 'love', 'laugh', 'fire', 'sad')`,
    ),
  ],
);

/**
 * news_comments — threaded, soft-deletable comments on news articles. Mirrors
 * player_profile_comments minus the trust-signal machinery. Emoji reactions
 * attach via the generic `reactions` table (target_type = 'news_comment').
 */
export const newsComments = pgTable(
  "news_comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => newsArticles.id, { onDelete: "cascade" }),
    parentCommentId: uuid("parent_comment_id"),
    body: text().notNull(),
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
    index("idx_news_comments_article_created_at").on(
      table.articleId,
      table.createdAt,
    ),
    index("idx_news_comments_parent_comment_id").on(table.parentCommentId),
    index("idx_news_comments_author_article_created").on(
      table.authorUserId,
      table.articleId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
      name: "news_comments_parent_comment_id_fkey",
    }).onDelete("cascade"),
  ],
);

/**
 * news_article_views — one row per unique viewer (member or anonymous) per
 * article, deduped on (article_id, viewer_key). Powers the unique / members /
 * anonymous breakdown; the raw total lives in news_articles.view_count.
 * Server-only access (RLS enabled, no policies). See migration 0040.
 */
export const newsArticleViews = pgTable(
  "news_article_views",
  {
    id: uuid().primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => newsArticles.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    anonId: text("anon_id"),
    /** 'u:<userId>' for members, 'a:<anonId>' for anonymous. */
    viewerKey: text("viewer_key").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("news_article_views_article_viewer_key").on(
      table.articleId,
      table.viewerKey,
    ),
    index("idx_news_article_views_article").on(table.articleId),
  ],
);

/**
 * dm_kill_events — raw deathmatch event firehose (one row per game event).
 * Fully separate from MatchZy/PUG (own table/route/secret/plugin; see
 * docs/cs2-stats-leaderboard.md). NOT FK'd to players: the DM server reports every
 * connected steamid64 incl. untracked pubbers. Profiles join at read time via the
 * `dm_player_stats` view. Public-read RLS; writes via service role only. Ingest
 * dedupes on `event_id` (unique). `raw` keeps the full untrimmed payload.
 */
export const dmKillEvents = pgTable(
  "dm_kill_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Plugin-supplied stable id (e.g. "server_id:counter"); powers dedupe on retry. */
    eventId: text("event_id").notNull(),
    serverId: text("server_id").notNull(),
    mapName: text("map_name"),
    /** 'death' | 'hurt' | 'connect' | 'disconnect' | … (open; `raw` has the rest). */
    eventType: text("event_type").notNull(),
    attackerSteamid64: text("attacker_steamid64"),
    victimSteamid64: text("victim_steamid64"),
    assisterSteamid64: text("assister_steamid64"),
    weapon: text("weapon"),
    headshot: boolean("headshot"),
    noscope: boolean("noscope"),
    penetrated: boolean("penetrated"),
    distance: doublePrecision("distance"),
    attackerPos: jsonb("attacker_pos").$type<{ x: number; y: number; z: number }>(),
    victimPos: jsonb("victim_pos").$type<{ x: number; y: number; z: number }>(),
    raw: jsonb("raw").notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    ingestedAt: timestamp("ingested_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("dm_kill_events_event_id_key").on(table.eventId),
    index("idx_dm_kill_events_attacker").on(table.attackerSteamid64),
    index("idx_dm_kill_events_victim").on(table.victimSteamid64),
    index("idx_dm_kill_events_map").on(table.mapName),
    index("idx_dm_kill_events_occurred_at").on(table.occurredAt),
  ],
);

/**
 * dm_player_stats — all-time deathmatch leaderboard rollup derived from
 * dm_kill_events (see migration 0030). Declared `.existing()`: the migration owns
 * the view DDL; this is just the typed shape for reads via `db`. Counts are bigint
 * (number mode); `kd`/`hs_pct` are numeric (returned as strings). Profile columns
 * are null for untracked pub players.
 */
export const dmPlayerStats = pgView("dm_player_stats", {
  steamid64: text("steamid64"),
  personaname: varchar("personaname", { length: 255 }),
  avatarfull: varchar("avatarfull", { length: 500 }),
  countryFlag: varchar("country_flag", { length: 2 }),
  isTracked: boolean("is_tracked"),
  kills: bigint("kills", { mode: "number" }),
  deaths: bigint("deaths", { mode: "number" }),
  assists: bigint("assists", { mode: "number" }),
  headshotKills: bigint("headshot_kills", { mode: "number" }),
  kd: numeric("kd"),
  hsPct: numeric("hs_pct"),
}).existing();

/* ───────────────────────────── PUG match & queue system ─────────────────────────
 * Faceit-style competitive loop data layer (migration 0032; docs/pug-system-spec.md
 * §1–§13). steamid64 is canonical identity (FK players). Writes via service role;
 * pool/match/result tables are public-read so the client can subscribe via Realtime.
 * gameServers + playerQueueCooldowns are service-role only (infra / penalty records).
 */

/** Internal ELO/MMR per player — drives §5 team auto-balance and queue banding. */
export const playerRatings = pgTable("player_ratings", {
  steamid64: text()
    .primaryKey()
    .references(() => players.steamid64, { onDelete: "cascade" }),
  rating: integer().default(1000).notNull(),
  peakRating: integer("peak_rating").default(1000).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  wins: integer().default(0).notNull(),
  losses: integer().default(0).notNull(),
  lastMatchAt: timestamp("last_match_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

/** CS2 server pool (§8). rconSecretRef is the ENV VAR NAME, never the secret itself. */
export const gameServers = pgTable(
  "game_servers",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 120 }).notNull(),
    region: varchar({ length: 32 }),
    host: text().notNull(),
    port: integer().default(27015).notNull(),
    gotvPort: integer("gotv_port"),
    rconSecretRef: text("rcon_secret_ref"),
    status: varchar({ length: 16 }).default("offline").notNull(),
    // FK to matches(id) is declared in migration 0032 (ALTER, to break the circular
    // ref with matches.serverId). Kept as a plain column here to avoid a TS type cycle.
    currentMatchId: uuid("current_match_id"),
    lastHeartbeatAt: timestamp("last_heartbeat_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_game_servers_status").on(table.status),
    check(
      "game_servers_status_chk",
      sql`${table.status} IN ('available','in_use','offline','maintenance')`,
    ),
  ],
);

/**
 * One row per PUG. `status` IS the backend-owned phase state machine:
 * pending_accept → accepted → staging(§6) → configuring(§8) → awaiting_connect(§9)
 * → live(§10) → completed(§12); any → cancelled. `seq` powers /matches/<seq> URLs.
 */
export const matches = pgTable(
  "matches",
  {
    id: uuid().primaryKey().defaultRandom(),
    seq: bigint("seq", { mode: "number" }).generatedAlwaysAsIdentity(),
    league: varchar({ length: 32 }).default("open").notNull(),
    region: varchar({ length: 32 }),
    // Tournament attribution (migration 0043). Kept as plain columns (FKs to the
    // competition_* tables are declared in 0043) to avoid forward-ref ordering.
    seasonId: uuid("season_id"),
    stageId: uuid("stage_id"),
    matchSource: varchar("match_source", { length: 24 }).default("queue").notNull(),
    homeEntrantId: uuid("home_entrant_id"),
    awayEntrantId: uuid("away_entrant_id"),
    status: varchar({ length: 24 }).default("pending_accept").notNull(),
    map: varchar({ length: 64 }),
    serverId: uuid("server_id").references(() => gameServers.id, {
      onDelete: "set null",
    }),
    // §5 generated team names + §6 bot-created Discord voice channel ids.
    team1Name: varchar("team1_name", { length: 64 }),
    team2Name: varchar("team2_name", { length: 64 }),
    discordTeam1ChannelId: text("discord_team1_channel_id"),
    discordTeam2ChannelId: text("discord_team2_channel_id"),
    acceptDeadline: timestamp("accept_deadline", {
      withTimezone: true,
      mode: "string",
    }),
    stagingDeadline: timestamp("staging_deadline", {
      withTimezone: true,
      mode: "string",
    }),
    connectDeadline: timestamp("connect_deadline", {
      withTimezone: true,
      mode: "string",
    }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("matches_seq_key").on(table.seq),
    index("idx_matches_status").on(table.status),
    index("idx_matches_created_at").on(table.createdAt),
    check(
      "matches_status_chk",
      sql`${table.status} IN ('pending_accept','accepted','staging','configuring','awaiting_connect','live','completed','cancelled')`,
    ),
  ],
);

/** Roster + team allocation (§5) + accept (§4) + lobby/connect tracking (§6/§9). */
export const matchPlayers = pgTable(
  "match_players",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    team: integer(),
    ratingAtQueue: integer("rating_at_queue"),
    acceptStatus: varchar("accept_status", { length: 12 })
      .default("pending")
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
    discordJoined: boolean("discord_joined").default(false).notNull(),
    connected: boolean().default(false).notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.steamid64] }),
    index("idx_match_players_steamid64").on(table.steamid64),
    index("idx_match_players_match").on(table.matchId),
    check("match_players_team_chk", sql`${table.team} IS NULL OR ${table.team} IN (1,2)`),
    check(
      "match_players_accept_chk",
      sql`${table.acceptStatus} IN ('pending','accepted','declined','timeout')`,
    ),
  ],
);

/** The live queue pool (§2). One active ('searching') entry per player at a time. */
export const queueEntries = pgTable(
  "queue_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    league: varchar({ length: 32 }).default("open").notNull(),
    region: varchar({ length: 32 }),
    partyId: uuid("party_id"),
    status: varchar({ length: 12 }).default("searching").notNull(),
    rating: integer(),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("queue_entries_one_active_per_player")
      .on(table.steamid64)
      .where(sql`${table.status} = 'searching'`),
    index("idx_queue_entries_league_status").on(table.league, table.status),
    check(
      "queue_entries_status_chk",
      sql`${table.status} IN ('searching','matched','cancelled')`,
    ),
  ],
);

/** Penalty matrix (§4). Eligibility (§2) checks for an unexpired row. Service-role only. */
export const playerQueueCooldowns = pgTable(
  "player_queue_cooldowns",
  {
    id: uuid().primaryKey().defaultRandom(),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    reason: varchar({ length: 32 }).notNull(),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    strikes: integer().default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_queue_cooldowns_active").on(table.steamid64, table.expiresAt),
  ],
);

/** Append-only raw MatchZy firehose (§11), correlated by match_id. */
export const matchEvents = pgTable(
  "match_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    eventId: text("event_id"),
    eventType: text("event_type").notNull(),
    round: integer(),
    payload: jsonb(),
    raw: jsonb().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }),
    ingestedAt: timestamp("ingested_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("match_events_event_id_key")
      .on(table.eventId)
      .where(sql`${table.eventId} IS NOT NULL`),
    index("idx_match_events_match").on(table.matchId, table.occurredAt),
  ],
);

/** Aggregated outcome (§12), one row per match. winnerTeam NULL = draw/cancelled. */
export const matchResults = pgTable(
  "match_results",
  {
    matchId: uuid("match_id")
      .primaryKey()
      .references(() => matches.id, { onDelete: "cascade" }),
    winnerTeam: integer("winner_team"),
    scoreTeam1: integer("score_team1").default(0).notNull(),
    scoreTeam2: integer("score_team2").default(0).notNull(),
    map: varchar({ length: 64 }),
    durationSeconds: integer("duration_seconds"),
    finalizedAt: timestamp("finalized_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "match_results_winner_chk",
      sql`${table.winnerTeam} IS NULL OR ${table.winnerTeam} IN (1,2)`,
    ),
  ],
);

/** Per-player post-match line (§13). ratingDelta = ELO change applied this match. */
export const matchPlayerStats = pgTable(
  "match_player_stats",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    team: integer(),
    kills: integer().default(0).notNull(),
    deaths: integer().default(0).notNull(),
    assists: integer().default(0).notNull(),
    headshotKills: integer("headshot_kills").default(0).notNull(),
    damage: integer().default(0).notNull(),
    mvps: integer().default(0).notNull(),
    ratingDelta: integer("rating_delta"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.steamid64] }),
    index("idx_match_player_stats_steamid64").on(table.steamid64),
    check(
      "match_player_stats_team_chk",
      sql`${table.team} IS NULL OR ${table.team} IN (1,2)`,
    ),
  ],
);

/**
 * Player roles/positions (rifler, AWPer, IGL, …). `matchId` NULL = the player's
 * DEFAULT/declared role (read by the /play card); `matchId` set = a per-match
 * override (post-MVP roster role). `position` CHECK mirrors POSITION_IDS in
 * entities/players/lib/positions.ts. Migration 0033.
 */
export const teamPositions = pgTable(
  "team_positions",
  {
    id: uuid().primaryKey().defaultRandom(),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "cascade",
    }),
    position: varchar({ length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("team_positions_default_uq")
      .on(table.steamid64)
      .where(sql`${table.matchId} IS NULL`),
    uniqueIndex("team_positions_match_uq")
      .on(table.matchId, table.steamid64)
      .where(sql`${table.matchId} IS NOT NULL`),
    index("idx_team_positions_match")
      .on(table.matchId)
      .where(sql`${table.matchId} IS NOT NULL`),
    check(
      "team_positions_position_chk",
      sql`${table.position} IN ('igl','awper','entry','rifler','support','lurker')`,
    ),
  ],
);

// ============================================================================
// Scrim finder (tiers, regions, listings, challenges, scrims, servers, chat)
// ============================================================================

export const tiers = pgTable(
  "tiers",
  {
    id: uuid().primaryKey().defaultRandom(),
    rank: integer().notNull(),
    slug: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 64 }).notNull(),
    color: varchar({ length: 7 }),
    logo: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tiers_rank_key").on(table.rank),
    uniqueIndex("tiers_slug_key").on(table.slug),
  ],
);

export const scrimRegions = pgTable(
  "scrim_regions",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 64 }).notNull(),
    timezone: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("scrim_regions_slug_key").on(table.slug)],
);

export const scrimListings = pgTable(
  "scrim_listings",
  {
    id: uuid().primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    timeslot: timestamp({ withTimezone: true, mode: "string" }).notNull(),
    minTierId: uuid("min_tier_id").references(() => tiers.id, {
      onDelete: "set null",
    }),
    regionId: uuid("region_id").references(() => scrimRegions.id, {
      onDelete: "set null",
    }),
    active: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("scrim_listings_active_timeslot_idx").on(table.active, table.timeslot),
    index("scrim_listings_team_id_idx").on(table.teamId),
    uniqueIndex("scrim_listings_team_timeslot_active_key")
      .on(table.teamId, table.timeslot)
      .where(sql`${table.active}`),
  ],
);

export const scrimListingMaps = pgTable(
  "scrim_listing_maps",
  {
    id: uuid().primaryKey().defaultRandom(),
    scrimListingId: uuid("scrim_listing_id")
      .notNull()
      .references(() => scrimListings.id, { onDelete: "cascade" }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("scrim_listing_maps_listing_map_key").on(
      table.scrimListingId,
      table.mapId,
    ),
  ],
);

export const scrimChallenges = pgTable(
  "scrim_challenges",
  {
    id: uuid().primaryKey().defaultRandom(),
    scrimListingId: uuid("scrim_listing_id")
      .notNull()
      .references(() => scrimListings.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    active: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("scrim_challenges_listing_id_idx").on(table.scrimListingId),
    uniqueIndex("scrim_challenges_listing_team_active_key")
      .on(table.scrimListingId, table.teamId)
      .where(sql`${table.active}`),
  ],
);

export const scrimChallengeMaps = pgTable(
  "scrim_challenge_maps",
  {
    id: uuid().primaryKey().defaultRandom(),
    scrimChallengeId: uuid("scrim_challenge_id")
      .notNull()
      .references(() => scrimChallenges.id, { onDelete: "cascade" }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("scrim_challenge_maps_challenge_map_key").on(
      table.scrimChallengeId,
      table.mapId,
    ),
  ],
);

export const scrims = pgTable(
  "scrims",
  {
    id: uuid().primaryKey().defaultRandom(),
    scrimListingId: uuid("scrim_listing_id").references(() => scrimListings.id, {
      onDelete: "set null",
    }),
    scrimChallengeId: uuid("scrim_challenge_id").references(
      () => scrimChallenges.id,
      { onDelete: "set null" },
    ),
    homeTeamId: uuid("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayTeamId: uuid("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    mapId: uuid("map_id").references(() => maps.id, { onDelete: "set null" }),
    matchTime: timestamp("match_time", { withTimezone: true, mode: "string" }).notNull(),
    active: boolean().default(true).notNull(),
    scrimCancelId: uuid("scrim_cancel_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("scrims_active_match_time_idx").on(table.active, table.matchTime),
    index("scrims_home_team_id_idx").on(table.homeTeamId),
    index("scrims_away_team_id_idx").on(table.awayTeamId),
  ],
);

export const teamServers = pgTable(
  "team_servers",
  {
    id: uuid().primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    label: varchar({ length: 120 }),
    ip: text().notNull(),
    port: integer().notNull(),
    password: text(),
    status: varchar({ length: 32 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("team_servers_team_id_idx").on(table.teamId)],
);

export const scrimChatMessages = pgTable(
  "scrim_chat_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    scrimId: uuid("scrim_id")
      .notNull()
      .references(() => scrims.id, { onDelete: "cascade" }),
    channel: varchar({ length: 32 }).default("global").notNull(),
    userId: uuid("user_id").notNull(),
    message: text().notNull(),
    timestamp: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("scrim_chat_messages_scrim_ts_idx").on(table.scrimId, table.timestamp)],
);

/**
 * Steam friends notification bot (see docs/steam-friends-bot/plan.md).
 * RLS, scrim enqueue triggers, and the auth.users FKs live in migration 0038 —
 * not expressible in the Drizzle schema, so they're SQL-only.
 */

/** Unified outbound Steam DM queue: `direct` (match pop) + `broadcast` (fan-out). */
export const steamDmJobs = pgTable(
  "steam_dm_jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** 'direct' | 'broadcast' */
    kind: varchar({ length: 16 }).notNull(),
    /** 'match' | 'news' | 'scrim' | 'broadcast' */
    category: varchar({ length: 24 }).notNull(),
    /** Recipient for 'direct' jobs; null for 'broadcast' (audience in payload). */
    steamid64: text(),
    payload: jsonb().default(sql`'{}'::jsonb`).notNull(),
    dedupKey: text("dedup_key"),
    /** queued|running|done|error */
    status: varchar({ length: 16 }).default("queued").notNull(),
    attempts: integer().default(0).notNull(),
    error: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("steam_dm_jobs_dedup_key_key")
      .on(table.dedupKey)
      .where(sql`${table.dedupKey} IS NOT NULL`),
    index("steam_dm_jobs_drain_idx").on(table.status, table.createdAt),
  ],
);

/** Per-recipient delivery ledger so a retried broadcast never double-sends. */
export const steamDmDeliveries = pgTable(
  "steam_dm_deliveries",
  {
    id: uuid().primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => steamDmJobs.id, { onDelete: "cascade" }),
    steamid64: text().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("steam_dm_deliveries_job_recipient_key").on(table.jobId, table.steamid64),
  ],
);

/** Per-user notification category toggles (master switch = bot friendship). */
export const steamNotificationPrefs = pgTable("steam_notification_prefs", {
  /** auth.users(id) — FK in migration 0038. */
  userId: uuid("user_id").primaryKey(),
  notifyMatch: boolean("notify_match").default(true).notNull(),
  notifyNews: boolean("notify_news").default(true).notNull(),
  notifyScrim: boolean("notify_scrim").default(true).notNull(),
  notifyBroadcast: boolean("notify_broadcast").default(true).notNull(),
  notifyTournament: boolean("notify_tournament").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

/** Roster of accounts that have added the bot; user_id back-filled on link. */
export const steamFriends = pgTable(
  "steam_friends",
  {
    steamid64: text().primaryKey(),
    /** auth.users(id) — FK in migration 0038; null until the steamid is linked. */
    userId: uuid("user_id"),
    /** active|removed|blocked */
    friendStatus: varchar("friend_status", { length: 16 }).default("active").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    lastDmAt: timestamp("last_dm_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [index("steam_friends_user_id_idx").on(table.userId)],
);

// ============================================================================
// Anticheat client (migration 0042). All service-role only — clients write via
// /api/ac/*, never the DB. See docs/anticheat-client-build-decisions.md.
// ============================================================================

/** One paired machine per row. Device token stored hashed, never raw. */
export const acDevices = pgTable(
  "ac_devices",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** auth.users(id) — FK in migration 0042. */
    userId: uuid("user_id").notNull(),
    /** sha-256 of the device token. */
    tokenHash: text("token_hash").notNull(),
    label: varchar({ length: 120 }),
    osInfo: jsonb("os_info").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }),
    /** null = active. */
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ac_devices_token_hash_key").on(table.tokenHash),
    index("ac_devices_user_id_idx").on(table.userId),
  ],
);

/**
 * One client run. The accept gate reads lastHeartbeatAt. Environment attestation
 * is embedded (informational only — never a gate in v1). No per-heartbeat table.
 */
export const acSessions = pgTable(
  "ac_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => acDevices.id, { onDelete: "cascade" }),
    /** auth.users(id) — denormalized for fast gate reads (FK in migration 0042). */
    userId: uuid("user_id").notNull(),
    /** Resolved at session start, for match correlation / RCON kick. */
    steamid64: text(),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    appVersion: varchar("app_version", { length: 32 }),
    /** active|ended|stale */
    status: varchar({ length: 16 }).default("active").notNull(),
    tpmPresent: boolean("tpm_present"),
    secureBoot: boolean("secure_boot"),
    iommu: boolean(),
    vbs: boolean(),
    osBuild: text("os_build"),
    envRaw: jsonb("env_raw").default(sql`'{}'::jsonb`).notNull(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true, mode: "string" }),
    heartbeatCount: integer("heartbeat_count").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("ac_sessions_user_heartbeat_idx").on(table.userId, table.lastHeartbeatAt),
    index("ac_sessions_match_id_idx")
      .on(table.matchId)
      .where(sql`${table.matchId} IS NOT NULL`),
    index("ac_sessions_status_idx").on(table.status),
    check(
      "ac_sessions_status_chk",
      sql`${table.status} IN ('active','ended','stale')`,
    ),
  ],
);

/** Server-owned detection list, served as a versioned bundle to the dumb client. */
export const acSignatures = pgTable(
  "ac_signatures",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** hash|process_name|driver_name|window */
    kind: varchar({ length: 16 }).notNull(),
    /** the sha-256 / name / pattern to match. */
    value: text().notNull(),
    /** info|low|medium|high|critical */
    severity: varchar({ length: 16 }).default("medium").notNull(),
    label: varchar({ length: 160 }),
    enabled: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ac_signatures_kind_value_key").on(table.kind, table.value),
    index("ac_signatures_enabled_idx").on(table.enabled, table.updatedAt),
    check(
      "ac_signatures_kind_chk",
      sql`${table.kind} IN ('hash','process_name','driver_name','window')`,
    ),
    check(
      "ac_signatures_severity_chk",
      sql`${table.severity} IN ('info','low','medium','high','critical')`,
    ),
  ],
);

/** Forensic findings. Idempotent on a composite content key (no trustworthy client id). */
export const acEvents = pgTable(
  "ac_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => acSessions.id, {
      onDelete: "set null",
    }),
    /** auth.users(id) — FK in migration 0042. */
    userId: uuid("user_id").notNull(),
    steamid64: text(),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    /** signature_match|new_driver|new_process|env_snapshot|ac_dropout|kicked|backend_unverified */
    kind: text().notNull(),
    /** info|low|medium|high|critical */
    severity: varchar({ length: 16 }).default("info").notNull(),
    signatureId: uuid("signature_id").references(() => acSignatures.id, {
      onDelete: "set null",
    }),
    payload: jsonb().default(sql`'{}'::jsonb`).notNull(),
    /** composite content hash for idempotency. */
    dedupKey: text("dedup_key"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ac_events_dedup_key_key")
      .on(table.dedupKey)
      .where(sql`${table.dedupKey} IS NOT NULL`),
    index("ac_events_user_created_idx").on(table.userId, table.createdAt),
    index("ac_events_match_id_idx")
      .on(table.matchId)
      .where(sql`${table.matchId} IS NOT NULL`),
    index("ac_events_triage_idx").on(table.severity, table.kind, table.createdAt),
    check(
      "ac_events_severity_chk",
      sql`${table.severity} IN ('info','low','medium','high','critical')`,
    ),
  ],
);

/** Admin review queue. Nothing auto-bans; confirmed flags feed Veritas. */
export const acFlags = pgTable(
  "ac_flags",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** auth.users(id) — FK in migration 0042. */
    userId: uuid("user_id").notNull(),
    eventId: uuid("event_id").references(() => acEvents.id, { onDelete: "set null" }),
    /** open|reviewing|confirmed|dismissed */
    status: varchar({ length: 16 }).default("open").notNull(),
    /** info|low|medium|high|critical */
    severity: varchar({ length: 16 }).default("medium").notNull(),
    /** auth.users(id) — FK in migration 0042. */
    reviewedBy: uuid("reviewed_by"),
    resolution: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ac_flags_status_created_idx").on(table.status, table.createdAt),
    index("ac_flags_user_id_idx").on(table.userId),
    uniqueIndex("ac_flags_event_id_key")
      .on(table.eventId)
      .where(sql`${table.eventId} IS NOT NULL`),
    check(
      "ac_flags_status_chk",
      sql`${table.status} IN ('open','reviewing','confirmed','dismissed')`,
    ),
    check(
      "ac_flags_severity_chk",
      sql`${table.severity} IN ('info','low','medium','high','critical')`,
    ),
  ],
);

// ============================================================================
// Tournament / Competition module (migration 0043). See docs/tournaments/plan.md.
// ============================================================================

/** The persistent series/brand (config + identity). */
export const competitions = pgTable(
  "competitions",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 160 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    game: varchar({ length: 32 }).default("cs2").notNull(),
    gameMode: varchar("game_mode", { length: 16 }).notNull(),
    /** Driver slug, validated app-side (NOT a pg enum). */
    format: varchar({ length: 32 }).notNull(),
    entryType: varchar("entry_type", { length: 16 }).default("open").notNull(),
    recurrence: varchar({ length: 16 }).default("one_shot").notNull(),
    description: text(),
    branding: jsonb().default(sql`'{}'::jsonb`).notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("competitions_slug_key").on(sql`LOWER(${table.slug})`),
    index("competitions_format_idx").on(table.format),
    check(
      "competitions_entry_type_chk",
      sql`${table.entryType} IN ('open','approval','invite_only')`,
    ),
    check(
      "competitions_recurrence_chk",
      sql`${table.recurrence} IN ('one_shot','recurring')`,
    ),
  ],
);

/** Time-boxed instance; owns prizepool, registration window, roster-lock rules. */
export const competitionSeasons = pgTable(
  "competition_seasons",
  {
    id: uuid().primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").default(1).notNull(),
    name: varchar({ length: 255 }),
    status: varchar({ length: 24 }).default("draft").notNull(),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true, mode: "string" }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true, mode: "string" }),
    rosterLockAt: timestamp("roster_lock_at", { withTimezone: true, mode: "string" }),
    startAt: timestamp("start_at", { withTimezone: true, mode: "string" }),
    endAt: timestamp("end_at", { withTimezone: true, mode: "string" }),
    maxEntrants: integer("max_entrants"),
    minRoster: integer("min_roster").default(1).notNull(),
    maxRoster: integer("max_roster").default(1).notNull(),
    checkInRequired: boolean("check_in_required").default(false).notNull(),
    checkInOpensAt: timestamp("check_in_opens_at", { withTimezone: true, mode: "string" }),
    eligibilityRules: jsonb("eligibility_rules").default(sql`'{}'::jsonb`).notNull(),
    mapPool: jsonb("map_pool").default(sql`'[]'::jsonb`).notNull(),
    matchDefaults: jsonb("match_defaults").default(sql`'{}'::jsonb`).notNull(),
    entryFee: numeric("entry_fee"),
    fundingSource: varchar("funding_source", { length: 16 }).default("internal").notNull(),
    prizePool: numeric("prize_pool"),
    prizeCurrency: varchar("prize_currency", { length: 8 }).default("AUD"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("competition_seasons_number_key").on(table.competitionId, table.seasonNumber),
    index("competition_seasons_status_idx").on(table.status),
    check(
      "competition_seasons_status_chk",
      sql`${table.status} IN ('draft','announced','registration_open','registration_closed','seeding','live','completed','archived')`,
    ),
    check(
      "competition_seasons_funding_chk",
      sql`${table.fundingSource} IN ('internal','sponsor','entry_fees')`,
    ),
  ],
);

/** Ordered phases; each runs its own format driver and owns standings. */
export const competitionStages = pgTable(
  "competition_stages",
  {
    id: uuid().primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => competitionSeasons.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    name: varchar({ length: 120 }).notNull(),
    format: varchar({ length: 32 }).notNull(),
    formatConfig: jsonb("format_config").default(sql`'{}'::jsonb`).notNull(),
    advancementRule: jsonb("advancement_rule").default(sql`'{}'::jsonb`).notNull(),
    status: varchar({ length: 16 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("competition_stages_order_key").on(table.seasonId, table.sortOrder),
    check(
      "competition_stages_status_chk",
      sql`${table.status} IN ('pending','active','completed')`,
    ),
  ],
);

/** The universal competitor (1..N members). Optional team_id for provenance. */
export const competitionEntrants = pgTable(
  "competition_entrants",
  {
    id: uuid().primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => competitionSeasons.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    avatar: text(),
    seed: integer(),
    ladderRank: integer("ladder_rank"),
    status: varchar({ length: 16 }).default("registered").notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "string" }),
    entryPaymentStatus: varchar("entry_payment_status", { length: 16 }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("competition_entrants_season_idx").on(table.seasonId),
    uniqueIndex("competition_entrants_ladder_rank_key")
      .on(table.seasonId, table.ladderRank)
      .where(sql`${table.ladderRank} IS NOT NULL`),
    check(
      "competition_entrants_status_chk",
      sql`${table.status} IN ('registered','approved','checked_in','active','eliminated','dq','withdrawn')`,
    ),
  ],
);

/** Explicit per-stage participants (composite multi-stage). Empty = all entrants. */
export const competitionStageEntrants = pgTable(
  "competition_stage_entrants",
  {
    stageId: uuid("stage_id")
      .notNull()
      .references(() => competitionStages.id, { onDelete: "cascade" }),
    entrantId: uuid("entrant_id")
      .notNull()
      .references(() => competitionEntrants.id, { onDelete: "cascade" }),
    seed: integer(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.stageId, table.entrantId] }),
    index("competition_stage_entrants_stage_idx").on(table.stageId),
  ],
);

/** Roster snapshot. season_id denormalized for the one-per-season rule. */
export const competitionEntrantMembers = pgTable(
  "competition_entrant_members",
  {
    entrantId: uuid("entrant_id")
      .notNull()
      .references(() => competitionEntrants.id, { onDelete: "cascade" }),
    steamid64: text()
      .notNull()
      .references(() => players.steamid64, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => competitionSeasons.id, { onDelete: "cascade" }),
    role: varchar({ length: 16 }).default("member").notNull(),
    isCaptain: boolean("is_captain").default(false).notNull(),
    uniqueEnforced: boolean("unique_enforced").default(true).notNull(),
    addedAt: timestamp("added_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entrantId, table.steamid64] }),
    uniqueIndex("competition_entrant_members_one_per_season")
      .on(table.seasonId, table.steamid64)
      .where(sql`${table.uniqueEnforced}`),
    index("competition_entrant_members_steamid_idx").on(table.steamid64),
  ],
);

/** Scheduled / bracket-positioned matchup. next_fixture_id wires advancement. */
export const competitionFixtures = pgTable(
  "competition_fixtures",
  {
    id: uuid().primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => competitionStages.id, { onDelete: "cascade" }),
    round: integer(),
    bracketSlot: varchar("bracket_slot", { length: 64 }),
    homeEntrantId: uuid("home_entrant_id").references(() => competitionEntrants.id, {
      onDelete: "set null",
    }),
    awayEntrantId: uuid("away_entrant_id").references(() => competitionEntrants.id, {
      onDelete: "set null",
    }),
    bestOf: integer("best_of"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    // Self-ref FKs created in migrations 0043/0045 (kept plain to avoid TS cycles).
    nextFixtureId: uuid("next_fixture_id"),
    nextSlot: varchar("next_slot", { length: 8 }),
    // Double-elim: 'wb' | 'lb' | 'gf'; loser drops into loser_fixture_id slot.
    bracket: varchar({ length: 8 }),
    loserFixtureId: uuid("loser_fixture_id"),
    loserSlot: varchar("loser_slot", { length: 8 }),
    status: varchar({ length: 16 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("competition_fixtures_stage_idx").on(table.stageId),
    index("competition_fixtures_scheduled_idx").on(table.scheduledAt),
    check(
      "competition_fixtures_status_chk",
      sql`${table.status} IN ('pending','scheduled','live','completed','forfeit','bye','cancelled')`,
    ),
  ],
);

/** Stored standings, recomputed by the driver. entrant_id OR steamid64. */
export const competitionStandings = pgTable(
  "competition_standings",
  {
    id: uuid().primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => competitionStages.id, { onDelete: "cascade" }),
    entrantId: uuid("entrant_id").references(() => competitionEntrants.id, {
      onDelete: "cascade",
    }),
    steamid64: text().references(() => players.steamid64, { onDelete: "cascade" }),
    rank: integer(),
    points: numeric().default("0").notNull(),
    wins: integer().default(0).notNull(),
    losses: integer().default(0).notNull(),
    draws: integer().default(0).notNull(),
    roundsFor: integer("rounds_for").default(0).notNull(),
    roundsAgainst: integer("rounds_against").default(0).notNull(),
    matchesPlayed: integer("matches_played").default(0).notNull(),
    tiebreak: jsonb().default(sql`'{}'::jsonb`).notNull(),
    finalPlacement: integer("final_placement"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("competition_standings_stage_entrant_key")
      .on(table.stageId, table.entrantId)
      .where(sql`${table.entrantId} IS NOT NULL`),
    uniqueIndex("competition_standings_stage_steamid_key")
      .on(table.stageId, table.steamid64)
      .where(sql`${table.steamid64} IS NOT NULL`),
  ],
);

/** The ladder challenge (scrim-challenge analog + a season). */
export const competitionChallenges = pgTable(
  "competition_challenges",
  {
    id: uuid().primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => competitionStages.id, { onDelete: "cascade" }),
    challengerEntrantId: uuid("challenger_entrant_id")
      .notNull()
      .references(() => competitionEntrants.id, { onDelete: "cascade" }),
    challengedEntrantId: uuid("challenged_entrant_id")
      .notNull()
      .references(() => competitionEntrants.id, { onDelete: "cascade" }),
    challengerRank: integer("challenger_rank"),
    challengedRank: integer("challenged_rank"),
    status: varchar({ length: 16 }).default("pending").notNull(),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    proposedAt: timestamp("proposed_at", { withTimezone: true, mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("competition_challenges_stage_idx").on(table.stageId, table.status),
    uniqueIndex("competition_challenges_active_challenger_key")
      .on(table.challengerEntrantId)
      .where(sql`${table.status} IN ('pending','accepted')`),
    uniqueIndex("competition_challenges_active_challenged_key")
      .on(table.challengedEntrantId)
      .where(sql`${table.status} IN ('pending','accepted')`),
    check(
      "competition_challenges_status_chk",
      sql`${table.status} IN ('pending','accepted','declined','expired','forfeit','completed','cancelled')`,
    ),
  ],
);

/** Placement-range payouts. */
export const competitionPrizes = pgTable(
  "competition_prizes",
  {
    id: uuid().primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => competitionSeasons.id, { onDelete: "cascade" }),
    placementLow: integer("placement_low").notNull(),
    placementHigh: integer("placement_high").notNull(),
    prizeType: varchar("prize_type", { length: 20 }).notNull(),
    amount: numeric(),
    currency: varchar({ length: 8 }),
    description: text(),
    recipientEntrantId: uuid("recipient_entrant_id").references(
      () => competitionEntrants.id,
      { onDelete: "set null" },
    ),
    payoutStatus: varchar("payout_status", { length: 16 }).default("pending").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("competition_prizes_season_idx").on(table.seasonId),
    check(
      "competition_prizes_type_chk",
      sql`${table.prizeType} IN ('cash','in_game_item','platform_points','physical','custom')`,
    ),
    check(
      "competition_prizes_payout_chk",
      sql`${table.payoutStatus} IN ('pending','paid')`,
    ),
  ],
);

/** Per-competition organizer delegation. */
export const competitionOrganizers = pgTable(
  "competition_organizers",
  {
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: varchar({ length: 16 }).notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.competitionId, table.userId] }),
    check(
      "competition_organizers_role_chk",
      sql`${table.role} IN ('owner','admin','moderator')`,
    ),
  ],
);

/** Every sensitive organizer action. Service-role only. */
export const competitionAuditLog = pgTable(
  "competition_audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    competitionId: uuid("competition_id").references(() => competitions.id, {
      onDelete: "set null",
    }),
    seasonId: uuid("season_id"),
    actorUserId: uuid("actor_user_id"),
    action: varchar({ length: 64 }).notNull(),
    target: text(),
    before: jsonb(),
    after: jsonb(),
    reason: text(),
    at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [index("competition_audit_log_competition_idx").on(table.competitionId, table.at)],
);

/** Demo-linked dispute tickets. Service-role only. */
export const matchDisputes = pgTable(
  "match_disputes",
  {
    id: uuid().primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    raisedByEntrant: uuid("raised_by_entrant").references(() => competitionEntrants.id, {
      onDelete: "set null",
    }),
    raisedByUser: uuid("raised_by_user"),
    type: varchar({ length: 32 }).notNull(),
    description: text(),
    evidenceUrls: jsonb("evidence_urls").default(sql`'[]'::jsonb`).notNull(),
    demoObjectPath: text("demo_object_path"),
    status: varchar({ length: 16 }).default("open").notNull(),
    resolution: text(),
    resolvedBy: uuid("resolved_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("match_disputes_match_idx").on(table.matchId),
    check(
      "match_disputes_status_chk",
      sql`${table.status} IN ('open','reviewing','resolved','rejected')`,
    ),
  ],
);

/** Typed link between a news article and a season. */
export const newsArticleCompetitions = pgTable(
  "news_article_competitions",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => newsArticles.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => competitionSeasons.id, { onDelete: "cascade" }),
    relationType: varchar("relation_type", { length: 16 }).default("general").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.seasonId] }),
    index("news_article_competitions_season_idx").on(table.seasonId),
    check(
      "news_article_competitions_relation_chk",
      sql`${table.relationType} IN ('announcement','preview','recap','result','general')`,
    ),
  ],
);
