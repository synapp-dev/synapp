import {
  pgTable,
  varchar,
  boolean,
  json,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const organisations = pgTable("organisations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  created_at: timestamp("created_at", {
    withTimezone: false,
    mode: "string",
  }),
  description: varchar("description", { length: 255 }),
  is_active: boolean("is_active"),
  logo_url: varchar("logo_url", { length: 255 }),
  metadata: json("metadata"),
  name: varchar("name", { length: 255 }).notNull(),
  settings: json("settings"),
  slug: varchar("slug", { length: 255 }).notNull(),
});

export const user_organisation_roles = pgTable("user_organisation_roles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  assigned_at: timestamp("assigned_at", {
    withTimezone: false,
    mode: "string",
  }),
  expires_at: timestamp("expires_at", { withTimezone: false, mode: "string" }),
  metadata: json("metadata"),
  notes: varchar("notes", { length: 255 }),
  organisation_id: varchar("organisation_id", { length: 255 }),
  role_id: varchar("role_id", { length: 255 }),
  user_id: varchar("user_id", { length: 255 }),
});

export const organisation_roles = pgTable("organisation_roles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
});

export const system_users = pgTable("system_users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  first_name: varchar("first_name", { length: 255 }),
  last_name: varchar("last_name", { length: 255 }),
  profile_picture_url: varchar("profile_picture_url", { length: 255 }),
  biography_title: varchar("biography_title", { length: 255 }),
  biography_description: varchar("biography_description", { length: 255 }),
  birthday: varchar("birthday", { length: 255 }),
  business_number: varchar("business_number", { length: 255 }),
  created_at: timestamp("created_at", { withTimezone: false, mode: "string" }),
  linkedin_url: varchar("linkedin_url", { length: 255 }),
  location: varchar("location", { length: 255 }),
  mobile_number: varchar("mobile_number", { length: 255 }),
  position_title: varchar("position_title", { length: 255 }),
  settings: json("settings"),
});

export const app_roles = pgTable("app_roles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
});

export const apps = pgTable("apps", {
  id: varchar("id", { length: 255 }).primaryKey(),
  app_template_id: integer("app_template_id").notNull(),
  created_at: timestamp("created_at", { withTimezone: false, mode: "string" }),
  description: varchar("description", { length: 255 }),
  metadata: json("metadata"),
  name: varchar("name", { length: 255 }).notNull(),
  organisation_id: varchar("organisation_id", { length: 255 }).notNull(),
  package_id: varchar("package_id", { length: 255 }),
  slug: varchar("slug", { length: 255 }),
  status: varchar("status", { length: 255 }),
});

export const user_app_roles = pgTable("user_app_roles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  app_id: varchar("app_id", { length: 255 }).notNull(),
  assigned_at: timestamp("assigned_at", { withTimezone: false, mode: "string" }),
  expires_at: timestamp("expires_at", { withTimezone: false, mode: "string" }),
  metadata: json("metadata"),
  notes: varchar("notes", { length: 255 }),
  role_id: varchar("role_id", { length: 255 }).notNull(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
});
