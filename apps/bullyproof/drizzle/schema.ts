import { pgTable, unique, uuid, text, uniqueIndex, check, foreignKey, smallint, timestamp, jsonb, boolean, index, pgPolicy, integer, bigserial, date, primaryKey, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const inviteStatus = pgEnum("invite_status", ['PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED'])
export const licenceStatus = pgEnum("licence_status", ['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'])


export const states = pgTable("states", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("states_code_key").on(table.code),
	unique("states_name_key").on(table.name),
]);

export const schoolSectors = pgTable("school_sectors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	key: text().notNull(),
}, (table) => [
	uniqueIndex("ux_school_sectors_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	unique("school_types_name_key").on(table.name),
	check("school_sectors_key_chk", sql`key = ANY (ARRAY['government'::text, 'catholic'::text, 'independent'::text])`),
]);

export const schoolYears = pgTable("school_years", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	displayName: text("display_name").notNull(),
	levelId: uuid("level_id").notNull(),
	sortIndex: smallint("sort_index").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [schoolLevels.id],
			name: "school_years_level_id_fkey"
		}),
	unique("school_years_code_key").on(table.code),
	unique("school_years_sort_index_key").on(table.sortIndex),
]);

export const userProfile = pgTable("user_profile", {
	id: uuid().primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text().notNull(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	metadata: jsonb().default({}),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "user_profile_id_fkey"
		}).onDelete("cascade"),
]);

export const curriculumStages = pgTable("curriculum_stages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	sortIndex: smallint("sort_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("curriculum_stages_code_key").on(table.code),
	unique("curriculum_stages_name_key").on(table.name),
	unique("curriculum_stages_sort_index_key").on(table.sortIndex),
	check("curriculum_stages_code_chk", sql`code ~ '^S[0-9]+$'::text`),
]);

export const scopes = pgTable("scopes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
}, (table) => [
	unique("scopes_name_key").on(table.name),
]);

export const classes = pgTable("classes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	schoolId: uuid("school_id").notNull(),
	name: text().notNull(),
	code: text(),
	stream: text(),
	room: text(),
	studentCap: smallint("student_cap"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("ux_classes_school_name").using("btree", sql`school_id`, sql`lower(name)`),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "classes_school_id_fkey"
		}).onDelete("cascade"),
	unique("classes_school_code_unique").on(table.schoolId, table.code),
]);

export const lessons = pgTable("lessons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	schoolId: uuid("school_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	createdByUserId: uuid("created_by_user_id"),
	status: text().default('draft').notNull(),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_lessons_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("idx_lessons_topic_id").using("btree", table.topicId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "lessons_created_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "lessons_school_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topics.id],
			name: "lessons_topic_id_fkey"
		}).onDelete("restrict"),
	check("lessons_status_check", sql`status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])`),
]);

export const topics = pgTable("topics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stageId: uuid("stage_id").notNull(),
	title: text().notNull(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	officialNotes: text("official_notes"),
}, (table) => [
	uniqueIndex("ux_topics_stage_title").using("btree", sql`stage_id`, sql`lower(title)`),
	foreignKey({
			columns: [table.stageId],
			foreignColumns: [curriculumStages.id],
			name: "topics_stage_id_fkey"
		}).onDelete("restrict"),
	check("topics_status_check", sql`status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])`),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scopeId: uuid("scope_id").notNull(),
	name: text().notNull(),
	description: text(),
	key: text(),
}, (table) => [
	foreignKey({
			columns: [table.scopeId],
			foreignColumns: [scopes.id],
			name: "roles_scope_id_fkey"
		}).onDelete("cascade"),
	unique("roles_scope_id_name_key").on(table.scopeId, table.name),
	unique("roles_key_key").on(table.key),
]);

export const lessonLiveState = pgTable("lesson_live_state", {
	lessonId: uuid("lesson_id").primaryKey().notNull(),
	currentSlideId: uuid("current_slide_id").notNull(),
	currentIndex: integer("current_index").notNull(),
	isPaused: boolean("is_paused").default(false).notNull(),
	updatedBy: uuid("updated_by").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("lesson_live_state_slide_idx").using("btree", table.currentSlideId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.currentSlideId],
			foreignColumns: [topicSlides.id],
			name: "lesson_live_state_current_slide_id_fkey"
		}),
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_live_state_lesson_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "lesson_live_state_updated_by_fkey"
		}),
	pgPolicy("livestate_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_live_state.lesson_id))) OR ((EXISTS ( SELECT 1
   FROM lessons l
  WHERE ((l.id = lesson_live_state.lesson_id) AND (l.created_by_user_id = auth.uid())))) AND has_any_role(ARRAY['TEACHER'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_live_state.lesson_id)))))` }),
	pgPolicy("livestate_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("livestate_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("livestate_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const schoolLevels = pgTable("school_levels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	key: text().notNull(),
}, (table) => [
	uniqueIndex("ux_school_levels_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	unique("school_levels_name_key").on(table.name),
	check("school_levels_key_chk", sql`key = ANY (ARRAY['primary'::text, 'secondary'::text])`),
]);

export const topicSlides = pgTable("topic_slides", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	topicId: uuid("topic_id").notNull(),
	orderIndex: integer("order_index").notNull(),
	kind: text().notNull(),
	textHtml: text("text_html"),
	imageUrl: text("image_url"),
	videoUrl: text("video_url"),
	videoStartS: integer("video_start_s"),
	videoEndS: integer("video_end_s"),
	officialNotes: text("official_notes"),
	durationSec: integer("duration_sec"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_topic_slides_topic_order").using("btree", table.topicId.asc().nullsLast().op("int4_ops"), table.orderIndex.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("topic_slides_topic_order_uniq").using("btree", table.topicId.asc().nullsLast().op("int4_ops"), table.orderIndex.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topics.id],
			name: "topic_slides_topic_id_fkey"
		}).onDelete("cascade"),
	unique("topic_slides_unique_order").on(table.topicId, table.orderIndex),
	check("topic_slides_kind_check", sql`kind = ANY (ARRAY['text'::text, 'image'::text, 'video'::text])`),
	check("topic_slides_payload_chk", sql`((kind = 'text'::text) AND (text_html IS NOT NULL) AND (image_url IS NULL) AND (video_url IS NULL)) OR ((kind = 'image'::text) AND (image_url IS NOT NULL) AND (text_html IS NULL) AND (video_url IS NULL)) OR ((kind = 'video'::text) AND (video_url IS NOT NULL) AND (text_html IS NULL))`),
]);

export const userRoles = pgTable("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	schoolId: uuid("school_id"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	roleScope: text("role_scope"),
}, (table) => [
	index("idx_user_roles_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_roles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_roles_role_idx").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	index("user_roles_school_idx").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("user_roles_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "user_roles_school_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_roles_unique").on(table.userId, table.roleId, table.schoolId),
	check("user_roles_scope_coherence_chk", sql`((role_scope = 'platform'::text) AND (school_id IS NULL)) OR ((role_scope = 'school'::text) AND (school_id IS NOT NULL))`),
]);

export const lessonEvents = pgTable("lesson_events", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	lessonId: uuid("lesson_id").notNull(),
	kind: text().notNull(),
	fromSlideId: uuid("from_slide_id"),
	toSlideId: uuid("to_slide_id"),
	toIndex: integer("to_index"),
	actorUserId: uuid("actor_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("lesson_events_lesson_idx").using("btree", table.lessonId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("lesson_events_session_idx").using("btree", table.sessionId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "lesson_events_actor_user_id_fkey"
		}),
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_events_lesson_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [lessonSessions.id],
			name: "lesson_events_session_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("events_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
	pgPolicy("events_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("events_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("events_update", { as: "permissive", for: "update", to: ["public"] }),
	check("lesson_events_kind_check", sql`kind = ANY (ARRAY['SLIDE_CHANGED'::text, 'PAUSED'::text, 'RESUMED'::text, 'JUMPED'::text, 'ENDED'::text])`),
]);

export const lessonSessions = pgTable("lesson_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	lessonId: uuid("lesson_id").notNull(),
	startedBy: uuid("started_by").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("lesson_sessions_lesson_idx").using("btree", table.lessonId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_sessions_lesson_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.startedBy],
			foreignColumns: [users.id],
			name: "lesson_sessions_started_by_fkey"
		}),
	pgPolicy("sessions_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_sessions.lesson_id))) OR (EXISTS ( SELECT 1
   FROM lessons l
  WHERE ((l.id = lesson_sessions.lesson_id) AND (l.created_by_user_id = auth.uid())))))` }),
	pgPolicy("sessions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("sessions_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("sessions_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const schoolInvites = pgTable("school_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	schoolId: uuid("school_id").notNull(),
	email: text().notNull(),
	roleKey: text("role_key").notNull(),
	token: text().notNull(),
	status: inviteStatus().default('PENDING').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	userId: uuid("user_id"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_school_invites_email").using("btree", sql`lower(email)`),
	index("ix_school_invites_school").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_school_invites_pending").using("btree", sql`school_id`, sql`lower(email)`, sql`role_key`).where(sql`(status = 'PENDING'::invite_status)`),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "school_invites_school_id_fkey"
		}).onDelete("cascade"),
	check("school_invites_email_check", sql`POSITION(('@'::text) IN (email)) > 1`),
]);

export const schoolLicences = pgTable("school_licences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	schoolId: uuid("school_id").notNull(),
	plan: text().default('STANDARD').notNull(),
	startsAt: date("starts_at").default(sql`CURRENT_DATE`).notNull(),
	endsAt: date("ends_at").default(sql`(CURRENT_DATE + '3 years'::interval)`).notNull(),
	autoRenew: boolean("auto_renew").default(false).notNull(),
	status: licenceStatus().default('PENDING').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_licences_school").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("ix_licences_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("uq_school_active_or_pending_licence").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")).where(sql`(status = ANY (ARRAY['PENDING'::licence_status, 'ACTIVE'::licence_status]))`),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "school_licences_school_id_fkey"
		}).onDelete("cascade"),
]);

export const schools = pgTable("schools", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	code: text(),
	stateId: uuid("state_id"),
	sectorId: uuid("sector_id"),
	emailDomain: text("email_domain"),
	address: text(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	slug: text(),
	bannerUrl: text("banner_url"),
	avatarUrl: text("avatar_url"),
}, (table) => [
	index("idx_schools_sector_id").using("btree", table.sectorId.asc().nullsLast().op("uuid_ops")),
	index("idx_schools_state_id").using("btree", table.stateId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("ux_schools_name_lower").using("btree", sql`lower(name)`),
	foreignKey({
			columns: [table.sectorId],
			foreignColumns: [schoolSectors.id],
			name: "schools_sector_id_fkey"
		}),
	foreignKey({
			columns: [table.stateId],
			foreignColumns: [states.id],
			name: "schools_state_id_fkey"
		}),
	unique("schools_code_key").on(table.code),
	unique("schools_slug_key").on(table.slug),
]);

export const schoolLevelAssignments = pgTable("school_level_assignments", {
	schoolId: uuid("school_id").notNull(),
	levelId: uuid("level_id").notNull(),
}, (table) => [
	index("idx_school_level_assignments_level_id").using("btree", table.levelId.asc().nullsLast().op("uuid_ops")),
	index("idx_school_level_assignments_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [schoolLevels.id],
			name: "school_level_assignments_level_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "school_level_assignments_school_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.schoolId, table.levelId], name: "school_level_assignments_pkey"}),
]);

export const lessonClasses = pgTable("lesson_classes", {
	lessonId: uuid("lesson_id").notNull(),
	classId: uuid("class_id").notNull(),
}, (table) => [
	index("idx_lesson_classes_class_id").using("btree", table.classId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "lesson_classes_class_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_classes_lesson_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.lessonId, table.classId], name: "lesson_classes_pkey"}),
]);

export const stageYearLinks = pgTable("stage_year_links", {
	stageId: uuid("stage_id").notNull(),
	schoolYearId: uuid("school_year_id").notNull(),
}, (table) => [
	index("idx_stage_year_links_school_year_id").using("btree", table.schoolYearId.asc().nullsLast().op("uuid_ops")),
	index("idx_stage_year_links_stage_id").using("btree", table.stageId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.schoolYearId],
			foreignColumns: [schoolYears.id],
			name: "stage_year_links_school_year_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.stageId],
			foreignColumns: [curriculumStages.id],
			name: "stage_year_links_stage_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.stageId, table.schoolYearId], name: "stage_year_links_pkey"}),
]);

export const classYears = pgTable("class_years", {
	classId: uuid("class_id").notNull(),
	schoolYearId: uuid("school_year_id").notNull(),
}, (table) => [
	index("idx_class_years_class_id").using("btree", table.classId.asc().nullsLast().op("uuid_ops")),
	index("idx_class_years_school_year_id").using("btree", table.schoolYearId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "class_years_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.schoolYearId],
			foreignColumns: [schoolYears.id],
			name: "class_years_school_year_id_fkey"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.classId, table.schoolYearId], name: "class_years_pkey"}),
]);

export const teacherSlideNotes = pgTable("teacher_slide_notes", {
	teacherUserId: uuid("teacher_user_id").notNull(),
	topicSlideId: uuid("topic_slide_id").notNull(),
	notesRichtext: text("notes_richtext"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teacherUserId],
			foreignColumns: [users.id],
			name: "teacher_slide_notes_teacher_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicSlideId],
			foreignColumns: [topicSlides.id],
			name: "teacher_slide_notes_topic_slide_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.teacherUserId, table.topicSlideId], name: "teacher_slide_notes_pkey"}),
]);

export const lessonSlideNotes = pgTable("lesson_slide_notes", {
	lessonId: uuid("lesson_id").notNull(),
	topicSlideId: uuid("topic_slide_id").notNull(),
	notesRichtext: text("notes_richtext"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_slide_notes_lesson_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicSlideId],
			foreignColumns: [topicSlides.id],
			name: "lesson_slide_notes_topic_slide_id_fkey"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.lessonId, table.topicSlideId], name: "lesson_slide_notes_pkey"}),
]);
export const vSchoolYears = pgView("v_school_years", {	id: uuid(),
	code: text(),
	displayName: text("display_name"),
	levelId: uuid("level_id"),
	sortIndex: smallint("sort_index"),
	levelKey: text("level_key"),
	levelName: text("level_name"),
}).as(sql`SELECT y.id, y.code, y.display_name, y.level_id, y.sort_index, sl.key AS level_key, sl.name AS level_name FROM school_years y JOIN school_levels sl ON sl.id = y.level_id`);

export const schoolLevelBadge = pgView("school_level_badge", {	schoolId: uuid("school_id"),
	levelBadge: text("level_badge"),
}).as(sql`SELECT s.id AS school_id, CASE WHEN count(*) FILTER (WHERE sl.key = 'primary'::text) = 1 AND count(*) FILTER (WHERE sl.key = 'secondary'::text) = 1 THEN 'P–12'::text WHEN COALESCE(bool_or(sl.key = 'primary'::text), false) THEN 'Primary'::text WHEN COALESCE(bool_or(sl.key = 'secondary'::text), false) THEN 'Secondary'::text ELSE 'Unknown'::text END AS level_badge FROM schools s LEFT JOIN school_level_assignments sla ON sla.school_id = s.id LEFT JOIN school_levels sl ON sl.id = sla.level_id GROUP BY s.id`);

export const vStageThresholds = pgView("v_stage_thresholds", {	stageId: uuid("stage_id"),
	minSortIndex: smallint("min_sort_index"),
	maxSortIndex: smallint("max_sort_index"),
}).as(sql`SELECT s.id AS stage_id, min(y.sort_index) AS min_sort_index, max(y.sort_index) AS max_sort_index FROM curriculum_stages s JOIN stage_year_links l ON l.stage_id = s.id JOIN school_years y ON y.id = l.school_year_id GROUP BY s.id`);

export const vLessonSlidesEffective = pgView("v_lesson_slides_effective", {	lessonId: uuid("lesson_id"),
	topicId: uuid("topic_id"),
	topicSlideId: uuid("topic_slide_id"),
	orderIndex: integer("order_index"),
	kind: text(),
	textHtml: text("text_html"),
	imageUrl: text("image_url"),
	videoUrl: text("video_url"),
	videoStartS: integer("video_start_s"),
	videoEndS: integer("video_end_s"),
	effectiveNotes: text("effective_notes"),
	teacherUserId: uuid("teacher_user_id"),
}).as(sql`SELECT l.id AS lesson_id, l.topic_id, ts.id AS topic_slide_id, ts.order_index, ts.kind, ts.text_html, ts.image_url, ts.video_url, ts.video_start_s, ts.video_end_s, COALESCE(lsn.notes_richtext, tsn.notes_richtext, ts.official_notes, t.official_notes) AS effective_notes, l.created_by_user_id AS teacher_user_id FROM lessons l JOIN topics t ON t.id = l.topic_id JOIN topic_slides ts ON ts.topic_id = t.id LEFT JOIN lesson_slide_notes lsn ON lsn.lesson_id = l.id AND lsn.topic_slide_id = ts.id LEFT JOIN teacher_slide_notes tsn ON tsn.teacher_user_id = l.created_by_user_id AND tsn.topic_slide_id = ts.id ORDER BY l.id, ts.order_index`);

export const vCurriculumStagesYears = pgView("v_curriculum_stages_years", {	stageId: uuid("stage_id"),
	stageCode: text("stage_code"),
	stageName: text("stage_name"),
	yearCodes: text("year_codes"),
	yearNames: text("year_names"),
	yearCodeRange: text("year_code_range"),
	yearNameRange: text("year_name_range"),
	minSortIndex: smallint("min_sort_index"),
	maxSortIndex: smallint("max_sort_index"),
}).as(sql`WITH yrs AS ( SELECT s.id AS stage_id, s.code AS stage_code, s.name AS stage_name, array_agg(y.code ORDER BY y.sort_index) AS year_codes, array_agg(y.display_name ORDER BY y.sort_index) AS year_names, min(y.sort_index) AS min_sort_index, max(y.sort_index) AS max_sort_index FROM curriculum_stages s LEFT JOIN stage_year_links l ON l.stage_id = s.id LEFT JOIN school_years y ON y.id = l.school_year_id GROUP BY s.id, s.code, s.name ) SELECT stage_id, stage_code, stage_name, year_codes, year_names, CASE WHEN array_length(year_codes, 1) IS NULL THEN NULL::text WHEN array_length(year_codes, 1) = 1 THEN year_codes[1] ELSE (year_codes[1] || '–'::text) || year_codes[array_length(year_codes, 1)] END AS year_code_range, CASE WHEN array_length(year_names, 1) IS NULL THEN NULL::text WHEN array_length(year_names, 1) = 1 THEN year_names[1] ELSE (year_names[1] || ' – '::text) || year_names[array_length(year_names, 1)] END AS year_name_range, min_sort_index, max_sort_index FROM yrs ORDER BY min_sort_index, stage_code`);

export const vClassesYears = pgView("v_classes_years", {	id: uuid(),
	schoolId: uuid("school_id"),
	name: text(),
	yearCodes: text("year_codes"),
	yearNames: text("year_names"),
	yearCodeRange: text("year_code_range"),
	yearNameRange: text("year_name_range"),
	levelKey: text("level_key"),
	levelName: text("level_name"),
}).as(sql`WITH yrs AS ( SELECT c.id, c.school_id, c.name, array_agg(y.code ORDER BY y.sort_index) AS year_codes, array_agg(y.display_name ORDER BY y.sort_index) AS year_names, min(y.sort_index) AS min_sort, max(y.sort_index) AS max_sort, min(sl.key) AS level_key, min(sl.name) AS level_name FROM classes c LEFT JOIN class_years cy ON cy.class_id = c.id LEFT JOIN school_years y ON y.id = cy.school_year_id LEFT JOIN school_levels sl ON sl.id = y.level_id GROUP BY c.id, c.school_id, c.name ) SELECT id, school_id, name, year_codes, year_names, CASE WHEN array_length(year_codes, 1) IS NULL THEN NULL::text WHEN array_length(year_codes, 1) = 1 THEN year_codes[1] ELSE (year_codes[1] || '–'::text) || year_codes[array_length(year_codes, 1)] END AS year_code_range, CASE WHEN array_length(year_names, 1) IS NULL THEN NULL::text WHEN array_length(year_names, 1) = 1 THEN year_names[1] ELSE (year_names[1] || ' – '::text) || year_names[array_length(year_names, 1)] END AS year_name_range, level_key, level_name FROM yrs ORDER BY name`);

export const vLessonAllowedSlides = pgView("v_lesson_allowed_slides", {	lessonId: uuid("lesson_id"),
	topicSlideId: uuid("topic_slide_id"),
	orderIndex: integer("order_index"),
}).as(sql`SELECT l.id AS lesson_id, ts.id AS topic_slide_id, ts.order_index FROM lessons l JOIN topics t ON t.id = l.topic_id JOIN topic_slides ts ON ts.topic_id = t.id`);

export const vSchoolsEnriched = pgView("v_schools_enriched", {	id: uuid(),
	name: text(),
	code: text(),
	slug: text(),
	emailDomain: text("email_domain"),
	address: text(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	state: jsonb(),
	sector: jsonb(),
	levels: jsonb(),
}).as(sql`SELECT sch.id, sch.name, sch.code, sch.slug, sch.email_domain, sch.address, sch.joined_at, sch.created_at, CASE WHEN st.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', st.id, 'code', st.code, 'name', st.name) END AS state, CASE WHEN sec.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', sec.id, 'key', sec.key, 'name', sec.name) END AS sector, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', lvl.id, 'key', lvl.key, 'name', lvl.name) ORDER BY lvl.key) AS jsonb_agg FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id), '[]'::jsonb) AS levels FROM schools sch LEFT JOIN states st ON st.id = sch.state_id LEFT JOIN school_sectors sec ON sec.id = sch.sector_id`);

export const vSchoolsReadable = pgView("v_schools_readable", {	id: uuid(),
	name: text(),
	code: text(),
	stateId: uuid("state_id"),
	sectorId: uuid("sector_id"),
	emailDomain: text("email_domain"),
	address: text(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	slug: text(),
	bannerUrl: text("banner_url"),
	avatarUrl: text("avatar_url"),
	state: text(),
	sector: text(),
	levels: text(),
}).with({"securityInvoker":"on"}).as(sql`SELECT sch.id, sch.name, sch.code, sch.state_id, sch.sector_id, sch.email_domain, sch.address, sch.joined_at, sch.created_at, sch.slug, sch.banner_url, sch.avatar_url, lower(st.code) AS state, sec.key AS sector, ARRAY( SELECT lvl.name FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id ORDER BY ( CASE lvl.key WHEN 'primary'::text THEN 1 WHEN 'secondary'::text THEN 2 ELSE 99 END)) AS levels FROM schools sch LEFT JOIN states st ON st.id = sch.state_id LEFT JOIN school_sectors sec ON sec.id = sch.sector_id`);

export const vUserProfileExpanded = pgView("v_user_profile_expanded", {	id: uuid(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	fullName: text("full_name"),
	email: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	platformRoles: text("platform_roles"),
	schoolRoles: jsonb("school_roles"),
}).as(sql`SELECT up.id, up.first_name, up.last_name, TRIM(BOTH ' '::text FROM concat(up.first_name, ' ', up.last_name)) AS full_name, up.email, up.avatar_url, up.created_at, up.updated_at, up.metadata, COALESCE(array_agg(DISTINCT r.key) FILTER (WHERE ur.role_scope = 'platform'::text), ARRAY[]::text[]) AS platform_roles, COALESCE(jsonb_agg(DISTINCT jsonb_build_object('schoolId', ur.school_id, 'roleKey', r.key)) FILTER (WHERE ur.role_scope = 'school'::text), '[]'::jsonb) AS school_roles FROM user_profile up LEFT JOIN user_roles ur ON ur.user_id = up.id LEFT JOIN roles r ON r.id = ur.role_id GROUP BY up.id, up.first_name, up.last_name, up.email, up.avatar_url, up.created_at, up.updated_at, up.metadata`);