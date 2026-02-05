import { pgTable, pgSchema, uniqueIndex, index, foreignKey, check, uuid, text, timestamp, jsonb, boolean, varchar, unique, pgPolicy, smallint, integer, bigserial, json, inet, bigint, date, primaryKey, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const auth = pgSchema("auth");
export const aalLevelInAuth = auth.enum("aal_level", ['aal1', 'aal2', 'aal3'])
export const codeChallengeMethodInAuth = auth.enum("code_challenge_method", ['s256', 'plain'])
export const factorStatusInAuth = auth.enum("factor_status", ['unverified', 'verified'])
export const factorTypeInAuth = auth.enum("factor_type", ['totp', 'webauthn', 'phone'])
export const oauthAuthorizationStatusInAuth = auth.enum("oauth_authorization_status", ['pending', 'approved', 'denied', 'expired'])
export const oauthClientTypeInAuth = auth.enum("oauth_client_type", ['public', 'confidential'])
export const oauthRegistrationTypeInAuth = auth.enum("oauth_registration_type", ['dynamic', 'manual'])
export const oauthResponseTypeInAuth = auth.enum("oauth_response_type", ['code'])
export const oneTimeTokenTypeInAuth = auth.enum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token'])
export const featurePermissionLevel = pgEnum("feature_permission_level", ['global', 'role', 'school', 'user'])
export const inviteStatus = pgEnum("invite_status", ['PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED'])
export const licenceStatus = pgEnum("licence_status", ['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'])


export const ssoDomainsInAuth = auth.table("sso_domains", {
	id: uuid().notNull(),
	ssoProviderId: uuid("sso_provider_id").notNull(),
	domain: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("sso_domains_domain_idx").using("btree", sql`lower(domain)`),
	index("sso_domains_sso_provider_id_idx").using("btree", table.ssoProviderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ssoProviderId],
			foreignColumns: [ssoProvidersInAuth.id],
			name: "sso_domains_sso_provider_id_fkey"
		}).onDelete("cascade"),
	check("domain not empty", sql`char_length(domain) > 0`),
]);

export const samlProvidersInAuth = auth.table("saml_providers", {
	id: uuid().notNull(),
	ssoProviderId: uuid("sso_provider_id").notNull(),
	entityId: text("entity_id").notNull(),
	metadataXml: text("metadata_xml").notNull(),
	metadataUrl: text("metadata_url"),
	attributeMapping: jsonb("attribute_mapping"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	nameIdFormat: text("name_id_format"),
}, (table) => [
	index("saml_providers_sso_provider_id_idx").using("btree", table.ssoProviderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ssoProviderId],
			foreignColumns: [ssoProvidersInAuth.id],
			name: "saml_providers_sso_provider_id_fkey"
		}).onDelete("cascade"),
	check("entity_id not empty", sql`char_length(entity_id) > 0`),
	check("metadata_url not empty", sql`(metadata_url = NULL::text) OR (char_length(metadata_url) > 0)`),
	check("metadata_xml not empty", sql`char_length(metadata_xml) > 0`),
]);

export const ssoProvidersInAuth = auth.table("sso_providers", {
	id: uuid().notNull(),
	resourceId: text("resource_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	disabled: boolean(),
}, (table) => [
	uniqueIndex("sso_providers_resource_id_idx").using("btree", sql`lower(resource_id)`),
	index("sso_providers_resource_id_pattern_idx").using("btree", table.resourceId.asc().nullsLast().op("text_pattern_ops")),
	check("resource_id not empty", sql`(resource_id = NULL::text) OR (char_length(resource_id) > 0)`),
]);

export const instancesInAuth = auth.table("instances", {
	id: uuid().notNull(),
	uuid: uuid(),
	rawBaseConfig: text("raw_base_config"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
});

export const schemaMigrationsInAuth = auth.table("schema_migrations", {
	version: varchar({ length: 255 }).notNull(),
});

export const courseTopics = pgTable("course_topics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	courseId: uuid("course_id").notNull(),
	title: text().notNull(),
	status: text().default('draft').notNull(),
	courseOrder: smallint("course_order").notNull(),
	isSequential: boolean("is_sequential").default(true).notNull(),
	quizCompletionPercentage: integer("quiz_completion_percentage").default(100).notNull(),
	officialNotes: text("official_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text().notNull(),
}, (table) => [
	uniqueIndex("course_topics_course_slug_unique").using("btree", table.courseId.asc().nullsLast().op("uuid_ops"), table.slug.asc().nullsLast().op("text_ops")),
	uniqueIndex("course_topics_course_title_unique").using("btree", sql`course_id`, sql`lower(title)`),
	index("idx_course_topics_course_id").using("btree", table.courseId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topics_course_order").using("btree", table.courseId.asc().nullsLast().op("uuid_ops"), table.courseOrder.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topics_course_slug").using("btree", table.courseId.asc().nullsLast().op("uuid_ops"), table.slug.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topics_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "course_topics_course_id_fkey"
		}).onDelete("restrict"),
	unique("course_topics_course_order_unique").on(table.courseId, table.courseOrder),
	pgPolicy("course_topics_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("course_topics_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("course_topics_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_topics_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("course_topics_quiz_completion_percentage_check", sql`(quiz_completion_percentage >= 0) AND (quiz_completion_percentage <= 100)`),
	check("course_topics_status_check", sql`status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])`),
]);

export const states = pgTable("states", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("states_code_key").on(table.code),
	unique("states_name_key").on(table.name),
]);

export const mfaFactorsInAuth = auth.table("mfa_factors", {
	id: uuid().notNull(),
	userId: uuid("user_id").notNull(),
	friendlyName: text("friendly_name"),
	factorType: factorTypeInAuth("factor_type").notNull(),
	status: factorStatusInAuth().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	secret: text(),
	phone: text(),
	lastChallengedAt: timestamp("last_challenged_at", { withTimezone: true, mode: 'string' }),
	webAuthnCredential: jsonb("web_authn_credential"),
	webAuthnAaguid: uuid("web_authn_aaguid"),
	lastWebauthnChallengeData: jsonb("last_webauthn_challenge_data"),
}, (table) => [
	index("factor_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("mfa_factors_user_friendly_name_unique").using("btree", table.friendlyName.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(TRIM(BOTH FROM friendly_name) <> ''::text)`),
	index("mfa_factors_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("unique_phone_factor_per_user").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.phone.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "mfa_factors_user_id_fkey"
		}).onDelete("cascade"),
]);

export const refreshTokensInAuth = auth.table("refresh_tokens", {
	instanceId: uuid("instance_id"),
	id: bigserial({ mode: "bigint" }).notNull(),
	token: varchar({ length: 255 }),
	userId: varchar("user_id", { length: 255 }),
	revoked: boolean(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	parent: varchar({ length: 255 }),
	sessionId: uuid("session_id"),
}, (table) => [
	index("refresh_tokens_instance_id_idx").using("btree", table.instanceId.asc().nullsLast().op("uuid_ops")),
	index("refresh_tokens_instance_id_user_id_idx").using("btree", table.instanceId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("refresh_tokens_parent_idx").using("btree", table.parent.asc().nullsLast().op("text_ops")),
	index("refresh_tokens_session_id_revoked_idx").using("btree", table.sessionId.asc().nullsLast().op("bool_ops"), table.revoked.asc().nullsLast().op("bool_ops")),
	index("refresh_tokens_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessionsInAuth.id],
			name: "refresh_tokens_session_id_fkey"
		}).onDelete("cascade"),
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

export const usersInAuth = auth.table("users", {
	instanceId: uuid("instance_id"),
	id: uuid().notNull(),
	aud: varchar({ length: 255 }),
	role: varchar({ length: 255 }),
	email: varchar({ length: 255 }),
	encryptedPassword: varchar("encrypted_password", { length: 255 }),
	emailConfirmedAt: timestamp("email_confirmed_at", { withTimezone: true, mode: 'string' }),
	invitedAt: timestamp("invited_at", { withTimezone: true, mode: 'string' }),
	confirmationToken: varchar("confirmation_token", { length: 255 }),
	confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true, mode: 'string' }),
	recoveryToken: varchar("recovery_token", { length: 255 }),
	recoverySentAt: timestamp("recovery_sent_at", { withTimezone: true, mode: 'string' }),
	emailChangeTokenNew: varchar("email_change_token_new", { length: 255 }),
	emailChange: varchar("email_change", { length: 255 }),
	emailChangeSentAt: timestamp("email_change_sent_at", { withTimezone: true, mode: 'string' }),
	lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: 'string' }),
	rawAppMetaData: jsonb("raw_app_meta_data"),
	rawUserMetaData: jsonb("raw_user_meta_data"),
	isSuperAdmin: boolean("is_super_admin"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	phone: text().default(sql`NULL`),
	phoneConfirmedAt: timestamp("phone_confirmed_at", { withTimezone: true, mode: 'string' }),
	phoneChange: text("phone_change").default(sql`NULL`),
	phoneChangeToken: varchar("phone_change_token", { length: 255 }).default(sql`NULL`),
	phoneChangeSentAt: timestamp("phone_change_sent_at", { withTimezone: true, mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }).generatedAlwaysAs(sql`LEAST(email_confirmed_at, phone_confirmed_at)`),
	emailChangeTokenCurrent: varchar("email_change_token_current", { length: 255 }).default(sql`NULL`),
	emailChangeConfirmStatus: smallint("email_change_confirm_status").default(0),
	bannedUntil: timestamp("banned_until", { withTimezone: true, mode: 'string' }),
	reauthenticationToken: varchar("reauthentication_token", { length: 255 }).default(sql`NULL`),
	reauthenticationSentAt: timestamp("reauthentication_sent_at", { withTimezone: true, mode: 'string' }),
	isSsoUser: boolean("is_sso_user").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	isAnonymous: boolean("is_anonymous").default(false).notNull(),
}, (table) => [
	uniqueIndex("confirmation_token_idx").using("btree", table.confirmationToken.asc().nullsLast().op("text_ops")).where(sql`((confirmation_token)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("email_change_token_current_idx").using("btree", table.emailChangeTokenCurrent.asc().nullsLast().op("text_ops")).where(sql`((email_change_token_current)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("email_change_token_new_idx").using("btree", table.emailChangeTokenNew.asc().nullsLast().op("text_ops")).where(sql`((email_change_token_new)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("reauthentication_token_idx").using("btree", table.reauthenticationToken.asc().nullsLast().op("text_ops")).where(sql`((reauthentication_token)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("recovery_token_idx").using("btree", table.recoveryToken.asc().nullsLast().op("text_ops")).where(sql`((recovery_token)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("users_email_partial_key").using("btree", table.email.asc().nullsLast().op("text_ops")).where(sql`(is_sso_user = false)`),
	index("users_instance_id_email_idx").using("btree", sql`instance_id`, sql`lower((email)::text)`),
	index("users_instance_id_idx").using("btree", table.instanceId.asc().nullsLast().op("uuid_ops")),
	index("users_is_anonymous_idx").using("btree", table.isAnonymous.asc().nullsLast().op("bool_ops")),
	check("users_email_change_confirm_status_check", sql`(email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)`),
]);

export const auditLogEntriesInAuth = auth.table("audit_log_entries", {
	instanceId: uuid("instance_id"),
	id: uuid().notNull(),
	payload: json(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	ipAddress: varchar("ip_address", { length: 64 }).default(sql`NULL`).notNull(),
}, (table) => [
	index("audit_logs_instance_id_idx").using("btree", table.instanceId.asc().nullsLast().op("uuid_ops")),
]);

export const samlRelayStatesInAuth = auth.table("saml_relay_states", {
	id: uuid().notNull(),
	ssoProviderId: uuid("sso_provider_id").notNull(),
	requestId: text("request_id").notNull(),
	forEmail: text("for_email"),
	redirectTo: text("redirect_to"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	flowStateId: uuid("flow_state_id"),
}, (table) => [
	index("saml_relay_states_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("saml_relay_states_for_email_idx").using("btree", table.forEmail.asc().nullsLast().op("text_ops")),
	index("saml_relay_states_sso_provider_id_idx").using("btree", table.ssoProviderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.flowStateId],
			foreignColumns: [flowStateInAuth.id],
			name: "saml_relay_states_flow_state_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ssoProviderId],
			foreignColumns: [ssoProvidersInAuth.id],
			name: "saml_relay_states_sso_provider_id_fkey"
		}).onDelete("cascade"),
	check("request_id not empty", sql`char_length(request_id) > 0`),
]);

export const mfaAmrClaimsInAuth = auth.table("mfa_amr_claims", {
	sessionId: uuid("session_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	authenticationMethod: text("authentication_method").notNull(),
	id: uuid().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessionsInAuth.id],
			name: "mfa_amr_claims_session_id_fkey"
		}).onDelete("cascade"),
]);

export const flowStateInAuth = auth.table("flow_state", {
	id: uuid().notNull(),
	userId: uuid("user_id"),
	authCode: text("auth_code").notNull(),
	codeChallengeMethod: codeChallengeMethodInAuth("code_challenge_method").notNull(),
	codeChallenge: text("code_challenge").notNull(),
	providerType: text("provider_type").notNull(),
	providerAccessToken: text("provider_access_token"),
	providerRefreshToken: text("provider_refresh_token"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	authenticationMethod: text("authentication_method").notNull(),
	authCodeIssuedAt: timestamp("auth_code_issued_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("flow_state_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_auth_code").using("btree", table.authCode.asc().nullsLast().op("text_ops")),
	index("idx_user_id_auth_method").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.authenticationMethod.asc().nullsLast().op("uuid_ops")),
]);

export const identitiesInAuth = auth.table("identities", {
	providerId: text("provider_id").notNull(),
	userId: uuid("user_id").notNull(),
	identityData: jsonb("identity_data").notNull(),
	provider: text().notNull(),
	lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	email: text().generatedAlwaysAs(sql`lower((identity_data ->> 'email'::text))`),
	id: uuid().defaultRandom().notNull(),
}, (table) => [
	index("identities_email_idx").using("btree", table.email.asc().nullsLast().op("text_pattern_ops")),
	index("identities_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "identities_user_id_fkey"
		}).onDelete("cascade"),
]);

export const oneTimeTokensInAuth = auth.table("one_time_tokens", {
	id: uuid().notNull(),
	userId: uuid("user_id").notNull(),
	tokenType: oneTimeTokenTypeInAuth("token_type").notNull(),
	tokenHash: text("token_hash").notNull(),
	relatesTo: text("relates_to").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("one_time_tokens_relates_to_hash_idx").using("hash", table.relatesTo.asc().nullsLast().op("text_ops")),
	index("one_time_tokens_token_hash_hash_idx").using("hash", table.tokenHash.asc().nullsLast().op("text_ops")),
	uniqueIndex("one_time_tokens_user_id_token_type_key").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.tokenType.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "one_time_tokens_user_id_fkey"
		}).onDelete("cascade"),
	check("one_time_tokens_token_hash_check", sql`char_length(token_hash) > 0`),
]);

export const mfaChallengesInAuth = auth.table("mfa_challenges", {
	id: uuid().notNull(),
	factorId: uuid("factor_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	ipAddress: inet("ip_address").notNull(),
	otpCode: text("otp_code"),
	webAuthnSessionData: jsonb("web_authn_session_data"),
}, (table) => [
	index("mfa_challenge_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.factorId],
			foreignColumns: [mfaFactorsInAuth.id],
			name: "mfa_challenges_auth_factor_id_fkey"
		}).onDelete("cascade"),
]);

export const oauthClientsInAuth = auth.table("oauth_clients", {
	id: uuid().notNull(),
	clientSecretHash: text("client_secret_hash"),
	registrationType: oauthRegistrationTypeInAuth("registration_type").notNull(),
	redirectUris: text("redirect_uris").notNull(),
	grantTypes: text("grant_types").notNull(),
	clientName: text("client_name"),
	clientUri: text("client_uri"),
	logoUri: text("logo_uri"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	clientType: oauthClientTypeInAuth("client_type").default('confidential').notNull(),
}, (table) => [
	index("oauth_clients_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	check("oauth_clients_client_name_length", sql`char_length(client_name) <= 1024`),
	check("oauth_clients_client_uri_length", sql`char_length(client_uri) <= 2048`),
	check("oauth_clients_logo_uri_length", sql`char_length(logo_uri) <= 2048`),
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
			foreignColumns: [usersInAuth.id],
			name: "user_profile_id_fkey"
		}).onDelete("cascade"),
]);

export const sessionsInAuth = auth.table("sessions", {
	id: uuid().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	factorId: uuid("factor_id"),
	aal: aalLevelInAuth(),
	notAfter: timestamp("not_after", { withTimezone: true, mode: 'string' }),
	refreshedAt: timestamp("refreshed_at", { mode: 'string' }),
	userAgent: text("user_agent"),
	ip: inet(),
	tag: text(),
	oauthClientId: uuid("oauth_client_id"),
	refreshTokenHmacKey: text("refresh_token_hmac_key"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	refreshTokenCounter: bigint("refresh_token_counter", { mode: "number" }),
	scopes: text(),
}, (table) => [
	index("sessions_not_after_idx").using("btree", table.notAfter.desc().nullsFirst().op("timestamptz_ops")),
	index("sessions_oauth_client_id_idx").using("btree", table.oauthClientId.asc().nullsLast().op("uuid_ops")),
	index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.oauthClientId],
			foreignColumns: [oauthClientsInAuth.id],
			name: "sessions_oauth_client_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "sessions_user_id_fkey"
		}).onDelete("cascade"),
	check("sessions_scopes_length", sql`char_length(scopes) <= 4096`),
]);

export const scopes = pgTable("scopes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
}, (table) => [
	unique("scopes_name_key").on(table.name),
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

export const slideViewingSessions = pgTable("slide_viewing_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	slideId: uuid("slide_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	courseId: uuid("course_id").notNull(),
	sessionStartedAt: timestamp("session_started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sessionEndedAt: timestamp("session_ended_at", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds"),
	isCompleted: boolean("is_completed").default(false).notNull(),
	interactionCount: integer("interaction_count").default(0).notNull(),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_slide_sessions_active").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.slideId.asc().nullsLast().op("uuid_ops")).where(sql`(session_ended_at IS NULL)`),
	index("idx_slide_sessions_started").using("btree", table.sessionStartedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_slide_sessions_user_slide").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.slideId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "slide_viewing_sessions_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.slideId],
			foreignColumns: [courseTopicSlides.id],
			name: "slide_viewing_sessions_slide_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "slide_viewing_sessions_topic_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "slide_viewing_sessions_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("slide_viewing_sessions_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("slide_viewing_sessions_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("slide_viewing_sessions_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("slide_viewing_sessions_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const quizAnswers = pgTable("quiz_answers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	questionId: uuid("question_id").notNull(),
	answerText: text("answer_text").notNull(),
	isCorrect: boolean("is_correct").default(false).notNull(),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_quiz_answers_correct").using("btree", table.questionId.asc().nullsLast().op("bool_ops"), table.isCorrect.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_answers_question_id").using("btree", table.questionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.questionId],
			foreignColumns: [quizQuestions.id],
			name: "quiz_answers_question_id_fkey"
		}).onDelete("cascade"),
	unique("quiz_answers_question_order_unique").on(table.questionId, table.orderIndex),
	pgPolicy("quiz_answers_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("quiz_answers_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("quiz_answers_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("quiz_answers_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const quizQuestions = pgTable("quiz_questions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quizId: uuid("quiz_id").notNull(),
	questionText: text("question_text").notNull(),
	questionType: text("question_type").default('multiple_choice').notNull(),
	allowMultipleSelections: boolean("allow_multiple_selections").default(false).notNull(),
	explanation: text(),
	points: integer().default(1).notNull(),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	questionUrls: jsonb("question_urls"),
}, (table) => [
	index("idx_quiz_questions_order").using("btree", table.quizId.asc().nullsLast().op("uuid_ops"), table.orderIndex.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_questions_quiz_id").using("btree", table.quizId.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_questions_text_search").using("gin", sql`to_tsvector('english'::regconfig, question_text)`),
	foreignKey({
			columns: [table.quizId],
			foreignColumns: [courseTopicQuizzes.id],
			name: "quiz_questions_quiz_id_fkey"
		}).onDelete("cascade"),
	unique("quiz_questions_quiz_order_unique").on(table.quizId, table.orderIndex),
	pgPolicy("quiz_questions_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("quiz_questions_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("quiz_questions_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("quiz_questions_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("quiz_questions_question_type_check", sql`question_type = ANY (ARRAY['multiple_choice'::text, 'single_choice'::text, 'true_false'::text])`),
]);

export const courseTopicQuizzes = pgTable("course_topic_quizzes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	topicId: uuid("topic_id").notNull(),
	title: text().notNull(),
	description: text(),
	passingScorePercentage: integer("passing_score_percentage").default(70).notNull(),
	timeLimitMinutes: integer("time_limit_minutes"),
	maxAttempts: integer("max_attempts"),
	isRequired: boolean("is_required").default(true).notNull(),
	sequenceType: text("sequence_type").default('sequential').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text().notNull(),
}, (table) => [
	uniqueIndex("course_topic_quizzes_topic_slug_unique").using("btree", table.topicId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topic_quizzes_sequence").using("btree", table.topicId.asc().nullsLast().op("text_ops"), table.sequenceType.asc().nullsLast().op("text_ops"), table.sortOrder.asc().nullsLast().op("text_ops")),
	index("idx_course_topic_quizzes_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_course_topic_quizzes_topic_id").using("btree", table.topicId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topic_quizzes_topic_slug").using("btree", table.topicId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "course_topic_quizzes_topic_id_fkey"
		}).onDelete("cascade"),
	unique("course_topic_quizzes_topic_sort_unique").on(table.topicId, table.sortOrder),
	pgPolicy("course_topic_quizzes_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("course_topic_quizzes_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("course_topic_quizzes_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_topic_quizzes_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("course_topic_quizzes_passing_score_percentage_check", sql`(passing_score_percentage >= 0) AND (passing_score_percentage <= 100)`),
	check("course_topic_quizzes_sequence_type_check", sql`sequence_type = ANY (ARRAY['sequential'::text, 'user_choice'::text])`),
	check("course_topic_quizzes_status_check", sql`status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])`),
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

export const schoolLicences = pgTable("school_licences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	schoolId: uuid("school_id").notNull(),
	startsAt: date("starts_at").default(sql`CURRENT_DATE`).notNull(),
	endsAt: date("ends_at").default(sql`(CURRENT_DATE + '3 years'::interval)`).notNull(),
	autoRenew: boolean("auto_renew").default(false).notNull(),
	status: licenceStatus().default('PENDING').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	planLength: integer("plan_length").default(3).notNull(),
}, (table) => [
	index("ix_licences_school").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("ix_licences_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("uq_school_active_or_pending_licence").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")).where(sql`(status = ANY (ARRAY['PENDING'::licence_status, 'ACTIVE'::licence_status]))`),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "school_licences_school_id_fkey"
		}).onDelete("cascade"),
	check("school_licences_plan_length_check", sql`(plan_length >= 1) AND (plan_length <= 5)`),
]);

export const features = pgTable("features", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("features_key_key").on(table.key),
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

export const featurePermissions = pgTable("feature_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	featureId: uuid("feature_id").notNull(),
	level: featurePermissionLevel().notNull(),
	targetId: uuid("target_id"),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	visible: boolean(),
}, (table) => [
	index("idx_feature_permissions_feature_id").using("btree", table.featureId.asc().nullsLast().op("uuid_ops")),
	index("idx_feature_permissions_level_target").using("btree", table.level.asc().nullsLast().op("uuid_ops"), table.targetId.asc().nullsLast().op("uuid_ops")),
	index("idx_feature_permissions_target_id").using("btree", table.targetId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [userProfile.id],
			name: "feature_permissions_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.featureId],
			foreignColumns: [features.id],
			name: "feature_permissions_feature_id_fkey"
		}).onDelete("cascade"),
	unique("feature_permissions_unique").on(table.featureId, table.level, table.targetId),
]);

export const oauthAuthorizationsInAuth = auth.table("oauth_authorizations", {
	id: uuid().notNull(),
	authorizationId: text("authorization_id").notNull(),
	clientId: uuid("client_id").notNull(),
	userId: uuid("user_id"),
	redirectUri: text("redirect_uri").notNull(),
	scope: text().notNull(),
	state: text(),
	resource: text(),
	codeChallenge: text("code_challenge"),
	codeChallengeMethod: codeChallengeMethodInAuth("code_challenge_method"),
	responseType: oauthResponseTypeInAuth("response_type").default('code').notNull(),
	status: oauthAuthorizationStatusInAuth().default('pending').notNull(),
	authorizationCode: text("authorization_code"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).default(sql`(now() + '00:03:00'::interval)`).notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	nonce: text(),
}, (table) => [
	index("oauth_auth_pending_exp_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(status = 'pending'::auth.oauth_authorization_status)`),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [oauthClientsInAuth.id],
			name: "oauth_authorizations_client_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "oauth_authorizations_user_id_fkey"
		}).onDelete("cascade"),
	check("oauth_authorizations_authorization_code_length", sql`char_length(authorization_code) <= 255`),
	check("oauth_authorizations_code_challenge_length", sql`char_length(code_challenge) <= 128`),
	check("oauth_authorizations_expires_at_future", sql`expires_at > created_at`),
	check("oauth_authorizations_nonce_length", sql`char_length(nonce) <= 255`),
	check("oauth_authorizations_redirect_uri_length", sql`char_length(redirect_uri) <= 2048`),
	check("oauth_authorizations_resource_length", sql`char_length(resource) <= 2048`),
	check("oauth_authorizations_scope_length", sql`char_length(scope) <= 4096`),
	check("oauth_authorizations_state_length", sql`char_length(state) <= 4096`),
]);

export const courseTopicProgress = pgTable("course_topic_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	courseId: uuid("course_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	currentSlideId: uuid("current_slide_id"),
	currentSlideIndex: integer("current_slide_index"),
	status: text().default('not_started').notNull(),
	slidesCompletedAt: timestamp("slides_completed_at", { withTimezone: true, mode: 'string' }),
	quizUnlockedAt: timestamp("quiz_unlocked_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slideProgress: jsonb("slide_progress").default({}).notNull(),
}, (table) => [
	index("idx_course_topic_progress_current_slide").using("btree", table.currentSlideId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topic_progress_slide_progress").using("gin", table.slideProgress.asc().nullsLast().op("jsonb_ops")),
	index("idx_course_topic_progress_status").using("btree", table.status.asc().nullsLast().op("text_ops")).where(sql`(status = ANY (ARRAY['not_started'::text, 'viewing_slides'::text, 'quiz_unlocked'::text]))`),
	index("idx_course_topic_progress_user_course").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.courseId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topic_progress_user_topic").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.topicId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "course_topic_progress_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.currentSlideId],
			foreignColumns: [courseTopicSlides.id],
			name: "course_topic_progress_current_slide_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "course_topic_progress_topic_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "course_topic_progress_user_id_fkey"
		}).onDelete("cascade"),
	unique("course_topic_progress_user_course_topic_unique").on(table.userId, table.courseId, table.topicId),
	pgPolicy("course_topic_progress_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(auth.uid() = user_id)`  }),
	pgPolicy("course_topic_progress_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_topic_progress_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("course_topic_progress_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("course_topic_progress_status_check", sql`status = ANY (ARRAY['not_started'::text, 'viewing_slides'::text, 'quiz_unlocked'::text, 'completed'::text])`),
]);

export const oauthConsentsInAuth = auth.table("oauth_consents", {
	id: uuid().notNull(),
	userId: uuid("user_id").notNull(),
	clientId: uuid("client_id").notNull(),
	scopes: text().notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("oauth_consents_active_client_idx").using("btree", table.clientId.asc().nullsLast().op("uuid_ops")).where(sql`(revoked_at IS NULL)`),
	index("oauth_consents_active_user_client_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.clientId.asc().nullsLast().op("uuid_ops")).where(sql`(revoked_at IS NULL)`),
	index("oauth_consents_user_order_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.grantedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [oauthClientsInAuth.id],
			name: "oauth_consents_client_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "oauth_consents_user_id_fkey"
		}).onDelete("cascade"),
	check("oauth_consents_revoked_after_granted", sql`(revoked_at IS NULL) OR (revoked_at >= granted_at)`),
	check("oauth_consents_scopes_length", sql`char_length(scopes) <= 2048`),
	check("oauth_consents_scopes_not_empty", sql`char_length(TRIM(BOTH FROM scopes)) > 0`),
]);

export const lessonFeedback = pgTable("lesson_feedback", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	lessonId: uuid("lesson_id").notNull(),
	teacherUserId: uuid("teacher_user_id").notNull(),
	rating: integer().notNull(),
	comments: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_lesson_feedback_lesson_id").using("btree", table.lessonId.asc().nullsLast().op("uuid_ops")),
	index("idx_lesson_feedback_teacher_user_id").using("btree", table.teacherUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_feedback_lesson_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teacherUserId],
			foreignColumns: [userProfile.id],
			name: "lesson_feedback_teacher_user_id_fkey"
		}),
	unique("lesson_feedback_lesson_id_unique").on(table.lessonId),
	check("lesson_feedback_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const courseTopicSlides = pgTable("course_topic_slides", {
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
	index("idx_course_topic_slides_topic_id").using("btree", table.topicId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topic_slides_topic_order").using("btree", table.topicId.asc().nullsLast().op("uuid_ops"), table.orderIndex.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "course_topic_slides_topic_id_fkey"
		}).onDelete("cascade"),
	unique("course_topic_slides_topic_order_unique").on(table.topicId, table.orderIndex),
	pgPolicy("course_topic_slides_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("course_topic_slides_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("course_topic_slides_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_topic_slides_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("course_topic_slides_kind_check", sql`kind = ANY (ARRAY['image'::text, 'video'::text, 'text'::text])`),
]);

export const oauthClientStatesInAuth = auth.table("oauth_client_states", {
	id: uuid().notNull(),
	providerType: text("provider_type").notNull(),
	codeVerifier: text("code_verifier"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_oauth_client_states_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const userSlideViews = pgTable("user_slide_views", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	slideId: uuid("slide_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	courseId: uuid("course_id").notNull(),
	firstViewedAt: timestamp("first_viewed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastViewedAt: timestamp("last_viewed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	totalTimeSeconds: integer("total_time_seconds").default(0).notNull(),
	viewCount: integer("view_count").default(1).notNull(),
}, (table) => [
	index("idx_user_slide_views_slide").using("btree", table.slideId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_slide_views_user_topic").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.topicId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_slide_views_viewed_at").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.topicId.asc().nullsLast().op("timestamptz_ops"), table.lastViewedAt.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "user_slide_views_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.slideId],
			foreignColumns: [courseTopicSlides.id],
			name: "user_slide_views_slide_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "user_slide_views_topic_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "user_slide_views_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_slide_views_user_slide_unique").on(table.userId, table.slideId),
	pgPolicy("user_slide_views_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(auth.uid() = user_id)`  }),
	pgPolicy("user_slide_views_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("user_slide_views_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("user_slide_views_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const quizAttempts = pgTable("quiz_attempts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	quizId: uuid("quiz_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	courseId: uuid("course_id").notNull(),
	topicProgressId: uuid("topic_progress_id"),
	attemptNumber: integer("attempt_number").default(1).notNull(),
	totalQuestions: integer("total_questions").notNull(),
	correctAnswers: integer("correct_answers").default(0).notNull(),
	scorePercentage: integer("score_percentage"),
	isPassed: boolean("is_passed"),
	timeLimitStartedAt: timestamp("time_limit_started_at", { withTimezone: true, mode: 'string' }),
	timeTakenSeconds: integer("time_taken_seconds"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_quiz_attempts_completed").using("btree", table.completedAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(completed_at IS NOT NULL)`),
	index("idx_quiz_attempts_course_topic_progress").using("btree", table.topicProgressId.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_attempts_in_progress").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.quizId.asc().nullsLast().op("uuid_ops")).where(sql`(completed_at IS NULL)`),
	index("idx_quiz_attempts_quiz").using("btree", table.quizId.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_attempts_topic_passed").using("btree", table.topicId.asc().nullsLast().op("uuid_ops"), table.isPassed.asc().nullsLast().op("uuid_ops")).where(sql`(is_passed = true)`),
	index("idx_quiz_attempts_user_quiz").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.quizId.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_attempts_user_topic").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.topicId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "quiz_attempts_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.quizId],
			foreignColumns: [courseTopicQuizzes.id],
			name: "quiz_attempts_quiz_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "quiz_attempts_topic_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicProgressId],
			foreignColumns: [courseTopicProgress.id],
			name: "quiz_attempts_topic_progress_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "quiz_attempts_user_id_fkey"
		}).onDelete("cascade"),
	unique("quiz_attempts_user_quiz_attempt_unique").on(table.userId, table.quizId, table.attemptNumber),
	pgPolicy("quiz_attempts_admin_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)` }),
	pgPolicy("quiz_attempts_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("quiz_attempts_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("quiz_attempts_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const certificationCourses = pgTable("certification_courses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	sortIndex: smallint("sort_index").notNull(),
	certificateType: text("certificate_type"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ratingQuestions: jsonb("rating_questions"),
}, (table) => [
	index("idx_certification_courses_rating_questions").using("gin", table.ratingQuestions.asc().nullsLast().op("jsonb_ops")),
	index("idx_certification_courses_sort_index").using("btree", table.sortIndex.asc().nullsLast().op("int2_ops")),
	unique("certification_courses_code_key").on(table.code),
	unique("certification_courses_name_key").on(table.name),
	unique("certification_courses_sort_index_key").on(table.sortIndex),
	pgPolicy("certification_courses_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("certification_courses_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("certification_courses_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("certification_courses_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("certification_courses_certificate_type_check", sql`certificate_type = ANY (ARRAY['none'::text, 'completion'::text, 'achievement'::text, 'custom'::text])`),
]);

export const quizAttemptAnswers = pgTable("quiz_attempt_answers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	attemptId: uuid("attempt_id").notNull(),
	questionId: uuid("question_id").notNull(),
	answerId: uuid("answer_id").notNull(),
	isCorrect: boolean("is_correct"),
	timeTakenSeconds: integer("time_taken_seconds"),
	answeredAt: timestamp("answered_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	answerIds: jsonb("answer_ids").notNull(),
	metadata: jsonb(),
}, (table) => [
	index("idx_quiz_attempt_answers_answer_ids").using("gin", table.answerIds.asc().nullsLast().op("jsonb_ops")),
	index("idx_quiz_attempt_answers_attempt").using("btree", table.attemptId.asc().nullsLast().op("uuid_ops")),
	index("idx_quiz_attempt_answers_correct").using("btree", table.isCorrect.asc().nullsLast().op("bool_ops")),
	index("idx_quiz_attempt_answers_metadata").using("gin", table.metadata.asc().nullsLast().op("jsonb_ops")),
	index("idx_quiz_attempt_answers_pending").using("btree", table.attemptId.asc().nullsLast().op("uuid_ops"), table.questionId.asc().nullsLast().op("uuid_ops")).where(sql`(is_correct IS NULL)`),
	index("idx_quiz_attempt_answers_question").using("btree", table.questionId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("quiz_attempt_answers_attempt_question_unique").using("btree", table.attemptId.asc().nullsLast().op("uuid_ops"), table.questionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.answerId],
			foreignColumns: [quizAnswers.id],
			name: "quiz_attempt_answers_answer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.attemptId],
			foreignColumns: [quizAttempts.id],
			name: "quiz_attempt_answers_attempt_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.questionId],
			foreignColumns: [quizQuestions.id],
			name: "quiz_attempt_answers_question_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("quiz_attempt_answers_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(auth.uid() = ( SELECT quiz_attempts.user_id
   FROM quiz_attempts
  WHERE (quiz_attempts.id = quiz_attempt_answers.attempt_id)))` }),
	pgPolicy("quiz_attempt_answers_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("quiz_attempt_answers_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("quiz_attempt_answers_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
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
	startYear: timestamp("start_year", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_classes_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
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
	status: text().default('preparing').notNull(),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_lessons_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("idx_lessons_topic_id").using("btree", table.topicId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [userProfile.id],
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
	pgPolicy("lessons_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text], school_id) OR has_any_role(ARRAY['TEACHER'::text], school_id))` }),
	pgPolicy("lessons_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("lessons_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("lessons_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("lessons_status_check", sql`status = ANY (ARRAY['preparing'::text, 'ready'::text, 'in_progress'::text, 'feedback'::text, 'completed'::text, 'cancelled'::text])`),
]);

export const topics = pgTable("topics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stageId: uuid("stage_id").notNull(),
	title: text().notNull(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	officialNotes: text("official_notes"),
	stageOrder: smallint("stage_order"),
}, (table) => [
	uniqueIndex("ux_topics_stage_title").using("btree", sql`stage_id`, sql`lower(title)`),
	foreignKey({
			columns: [table.stageId],
			foreignColumns: [curriculumStages.id],
			name: "topics_stage_id_fkey"
		}).onDelete("restrict"),
	check("topics_status_check", sql`status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])`),
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
			foreignColumns: [userProfile.id],
			name: "lesson_live_state_updated_by_fkey"
		}),
	pgPolicy("livestate_select", { as: "permissive", for: "select", to: ["public"], using: sql`(has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text, 'TEACHER'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_live_state.lesson_id))) OR has_any_role(ARRAY['GOVERNMENT_VIEWER'::text], NULL::uuid))` }),
	pgPolicy("livestate_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("livestate_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("livestate_delete", { as: "permissive", for: "delete", to: ["public"] }),
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

export const userRoles = pgTable("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	schoolId: uuid("school_id"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	roleScope: text("role_scope"),
}, (table) => [
	index("idx_user_roles_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_roles_school_role").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops"), table.roleId.asc().nullsLast().op("uuid_ops")).where(sql`(school_id IS NOT NULL)`),
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
			foreignColumns: [userProfile.id],
			name: "user_roles_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("user_roles_unique").on(table.userId, table.roleId, table.schoolId),
	check("user_roles_scope_coherence_chk", sql`((role_scope = 'platform'::text) AND (school_id IS NULL)) OR ((role_scope = 'school'::text) AND (school_id IS NOT NULL))`),
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
			foreignColumns: [userProfile.id],
			name: "lesson_sessions_started_by_fkey"
		}),
	pgPolicy("sessions_select", { as: "permissive", for: "select", to: ["public"], using: sql`(has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text, 'TEACHER'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_sessions.lesson_id))))` }),
	pgPolicy("sessions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("sessions_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("sessions_delete", { as: "permissive", for: "delete", to: ["public"] }),
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
			foreignColumns: [userProfile.id],
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
	pgPolicy("events_select", { as: "permissive", for: "select", to: ["public"], using: sql`(has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text, 'TEACHER'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_events.lesson_id))) OR has_any_role(ARRAY['GOVERNMENT_VIEWER'::text], NULL::uuid))` }),
	pgPolicy("events_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("events_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("events_delete", { as: "permissive", for: "delete", to: ["public"] }),
	check("lesson_events_kind_check", sql`kind = ANY (ARRAY['SLIDE_CHANGED'::text, 'PAUSED'::text, 'RESUMED'::text, 'JUMPED'::text, 'ENDED'::text])`),
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
	check("topic_slides_payload_chk", sql`((kind = 'text'::text) AND (text_html IS NOT NULL) AND (image_url IS NULL) AND (video_url IS NULL)) OR ((kind = 'image'::text) AND (text_html IS NULL) AND (video_url IS NULL)) OR ((kind = 'video'::text) AND (text_html IS NULL))`),
]);

export const userSessions = pgTable("user_sessions", {
	id: uuid().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	refreshedAt: timestamp("refreshed_at", { mode: 'string' }),
	userAgent: text("user_agent"),
	oauthClientId: uuid("oauth_client_id"),
}, (table) => [
	index("user_sessions_refreshed_at_idx").using("btree", table.refreshedAt.desc().nullsLast().op("timestamp_ops")),
	index("user_sessions_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("user_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.oauthClientId],
			foreignColumns: [oauthClientsInAuth.id],
			name: "user_sessions_oauth_client_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "user_sessions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "user_sessions_user_id_fkey1"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const userSchoolPositions = pgTable("user_school_positions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	schoolId: uuid("school_id").notNull(),
	position: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_school_positions_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_school_positions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_school_positions_user_school").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.schoolId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "user_school_positions_school_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "user_school_positions_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const courseProgress = pgTable("course_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	courseId: uuid("course_id").notNull(),
	currentTopicId: uuid("current_topic_id"),
	currentTopicOrder: integer("current_topic_order"),
	lastCompletedTopicOrder: integer("last_completed_topic_order").default(0).notNull(),
	totalTopics: integer("total_topics").notNull(),
	completedTopics: integer("completed_topics").default(0).notNull(),
	progressPercentage: integer("progress_percentage").default(0).notNull(),
	status: text().default('not_started').notNull(),
	certificateIssuedAt: timestamp("certificate_issued_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_course_progress_status").using("btree", table.status.asc().nullsLast().op("text_ops")).where(sql`(status = ANY (ARRAY['not_started'::text, 'in_progress'::text]))`),
	index("idx_course_progress_user_course").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.courseId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "course_progress_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.currentTopicId],
			foreignColumns: [courseTopics.id],
			name: "course_progress_current_topic_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "course_progress_user_id_fkey"
		}).onDelete("cascade"),
	unique("course_progress_user_course_unique").on(table.userId, table.courseId),
	pgPolicy("course_progress_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("course_progress_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("course_progress_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_progress_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("course_progress_status_check", sql`status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])`),
]);

export const courseTopicQuizCompletions = pgTable("course_topic_quiz_completions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	quizId: uuid("quiz_id").notNull(),
	passedAttemptId: uuid("passed_attempt_id"),
	firstPassedAt: timestamp("first_passed_at", { withTimezone: true, mode: 'string' }).notNull(),
	lastPassedAt: timestamp("last_passed_at", { withTimezone: true, mode: 'string' }).notNull(),
	totalAttempts: integer("total_attempts").default(1).notNull(),
}, (table) => [
	index("idx_course_topic_quiz_completions_quiz").using("btree", table.quizId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_topic_quiz_completions_user_topic").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.topicId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.passedAttemptId],
			foreignColumns: [quizAttempts.id],
			name: "course_topic_quiz_completions_passed_attempt_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.quizId],
			foreignColumns: [courseTopicQuizzes.id],
			name: "course_topic_quiz_completions_quiz_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [courseTopics.id],
			name: "course_topic_quiz_completions_topic_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "course_topic_quiz_completions_user_id_fkey"
		}).onDelete("cascade"),
	unique("course_topic_quiz_completions_user_quiz_unique").on(table.userId, table.quizId),
	pgPolicy("course_topic_quiz_completions_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(auth.uid() = user_id)`  }),
	pgPolicy("course_topic_quiz_completions_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_topic_quiz_completions_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("course_topic_quiz_completions_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const courseRatings = pgTable("course_ratings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	courseId: uuid("course_id").notNull(),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	questionMetadata: jsonb("question_metadata"),
}, (table) => [
	index("idx_course_ratings_course_id").using("btree", table.courseId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_ratings_question_metadata").using("gin", table.questionMetadata.asc().nullsLast().op("jsonb_ops")),
	index("idx_course_ratings_user_course").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.courseId.asc().nullsLast().op("uuid_ops")),
	index("idx_course_ratings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [certificationCourses.id],
			name: "course_ratings_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "course_ratings_user_id_fkey"
		}).onDelete("cascade"),
	unique("course_ratings_user_course_unique").on(table.userId, table.courseId),
	pgPolicy("course_ratings_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(auth.uid() = user_id)`  }),
	pgPolicy("course_ratings_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("course_ratings_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("course_ratings_delete", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("course_ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
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

export const schoolYearAssignments = pgTable("school_year_assignments", {
	schoolId: uuid("school_id").notNull(),
	schoolYearId: uuid("school_year_id").notNull(),
}, (table) => [
	index("idx_school_year_assignments_school_id").using("btree", table.schoolId.asc().nullsLast().op("uuid_ops")),
	index("idx_school_year_assignments_school_year_id").using("btree", table.schoolYearId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.schoolYearId],
			foreignColumns: [schoolYears.id],
			name: "school_year_assignments_school_year_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.schoolId],
			foreignColumns: [schools.id],
			name: "school_year_assignments_school_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.schoolId, table.schoolYearId], name: "school_year_assignments_pkey"}),
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

export const lessonClasses = pgTable("lesson_classes", {
	lessonId: uuid("lesson_id").notNull(),
	classId: uuid("class_id").notNull(),
}, (table) => [
	index("idx_lesson_classes_class_id").using("btree", table.classId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "lesson_classes_class_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.lessonId],
			foreignColumns: [lessons.id],
			name: "lesson_classes_lesson_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	primaryKey({ columns: [table.lessonId, table.classId], name: "lesson_classes_pkey"}),
]);

export const teacherClasses = pgTable("teacher_classes", {
	userId: uuid("user_id").notNull(),
	classId: uuid("class_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_teacher_classes_class_id").using("btree", table.classId.asc().nullsLast().op("uuid_ops")),
	index("idx_teacher_classes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "teacher_classes_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfile.id],
			name: "teacher_classes_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.classId], name: "teacher_classes_pkey"}),
]);

export const teacherSlideNotes = pgTable("teacher_slide_notes", {
	teacherUserId: uuid("teacher_user_id").notNull(),
	topicSlideId: uuid("topic_slide_id").notNull(),
	notesRichtext: text("notes_richtext"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teacherUserId],
			foreignColumns: [userProfile.id],
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
export const vQuizEnriched = pgView("v_quiz_enriched", {	id: uuid(),
	topicId: uuid("topic_id"),
	title: text(),
	description: text(),
	passingScorePercentage: integer("passing_score_percentage"),
	timeLimitMinutes: integer("time_limit_minutes"),
	maxAttempts: integer("max_attempts"),
	isRequired: boolean("is_required"),
	sequenceType: text("sequence_type"),
	sortOrder: integer("sort_order"),
	status: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	questions: jsonb(),
}).with({ securityInvoker: true }).as(sql`SELECT id, topic_id, title, description, passing_score_percentage, time_limit_minutes, max_attempts, is_required, sequence_type, sort_order, status, created_at, updated_at, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', qq.id, 'quiz_id', qq.quiz_id, 'question_text', qq.question_text, 'question_type', qq.question_type, 'allow_multiple_selections', qq.allow_multiple_selections, 'explanation', qq.explanation, 'points', qq.points, 'order_index', qq.order_index, 'question_urls', qq.question_urls, 'created_at', qq.created_at, 'updated_at', qq.updated_at, 'answers', COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', qa.id, 'question_id', qa.question_id, 'answer_text', qa.answer_text, 'is_correct', qa.is_correct, 'order_index', qa.order_index, 'created_at', qa.created_at, 'updated_at', qa.updated_at) ORDER BY qa.order_index) AS jsonb_agg FROM quiz_answers qa WHERE qa.question_id = qq.id), '[]'::jsonb)) ORDER BY qq.order_index) AS jsonb_agg FROM quiz_questions qq WHERE qq.quiz_id = ctq.id), '[]'::jsonb) AS questions FROM course_topic_quizzes ctq`);

export const vSchoolsStatistics = pgView("v_schools_statistics", {	id: uuid(),
	name: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teacherCount: bigint("teacher_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	classCount: bigint("class_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolAdminCount: bigint("school_admin_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolLicenceCount: bigint("school_licence_count", { mode: "number" }),
	activeLicence: boolean("active_licence"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	staffCount: bigint("staff_count", { mode: "number" }),
}).with({ securityInvoker: true }).as(sql`SELECT id, name, COALESCE(( SELECT count(*) AS count FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.school_id = s.id AND r.key = 'TEACHER'::text), 0::bigint) AS teacher_count, COALESCE(( SELECT count(*) AS count FROM classes c WHERE c.school_id = s.id), 0::bigint) AS class_count, COALESCE(( SELECT count(*) AS count FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.school_id = s.id AND r.key = 'SCHOOL_ADMIN'::text), 0::bigint) AS school_admin_count, COALESCE(( SELECT count(*) AS count FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.school_id = s.id AND r.key = 'SCHOOL_LICENCE'::text), 0::bigint) AS school_licence_count, (EXISTS ( SELECT 1 FROM school_licences sl WHERE sl.school_id = s.id AND sl.status = 'ACTIVE'::licence_status)) AS active_licence, COALESCE(( SELECT count(*) AS count FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.school_id = s.id AND r.key = 'SCHOOL_STAFF'::text), 0::bigint) AS staff_count FROM schools s`);

export const vStageThresholds = pgView("v_stage_thresholds", {	stageId: uuid("stage_id"),
	minSortIndex: smallint("min_sort_index"),
	maxSortIndex: smallint("max_sort_index"),
}).with({ securityInvoker: true }).as(sql`SELECT s.id AS stage_id, min(y.sort_index) AS min_sort_index, max(y.sort_index) AS max_sort_index FROM curriculum_stages s JOIN stage_year_links l ON l.stage_id = s.id JOIN school_years y ON y.id = l.school_year_id GROUP BY s.id`);

export const vSchoolLevelBadge = pgView("v_school_level_badge", {	schoolId: uuid("school_id"),
	levelBadge: text("level_badge"),
}).with({ securityInvoker: true }).as(sql`SELECT s.id AS school_id, COALESCE((SELECT CASE WHEN min(y.sort_index) = 0 AND max(y.sort_index) = 12 THEN 'P–12'::text WHEN min(y.sort_index) = 0 AND max(y.sort_index) = 10 THEN 'P–10'::text WHEN min(y.sort_index) = 0 AND max(y.sort_index) = 6 THEN 'Primary'::text WHEN min(y.sort_index) >= 7 AND max(y.sort_index) = 12 THEN 'Secondary'::text WHEN count(*) > 0 THEN 'Custom'::text ELSE 'Unknown'::text END FROM school_year_assignments sya JOIN school_years y ON y.id = sya.school_year_id WHERE sya.school_id = s.id), 'Unknown'::text) AS level_badge FROM schools s`);

export const vSchoolYears = pgView("v_school_years", {	id: uuid(),
	code: text(),
	displayName: text("display_name"),
	levelId: uuid("level_id"),
	sortIndex: smallint("sort_index"),
	levelKey: text("level_key"),
	levelName: text("level_name"),
}).with({ securityInvoker: true }).as(sql`SELECT y.id, y.code, y.display_name, y.level_id, y.sort_index, sl.key AS level_key, sl.name AS level_name FROM school_years y JOIN school_levels sl ON sl.id = y.level_id`);

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
}).with({ securityInvoker: true }).as(sql`SELECT l.id AS lesson_id, l.topic_id, ts.id AS topic_slide_id, ts.order_index, ts.kind, ts.text_html, ts.image_url, ts.video_url, ts.video_start_s, ts.video_end_s, COALESCE(lsn.notes_richtext, tsn.notes_richtext, ts.official_notes, t.official_notes) AS effective_notes, l.created_by_user_id AS teacher_user_id FROM lessons l JOIN topics t ON t.id = l.topic_id JOIN topic_slides ts ON ts.topic_id = t.id LEFT JOIN lesson_slide_notes lsn ON lsn.lesson_id = l.id AND lsn.topic_slide_id = ts.id LEFT JOIN teacher_slide_notes tsn ON tsn.teacher_user_id = l.created_by_user_id AND tsn.topic_slide_id = ts.id ORDER BY l.id, ts.order_index`);

export const vClassesYears = pgView("v_classes_years", {	id: uuid(),
	schoolId: uuid("school_id"),
	name: text(),
	yearCodes: text("year_codes"),
	yearNames: text("year_names"),
	yearCodeRange: text("year_code_range"),
	yearNameRange: text("year_name_range"),
	levelKey: text("level_key"),
	levelName: text("level_name"),
}).with({ securityInvoker: true }).as(sql`WITH yrs AS ( SELECT c.id, c.school_id, c.name, array_agg(y.code ORDER BY y.sort_index) AS year_codes, array_agg(y.display_name ORDER BY y.sort_index) AS year_names, min(y.sort_index) AS min_sort, max(y.sort_index) AS max_sort, min(sl.key) AS level_key, min(sl.name) AS level_name FROM classes c LEFT JOIN class_years cy ON cy.class_id = c.id LEFT JOIN school_years y ON y.id = cy.school_year_id LEFT JOIN school_levels sl ON sl.id = y.level_id GROUP BY c.id, c.school_id, c.name ) SELECT id, school_id, name, year_codes, year_names, CASE WHEN array_length(year_codes, 1) IS NULL THEN NULL::text WHEN array_length(year_codes, 1) = 1 THEN year_codes[1] ELSE (year_codes[1] || '–'::text) || year_codes[array_length(year_codes, 1)] END AS year_code_range, CASE WHEN array_length(year_names, 1) IS NULL THEN NULL::text WHEN array_length(year_names, 1) = 1 THEN year_names[1] ELSE (year_names[1] || ' – '::text) || year_names[array_length(year_names, 1)] END AS year_name_range, level_key, level_name FROM yrs ORDER BY name`);

export const vCurriculumStagesYears = pgView("v_curriculum_stages_years", {	stageId: uuid("stage_id"),
	stageCode: text("stage_code"),
	stageName: text("stage_name"),
	yearCodes: text("year_codes"),
	yearNames: text("year_names"),
	yearCodeRange: text("year_code_range"),
	yearNameRange: text("year_name_range"),
	minSortIndex: smallint("min_sort_index"),
	maxSortIndex: smallint("max_sort_index"),
}).with({ securityInvoker: true }).as(sql`WITH yrs AS ( SELECT s.id AS stage_id, s.code AS stage_code, s.name AS stage_name, array_agg(y.code ORDER BY y.sort_index) AS year_codes, array_agg(y.display_name ORDER BY y.sort_index) AS year_names, min(y.sort_index) AS min_sort_index, max(y.sort_index) AS max_sort_index FROM curriculum_stages s LEFT JOIN stage_year_links l ON l.stage_id = s.id LEFT JOIN school_years y ON y.id = l.school_year_id GROUP BY s.id, s.code, s.name ) SELECT stage_id, stage_code, stage_name, year_codes, year_names, CASE WHEN array_length(year_codes, 1) IS NULL THEN NULL::text WHEN array_length(year_codes, 1) = 1 THEN year_codes[1] ELSE (year_codes[1] || '–'::text) || year_codes[array_length(year_codes, 1)] END AS year_code_range, CASE WHEN array_length(year_names, 1) IS NULL THEN NULL::text WHEN array_length(year_names, 1) = 1 THEN year_names[1] ELSE (year_names[1] || ' – '::text) || year_names[array_length(year_names, 1)] END AS year_name_range, min_sort_index, max_sort_index FROM yrs ORDER BY min_sort_index, stage_code`);

export const vLessonAllowedSlides = pgView("v_lesson_allowed_slides", {	lessonId: uuid("lesson_id"),
	topicSlideId: uuid("topic_slide_id"),
	orderIndex: integer("order_index"),
}).with({ securityInvoker: true }).as(sql`SELECT l.id AS lesson_id, ts.id AS topic_slide_id, ts.order_index FROM lessons l JOIN topics t ON t.id = l.topic_id JOIN topic_slides ts ON ts.topic_id = t.id`);

export const vTopicsWithCompletion = pgView("v_topics_with_completion", {	topicId: uuid("topic_id"),
	topicTitle: text("topic_title"),
	topicDescription: text("topic_description"),
	stageOrder: smallint("stage_order"),
	topicStatus: text("topic_status"),
	topicCreatedAt: timestamp("topic_created_at", { withTimezone: true, mode: 'string' }),
	stageId: uuid("stage_id"),
	stageCode: text("stage_code"),
	stageName: text("stage_name"),
	stageSortIndex: smallint("stage_sort_index"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	slideCount: bigint("slide_count", { mode: "number" }),
	completedClassIds: uuid("completed_class_ids"),
	completedClassNames: text("completed_class_names"),
}).with({ securityInvoker: true }).as(sql`SELECT t.id AS topic_id, t.title AS topic_title, t.official_notes AS topic_description, t.stage_order, t.status AS topic_status, t.created_at AS topic_created_at, cs.id AS stage_id, cs.code AS stage_code, cs.name AS stage_name, cs.sort_index AS stage_sort_index, COALESCE(slide_counts.slide_count, 0::bigint) AS slide_count, COALESCE(completed_classes.completed_class_ids, ARRAY[]::uuid[]) AS completed_class_ids, COALESCE(completed_classes.completed_class_names, ARRAY[]::text[]) AS completed_class_names FROM topics t JOIN curriculum_stages cs ON t.stage_id = cs.id LEFT JOIN ( SELECT topic_slides.topic_id, count(*) AS slide_count FROM topic_slides GROUP BY topic_slides.topic_id) slide_counts ON slide_counts.topic_id = t.id LEFT JOIN ( SELECT l.topic_id, array_agg(DISTINCT c.id ORDER BY c.id) AS completed_class_ids, array_agg(DISTINCT c.name ORDER BY c.name) AS completed_class_names FROM lessons l JOIN lesson_classes lc ON l.id = lc.lesson_id JOIN classes c ON lc.class_id = c.id WHERE l.status = 'completed'::text GROUP BY l.topic_id) completed_classes ON completed_classes.topic_id = t.id ORDER BY cs.sort_index, t.stage_order, t.title`);

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
	levelBadge: text("level_badge"),
}).with({ securityInvoker: true }).as(sql`SELECT sch.id, sch.name, sch.code, sch.slug, sch.email_domain, sch.address, sch.joined_at, sch.created_at, CASE WHEN st.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', st.id, 'code', st.code, 'name', st.name) END AS state, CASE WHEN sec.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', sec.id, 'key', sec.key, 'name', sec.name) END AS sector, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', lvl.id, 'key', lvl.key, 'name', lvl.name) ORDER BY lvl.key) AS jsonb_agg FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id), '[]'::jsonb) AS levels, b.level_badge FROM schools sch LEFT JOIN states st ON st.id = sch.state_id LEFT JOIN school_sectors sec ON sec.id = sch.sector_id LEFT JOIN school_level_badge b ON b.school_id = sch.id`);

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
	levelBadge: text("level_badge"),
}).with({ securityInvoker: true }).as(sql`SELECT sch.id, sch.name, sch.code, sch.state_id, sch.sector_id, sch.email_domain, sch.address, sch.joined_at, sch.created_at, sch.slug, sch.banner_url, sch.avatar_url, lower(st.code) AS state, sec.key AS sector, ARRAY( SELECT lvl.name FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id ORDER BY ( CASE lvl.key WHEN 'primary'::text THEN 1 WHEN 'secondary'::text THEN 2 ELSE 99 END)) AS levels, b.level_badge FROM schools sch LEFT JOIN states st ON st.id = sch.state_id LEFT JOIN school_sectors sec ON sec.id = sch.sector_id LEFT JOIN school_level_badge b ON b.school_id = sch.id`);

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
}).with({ securityInvoker: true }).as(sql`SELECT up.id, up.first_name, up.last_name, TRIM(BOTH ' '::text FROM concat(up.first_name, ' ', up.last_name)) AS full_name, up.email, up.avatar_url, up.created_at, up.updated_at, up.metadata, COALESCE(array_agg(DISTINCT r.key) FILTER (WHERE ur.role_scope = 'platform'::text), ARRAY[]::text[]) AS platform_roles, COALESCE(jsonb_agg(DISTINCT jsonb_build_object('schoolId', ur.school_id, 'roleKey', r.key)) FILTER (WHERE ur.role_scope = 'school'::text), '[]'::jsonb) AS school_roles FROM user_profile up LEFT JOIN user_roles ur ON ur.user_id = up.id LEFT JOIN roles r ON r.id = ur.role_id GROUP BY up.id, up.first_name, up.last_name, up.email, up.avatar_url, up.created_at, up.updated_at, up.metadata`);

export const vCourseTopicsEnriched = pgView("v_course_topics_enriched", {	topicId: uuid("topic_id"),
	courseId: uuid("course_id"),
	topicTitle: text("topic_title"),
	courseOrder: smallint("course_order"),
	topicStatus: text("topic_status"),
	topicCreatedAt: timestamp("topic_created_at", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	slideCount: bigint("slide_count", { mode: "number" }),
	hasQuiz: boolean("has_quiz"),
	quizCompleted: boolean("quiz_completed"),
	quizScorePercentage: integer("quiz_score_percentage"),
}).with({ securityInvoker: true }).as(sql`SELECT ct.id AS topic_id, ct.course_id, ct.title AS topic_title, ct.course_order, ct.status AS topic_status, ct.created_at AS topic_created_at, COALESCE(slide_counts.slide_count, 0::bigint) AS slide_count, COALESCE(quiz_exists.has_quiz, false) AS has_quiz, COALESCE(user_quiz_status.quiz_completed, false) AS quiz_completed, user_quiz_status.quiz_score_percentage FROM course_topics ct LEFT JOIN ( SELECT course_topic_slides.topic_id, count(*) AS slide_count FROM course_topic_slides GROUP BY course_topic_slides.topic_id) slide_counts ON slide_counts.topic_id = ct.id LEFT JOIN ( SELECT DISTINCT ctq.topic_id, true AS has_quiz FROM course_topic_quizzes ctq JOIN quiz_questions qq ON qq.quiz_id = ctq.id GROUP BY ctq.topic_id HAVING count(qq.id) > 0) quiz_exists ON quiz_exists.topic_id = ct.id LEFT JOIN ( SELECT qa.topic_id, bool_or(qa.is_passed = true) AS quiz_completed, ( SELECT qa2.score_percentage FROM quiz_attempts qa2 WHERE qa2.topic_id = qa.topic_id AND qa2.user_id = auth.uid() AND (qa2.is_passed = true AND qa2.score_percentage IS NOT NULL OR NOT (EXISTS ( SELECT 1 FROM quiz_attempts qa3 WHERE qa3.topic_id = qa.topic_id AND qa3.user_id = auth.uid() AND qa3.is_passed = true)) AND qa2.score_percentage IS NOT NULL) ORDER BY ( CASE WHEN qa2.is_passed = true THEN 0 ELSE 1 END), qa2.completed_at DESC NULLS LAST, qa2.started_at DESC LIMIT 1) AS quiz_score_percentage FROM quiz_attempts qa WHERE qa.user_id = auth.uid() GROUP BY qa.topic_id) user_quiz_status ON user_quiz_status.topic_id = ct.id ORDER BY ct.course_id, ct.course_order`);

export const vQuizAttemptsEnriched = pgView("v_quiz_attempts_enriched", {	attemptId: uuid("attempt_id"),
	userId: uuid("user_id"),
	quizId: uuid("quiz_id"),
	topicId: uuid("topic_id"),
	courseId: uuid("course_id"),
	attemptNumber: integer("attempt_number"),
	totalQuestions: integer("total_questions"),
	correctAnswers: integer("correct_answers"),
	scorePercentage: integer("score_percentage"),
	passingScorePercentage: integer("passing_score_percentage"),
	isPassed: boolean("is_passed"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}).with({ securityInvoker: true }).as(sql`SELECT qa.id AS attempt_id, qa.user_id, qa.quiz_id, qa.topic_id, qa.course_id, qa.attempt_number, qa.total_questions, qa.correct_answers, qa.score_percentage, ctq.passing_score_percentage, qa.is_passed, qa.started_at, qa.completed_at FROM quiz_attempts qa JOIN course_topic_quizzes ctq ON ctq.id = qa.quiz_id WHERE qa.completed_at IS NOT NULL`);

export const vUsersWithRolesAndSchools = pgView("v_users_with_roles_and_schools", {	id: uuid(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	platformRoles: text("platform_roles"),
	schoolRoles: jsonb("school_roles"),
}).with({"securityInvoker":true}).as(sql`SELECT up.id, up.first_name, up.last_name, up.email, up.avatar_url, up.created_at, up.updated_at, up.metadata, COALESCE(array_agg(DISTINCT r.key) FILTER (WHERE ur.role_scope = 'platform'::text), ARRAY[]::text[]) AS platform_roles, COALESCE(jsonb_agg(DISTINCT jsonb_build_object('schoolId', ur.school_id, 'schoolName', s.name, 'roleKey', r.key, 'roleName', r.name)) FILTER (WHERE ur.role_scope = 'school'::text AND ur.school_id IS NOT NULL), '[]'::jsonb) AS school_roles FROM user_profile up LEFT JOIN user_roles ur ON ur.user_id = up.id LEFT JOIN roles r ON r.id = ur.role_id LEFT JOIN schools s ON s.id = ur.school_id GROUP BY up.id, up.first_name, up.last_name, up.email, up.avatar_url, up.created_at, up.updated_at, up.metadata`);

export const vFeaturePermissionsReadable = pgView("v_feature_permissions_readable", {	id: uuid(),
	featureId: uuid("feature_id"),
	featureKey: text("feature_key"),
	featureName: text("feature_name"),
	featureCategory: text("feature_category"),
	featureDescription: text("feature_description"),
	level: featurePermissionLevel(),
	targetId: uuid("target_id"),
	targetName: text("target_name"),
	targetType: text("target_type"),
	enabled: boolean(),
	visible: boolean(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdByName: text("created_by_name"),
}).with({ securityInvoker: true }).as(sql`SELECT fp.id, fp.feature_id, f.key AS feature_key, f.name AS feature_name, f.category AS feature_category, f.description AS feature_description, fp.level, fp.target_id, CASE WHEN fp.level = 'global'::feature_permission_level THEN 'Global'::text WHEN fp.level = 'school'::feature_permission_level THEN s.name WHEN fp.level = 'role'::feature_permission_level THEN r.name WHEN fp.level = 'user'::feature_permission_level THEN COALESCE(TRIM(BOTH ' '::text FROM (up.first_name || ' '::text) || up.last_name), up.email) ELSE NULL::text END AS target_name, CASE WHEN fp.level = 'global'::feature_permission_level THEN 'Global'::text WHEN fp.level = 'school'::feature_permission_level THEN 'School'::text WHEN fp.level = 'role'::feature_permission_level THEN 'Role'::text WHEN fp.level = 'user'::feature_permission_level THEN 'User'::text ELSE NULL::text END AS target_type, fp.enabled, fp.visible, fp.created_at, fp.updated_at, fp.created_by, COALESCE(TRIM(BOTH ' '::text FROM (creator.first_name || ' '::text) || creator.last_name), creator.email) AS created_by_name FROM feature_permissions fp JOIN features f ON f.id = fp.feature_id LEFT JOIN schools s ON fp.level = 'school'::feature_permission_level AND s.id = fp.target_id LEFT JOIN roles r ON fp.level = 'role'::feature_permission_level AND r.id = fp.target_id LEFT JOIN user_profile up ON fp.level = 'user'::feature_permission_level AND up.id = fp.target_id LEFT JOIN user_profile creator ON creator.id = fp.created_by`);