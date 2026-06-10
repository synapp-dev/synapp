import { pgTable, pgSchema, index, foreignKey, check, uuid, text, timestamp, jsonb, uniqueIndex, pgPolicy, varchar, integer, bigserial, boolean, inet, bigint, smallint, json, unique, doublePrecision, primaryKey, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const bytea = customType<{ data: Buffer }>({
	dataType() {
		return "bytea";
	},
});

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

export const instancesInAuth = auth.table("instances", {
	id: uuid().notNull(),
	uuid: uuid(),
	rawBaseConfig: text("raw_base_config"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
});

export const newsArticles = pgTable("news_articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 160 }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	excerpt: text(),
	bodyJson: jsonb("body_json").default({"type":"doc","content":[{"type":"paragraph"}]}).notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	authorUserId: uuid("author_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("news_articles_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("news_articles_status_published_at_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.publishedAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authorUserId],
			foreignColumns: [usersInAuth.id],
			name: "news_articles_author_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("news_articles_select", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((((status)::text = 'published'::text) AND (published_at IS NOT NULL)) OR (EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
     JOIN user_profiles up ON ((up.id = ur.user_profile_id)))
  WHERE ((up.user_id = auth.uid()) AND ((r.slug)::text = ANY ((ARRAY['news.editor'::character varying, 'developer'::character varying])::text[]))))))` }),
	pgPolicy("news_articles_insert_editor", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("news_articles_update_editor", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("news_articles_delete_editor", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("news_articles_published_at_when_published", sql`((status)::text <> 'published'::text) OR (published_at IS NOT NULL)`),
	check("news_articles_status_check", sql`(status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[])`),
]);

export const forumCategories = pgTable("forum_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 64 }).notNull(),
	label: varchar({ length: 255 }).notNull(),
	description: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("forum_categories_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("forum_categories_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`true` }),
]);

export const schemaMigrationsInAuth = auth.table("schema_migrations", {
	version: varchar({ length: 255 }).notNull(),
});

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

export const steamProfiles = pgTable("steam_profiles", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	steamid64: text().primaryKey().notNull(),
	steamid: varchar({ length: 20 }).notNull(),
	personaname: varchar({ length: 255 }).notNull(),
	profileurl: varchar({ length: 500 }),
	avatar: varchar({ length: 500 }),
	avatarmedium: varchar({ length: 500 }),
	avatarfull: varchar({ length: 500 }),
	personastate: integer().default(0),
	communityvisibilitystate: integer().default(0),
	profilestate: integer().default(0),
	lastlogoff: timestamp({ withTimezone: true, mode: 'string' }),
	commentpermission: integer().default(0),
	realname: varchar({ length: 255 }),
	primaryclanid: varchar({ length: 20 }),
	timecreated: timestamp({ withTimezone: true, mode: 'string' }),
	gameid: integer(),
	gameserverip: varchar({ length: 50 }),
	gameextrainfo: varchar({ length: 255 }),
	cityid: integer(),
	loccountrycode: varchar({ length: 2 }),
	locstatecode: varchar({ length: 2 }),
	loccityid: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_steam_profiles_steamid").using("btree", table.steamid.asc().nullsLast().op("text_ops")),
	pgPolicy("Allow public read steam_profiles", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Allow insert steam_profiles", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow update steam_profiles", { as: "permissive", for: "update", to: ["public"] }),
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
	tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
}, (table) => [
	index("oauth_clients_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	check("oauth_clients_client_name_length", sql`char_length(client_name) <= 1024`),
	check("oauth_clients_client_uri_length", sql`char_length(client_uri) <= 2048`),
	check("oauth_clients_logo_uri_length", sql`char_length(logo_uri) <= 2048`),
	check("oauth_clients_token_endpoint_auth_method_check", sql`token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])`),
]);

export const userProfiles = pgTable("user_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	steamProfileId: text("steam_profile_id"),
	username: varchar({ length: 255 }),
	displayName: varchar("display_name", { length: 255 }),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	bio: text(),
	avatarUrl: varchar("avatar_url", { length: 500 }),
	email: varchar({ length: 255 }),
	isVerified: boolean("is_verified").default(false),
	isPremium: boolean("is_premium").default(false),
	preferences: jsonb().default({}),
	anthemUrl: text("anthem_url"),
	lastActive: timestamp("last_active", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	discordUserId: text("discord_user_id"),
}, (table) => [
	uniqueIndex("idx_user_profiles_discord_user_id").using("btree", table.discordUserId.asc().nullsLast().op("text_ops")).where(sql`(discord_user_id IS NOT NULL)`),
	index("idx_user_profiles_steam_profile_id").using("btree", table.steamProfileId.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_user_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_profiles_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.steamProfileId],
			foreignColumns: [steamProfiles.steamid64],
			name: "user_profiles_steam_profile_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "user_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_profiles_username_key").on(table.username),
	pgPolicy("Users can read their own profile", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Allow public read access to user profiles", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can update their own profile", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can insert their own profile", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can delete their own profile", { as: "permissive", for: "delete", to: ["public"] }),
	check("check_steam_or_username_or_email", sql`(steam_profile_id IS NOT NULL) OR (username IS NOT NULL) OR (email IS NOT NULL)`),
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

export const oauthClientStatesInAuth = auth.table("oauth_client_states", {
	id: uuid().notNull(),
	providerType: text("provider_type").notNull(),
	codeVerifier: text("code_verifier"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_oauth_client_states_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const flowStateInAuth = auth.table("flow_state", {
	id: uuid().notNull(),
	userId: uuid("user_id"),
	authCode: text("auth_code"),
	codeChallengeMethod: codeChallengeMethodInAuth("code_challenge_method"),
	codeChallenge: text("code_challenge"),
	providerType: text("provider_type").notNull(),
	providerAccessToken: text("provider_access_token"),
	providerRefreshToken: text("provider_refresh_token"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	authenticationMethod: text("authentication_method").notNull(),
	authCodeIssuedAt: timestamp("auth_code_issued_at", { withTimezone: true, mode: 'string' }),
	inviteToken: text("invite_token"),
	referrer: text(),
	oauthClientStateId: uuid("oauth_client_state_id"),
	linkingTargetId: uuid("linking_target_id"),
	emailOptional: boolean("email_optional").default(false).notNull(),
}, (table) => [
	index("flow_state_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_auth_code").using("btree", table.authCode.asc().nullsLast().op("text_ops")),
	index("idx_user_id_auth_method").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.authenticationMethod.asc().nullsLast().op("uuid_ops")),
]);

export const customOauthProvidersInAuth = auth.table("custom_oauth_providers", {
	id: uuid().defaultRandom().notNull(),
	providerType: text("provider_type").notNull(),
	identifier: text().notNull(),
	name: text().notNull(),
	clientId: text("client_id").notNull(),
	clientSecret: text("client_secret").notNull(),
	acceptableClientIds: text("acceptable_client_ids").array().default([""]).notNull(),
	scopes: text().array().default([""]).notNull(),
	pkceEnabled: boolean("pkce_enabled").default(true).notNull(),
	attributeMapping: jsonb("attribute_mapping").default({}).notNull(),
	authorizationParams: jsonb("authorization_params").default({}).notNull(),
	enabled: boolean().default(true).notNull(),
	emailOptional: boolean("email_optional").default(false).notNull(),
	issuer: text(),
	discoveryUrl: text("discovery_url"),
	skipNonceCheck: boolean("skip_nonce_check").default(false).notNull(),
	cachedDiscovery: jsonb("cached_discovery"),
	discoveryCachedAt: timestamp("discovery_cached_at", { withTimezone: true, mode: 'string' }),
	authorizationUrl: text("authorization_url"),
	tokenUrl: text("token_url"),
	userinfoUrl: text("userinfo_url"),
	jwksUri: text("jwks_uri"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("custom_oauth_providers_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("custom_oauth_providers_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	index("custom_oauth_providers_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
	index("custom_oauth_providers_provider_type_idx").using("btree", table.providerType.asc().nullsLast().op("text_ops")),
	check("custom_oauth_providers_authorization_url_https", sql`(authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text)`),
	check("custom_oauth_providers_authorization_url_length", sql`(authorization_url IS NULL) OR (char_length(authorization_url) <= 2048)`),
	check("custom_oauth_providers_client_id_length", sql`(char_length(client_id) >= 1) AND (char_length(client_id) <= 512)`),
	check("custom_oauth_providers_discovery_url_length", sql`(discovery_url IS NULL) OR (char_length(discovery_url) <= 2048)`),
	check("custom_oauth_providers_identifier_format", sql`identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text`),
	check("custom_oauth_providers_issuer_length", sql`(issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048))`),
	check("custom_oauth_providers_jwks_uri_https", sql`(jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text)`),
	check("custom_oauth_providers_jwks_uri_length", sql`(jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048)`),
	check("custom_oauth_providers_name_length", sql`(char_length(name) >= 1) AND (char_length(name) <= 100)`),
	check("custom_oauth_providers_oauth2_requires_endpoints", sql`(provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL))`),
	check("custom_oauth_providers_oidc_discovery_url_https", sql`(provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text)`),
	check("custom_oauth_providers_oidc_issuer_https", sql`(provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text)`),
	check("custom_oauth_providers_oidc_requires_issuer", sql`(provider_type <> 'oidc'::text) OR (issuer IS NOT NULL)`),
	check("custom_oauth_providers_provider_type_check", sql`provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text])`),
	check("custom_oauth_providers_token_url_https", sql`(token_url IS NULL) OR (token_url ~~ 'https://%'::text)`),
	check("custom_oauth_providers_token_url_length", sql`(token_url IS NULL) OR (char_length(token_url) <= 2048)`),
	check("custom_oauth_providers_userinfo_url_https", sql`(userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text)`),
	check("custom_oauth_providers_userinfo_url_length", sql`(userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)`),
]);

export const webauthnCredentialsInAuth = auth.table("webauthn_credentials", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	credentialId: bytea("credential_id").notNull(),
	publicKey: bytea("public_key").notNull(),
	attestationType: text("attestation_type").default(sql`NULL`).notNull(),
	aaguid: uuid(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	signCount: bigint("sign_count", { mode: "number" }).default(0).notNull(),
	transports: jsonb().default([]).notNull(),
	backupEligible: boolean("backup_eligible").default(false).notNull(),
	backedUp: boolean("backed_up").default(false).notNull(),
	friendlyName: text("friendly_name").default(sql`NULL`).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("webauthn_credentials_credential_id_key").using("btree", table.credentialId.asc().nullsLast().op("bytea_ops")),
	index("webauthn_credentials_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "webauthn_credentials_user_id_fkey"
		}).onDelete("cascade"),
]);

export const utilityMapSpots = pgTable("utility_map_spots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mapId: uuid("map_id").notNull(),
	slug: varchar({ length: 128 }).notNull(),
	label: text().notNull(),
	radarX: doublePrecision("radar_x").notNull(),
	radarY: doublePrecision("radar_y").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("utility_map_spots_map_id_idx").using("btree", table.mapId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("utility_map_spots_map_id_slug_key").using("btree", table.mapId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.mapId],
			foreignColumns: [maps.id],
			name: "utility_map_spots_map_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("utility_map_spots_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM maps m
  WHERE ((m.id = utility_map_spots.map_id) AND (m.is_active = true))))` }),
	check("utility_map_spots_radar_x_check", sql`(radar_x >= (0)::double precision) AND (radar_x <= (1)::double precision)`),
	check("utility_map_spots_radar_y_check", sql`(radar_y >= (0)::double precision) AND (radar_y <= (1)::double precision)`),
]);

export const webauthnChallengesInAuth = auth.table("webauthn_challenges", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id"),
	challengeType: text("challenge_type").notNull(),
	sessionData: jsonb("session_data").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("webauthn_challenges_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("webauthn_challenges_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "webauthn_challenges_user_id_fkey"
		}).onDelete("cascade"),
	check("webauthn_challenges_challenge_type_check", sql`challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])`),
]);

export const forumTags = pgTable("forum_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 64 }).notNull(),
	label: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("forum_tags_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("forum_tags_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`true` }),
]);

export const utilityLineups = pgTable("utility_lineups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mapId: uuid("map_id").notNull(),
	grenadeType: varchar("grenade_type", { length: 32 }).notNull(),
	side: varchar({ length: 16 }).notNull(),
	movement: varchar({ length: 32 }).notNull(),
	technique: varchar({ length: 48 }).notNull(),
	margin: varchar({ length: 16 }).notNull(),
	youtubeUrl: text("youtube_url"),
	videoStartMs: integer("video_start_ms").default(0).notNull(),
	videoEndMs: integer("video_end_ms"),
	lineupImageUrl: text("lineup_image_url"),
	description: text().notNull(),
	setposText: text("setpos_text"),
	authorProfileId: uuid("author_profile_id"),
	status: varchar({ length: 20 }).default('draft').notNull(),
	proVerified: boolean("pro_verified").default(false).notNull(),
	intradarkVerified: boolean("intradark_verified").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	throwSpotX: doublePrecision("throw_spot_x").notNull(),
	throwSpotY: doublePrecision("throw_spot_y").notNull(),
	landSpotX: doublePrecision("land_spot_x").notNull(),
	landSpotY: doublePrecision("land_spot_y").notNull(),
	throwLabel: text("throw_label").notNull(),
	landLabel: text("land_label").notNull(),
	videoObjectPath: text("video_object_path"),
	stillStandMs: integer("still_stand_ms"),
	stillThrowMs: integer("still_throw_ms"),
	stillLandMs: integer("still_land_ms"),
	grenadeReleaseMs: integer("grenade_release_ms"),
	grenadeBloomMs: integer("grenade_bloom_ms"),
}, (table) => [
	index("utility_lineups_map_grenade_side_idx").using("btree", table.mapId.asc().nullsLast().op("uuid_ops"), table.grenadeType.asc().nullsLast().op("text_ops"), table.side.asc().nullsLast().op("text_ops")),
	index("utility_lineups_map_id_idx").using("btree", table.mapId.asc().nullsLast().op("uuid_ops")),
	index("utility_lineups_map_land_xy_idx").using("btree", table.mapId.asc().nullsLast().op("float8_ops"), table.landSpotX.asc().nullsLast().op("float8_ops"), table.landSpotY.asc().nullsLast().op("float8_ops")),
	index("utility_lineups_status_created_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`((status)::text = 'pending'::text)`),
	foreignKey({
			columns: [table.authorProfileId],
			foreignColumns: [userProfiles.id],
			name: "utility_lineups_author_profile_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.mapId],
			foreignColumns: [maps.id],
			name: "utility_lineups_map_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("utility_lineups_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((status)::text = 'published'::text)` }),
	pgPolicy("utility_lineups_select_own_pending", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("utility_lineups_insert_own_pending", { as: "permissive", for: "insert", to: ["authenticated"] }),
	check("utility_lineups_grenade_type_check", sql`(grenade_type)::text = ANY (ARRAY[('smoke'::character varying)::text, ('molotov'::character varying)::text, ('flashbang'::character varying)::text, ('he'::character varying)::text])`),
	check("utility_lineups_land_spot_x_check", sql`(land_spot_x >= (0)::double precision) AND (land_spot_x <= (1)::double precision)`),
	check("utility_lineups_land_spot_y_check", sql`(land_spot_y >= (0)::double precision) AND (land_spot_y <= (1)::double precision)`),
	check("utility_lineups_margin_check", sql`(margin)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text])`),
	check("utility_lineups_movement_check", sql`(movement)::text = ANY (ARRAY[('stationary'::character varying)::text, ('running'::character varying)::text, ('walking'::character varying)::text, ('crouched'::character varying)::text, ('crouched_walking'::character varying)::text])`),
	check("utility_lineups_side_check", sql`(side)::text = ANY (ARRAY[('t'::character varying)::text, ('ct'::character varying)::text, ('both'::character varying)::text])`),
	check("utility_lineups_status_check", sql`(status)::text = ANY (ARRAY['draft'::text, 'published'::text, 'pending'::text])`),
	check("utility_lineups_technique_check", sql`(technique)::text = ANY (ARRAY[('left_click'::character varying)::text, ('right_click'::character varying)::text, ('left_and_right_click'::character varying)::text, ('jump_left_click'::character varying)::text, ('jump_right_click'::character varying)::text, ('jump_left_and_right_click'::character varying)::text])`),
	check("utility_lineups_throw_spot_x_check", sql`(throw_spot_x >= (0)::double precision) AND (throw_spot_x <= (1)::double precision)`),
	check("utility_lineups_throw_spot_y_check", sql`(throw_spot_y >= (0)::double precision) AND (throw_spot_y <= (1)::double precision)`),
	check("utility_lineups_video_source_check", sql`((status)::text = 'draft'::text) OR (NULLIF(btrim(COALESCE(youtube_url, ''::text)), ''::text) IS NOT NULL) OR (NULLIF(btrim(COALESCE(video_object_path, ''::text)), ''::text) IS NOT NULL)`),
]);

export const utilityLineupEnemyPovVideos = pgTable("utility_lineup_enemy_pov_videos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	lineupId: uuid("lineup_id").notNull(),
	authorProfileId: uuid("author_profile_id"),
	videoObjectPath: text("video_object_path").notNull(),
	description: text(),
	videoStartMs: integer("video_start_ms").default(0).notNull(),
	videoEndMs: integer("video_end_ms"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("utility_lineup_enemy_pov_videos_author_idx").using("btree", table.authorProfileId.asc().nullsLast().op("uuid_ops")),
	index("utility_lineup_enemy_pov_videos_lineup_id_idx").using("btree", table.lineupId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.authorProfileId],
			foreignColumns: [userProfiles.id],
			name: "utility_lineup_enemy_pov_videos_author_profile_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.lineupId],
			foreignColumns: [utilityLineups.id],
			name: "utility_lineup_enemy_pov_videos_lineup_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("utility_lineup_enemy_pov_videos_select_published", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM utility_lineups ul
  WHERE ((ul.id = utility_lineup_enemy_pov_videos.lineup_id) AND ((ul.status)::text = 'published'::text))))` }),
	pgPolicy("utility_lineup_enemy_pov_videos_select_own", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("utility_lineup_enemy_pov_videos_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("utility_lineup_enemy_pov_videos_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("utility_lineup_enemy_pov_videos_video_end_after_start", sql`(video_end_ms IS NULL) OR (video_end_ms > video_start_ms)`),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 64 }).notNull(),
	label: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("roles_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("roles_select_authenticated", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const userRoles = pgTable("user_roles", {
	roleId: uuid("role_id").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	grantedBy: uuid("granted_by"),
	userProfileId: uuid("user_profile_id").notNull(),
}, (table) => [
	uniqueIndex("user_roles_user_profile_id_role_id_key").using("btree", table.userProfileId.asc().nullsLast().op("uuid_ops"), table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [userProfiles.id],
			name: "user_roles_granted_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "user_roles_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("user_roles_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_profile_id IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.user_id = auth.uid())))` }),
]);

export const forumThreads = pgTable("forum_threads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	categoryId: uuid("category_id").notNull(),
	slug: varchar({ length: 160 }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	body: text().notNull(),
	authorUserId: uuid("author_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("forum_threads_author_user_id_idx").using("btree", table.authorUserId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("forum_threads_category_id_slug_key").using("btree", table.categoryId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	index("forum_threads_category_id_updated_at_idx").using("btree", table.categoryId.asc().nullsLast().op("timestamptz_ops"), table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authorUserId],
			foreignColumns: [usersInAuth.id],
			name: "forum_threads_author_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [forumCategories.id],
			name: "forum_threads_category_id_fkey"
		}).onDelete("restrict"),
	pgPolicy("forum_threads_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(deleted_at IS NULL)` }),
	pgPolicy("forum_threads_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("forum_threads_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const roleTemplates = pgTable("role_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 64 }).notNull(),
	label: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("role_templates_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("role_templates_select_authenticated", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const utilityLineupUploadJobs = pgTable("utility_lineup_upload_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authorProfileId: uuid("author_profile_id").notNull(),
	status: text().notNull(),
	payloadJson: jsonb("payload_json").notNull(),
	videoObjectPath: text("video_object_path").notNull(),
	expectedByteLength: integer("expected_byte_length").notNull(),
	errorMessage: text("error_message"),
	lineupId: uuid("lineup_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	kind: text().default('lineup').notNull(),
	parentLineupId: uuid("parent_lineup_id"),
	enemyPovVideoId: uuid("enemy_pov_video_id"),
}, (table) => [
	index("utility_lineup_upload_jobs_kind_status_idx").using("btree", table.kind.asc().nullsLast().op("timestamptz_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("utility_lineup_upload_jobs_parent_lineup_idx").using("btree", table.parentLineupId.asc().nullsLast().op("uuid_ops")),
	index("utility_lineup_upload_jobs_profile_status_idx").using("btree", table.authorProfileId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authorProfileId],
			foreignColumns: [userProfiles.id],
			name: "utility_lineup_upload_jobs_author_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.enemyPovVideoId],
			foreignColumns: [utilityLineupEnemyPovVideos.id],
			name: "utility_lineup_upload_jobs_enemy_pov_video_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.lineupId],
			foreignColumns: [utilityLineups.id],
			name: "utility_lineup_upload_jobs_lineup_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentLineupId],
			foreignColumns: [utilityLineups.id],
			name: "utility_lineup_upload_jobs_parent_lineup_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("utility_lineup_upload_jobs_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = utility_lineup_upload_jobs.author_profile_id) AND (up.user_id = auth.uid()))))` }),
	pgPolicy("utility_lineup_upload_jobs_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("utility_lineup_upload_jobs_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("utility_lineup_upload_jobs_kind_check", sql`kind = ANY (ARRAY['lineup'::text, 'enemy_pov'::text])`),
	check("utility_lineup_upload_jobs_kind_parent_check", sql`((kind = 'enemy_pov'::text) AND (parent_lineup_id IS NOT NULL)) OR ((kind = 'lineup'::text) AND (parent_lineup_id IS NULL))`),
	check("utility_lineup_upload_jobs_status_check", sql`status = ANY (ARRAY['queued'::text, 'uploading'::text, 'finalizing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const mapPools = pgTable("map_pools", {
	id: uuid().primaryKey().notNull(),
	slug: varchar({ length: 64 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("map_pools_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("map_pools_select_all", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`true` }),
]);

export const forumReplies = pgTable("forum_replies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	threadId: uuid("thread_id").notNull(),
	parentReplyId: uuid("parent_reply_id"),
	body: text().notNull(),
	authorUserId: uuid("author_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("forum_replies_parent_reply_id_idx").using("btree", table.parentReplyId.asc().nullsLast().op("uuid_ops")),
	index("forum_replies_thread_id_created_at_idx").using("btree", table.threadId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authorUserId],
			foreignColumns: [usersInAuth.id],
			name: "forum_replies_author_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentReplyId],
			foreignColumns: [table.id],
			name: "forum_replies_parent_reply_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [forumThreads.id],
			name: "forum_replies_thread_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("forum_replies_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM forum_threads t
  WHERE ((t.id = forum_replies.thread_id) AND (t.deleted_at IS NULL)))))` }),
	pgPolicy("forum_replies_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("forum_replies_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const maps = pgTable("maps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	game: varchar({ length: 32 }).default('cs2').notNull(),
	slug: varchar({ length: 128 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	poolId: uuid("pool_id").notNull(),
	radarImageUrl: text("radar_image_url").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	badgeImageUrl: text("badge_image_url").default(sql`NULL`).notNull(),
	mapScreenshotUrl: text("map_screenshot_url").default(sql`NULL`).notNull(),
}, (table) => [
	index("maps_is_active_sort_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	index("maps_pool_id_idx").using("btree", table.poolId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("maps_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [mapPools.id],
			name: "maps_pool_id_fkey"
		}).onDelete("restrict"),
	pgPolicy("maps_select", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((is_active = true) OR (EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
     JOIN user_profiles up ON ((up.id = ur.user_profile_id)))
  WHERE ((up.user_id = auth.uid()) AND ((r.slug)::text = 'developer'::text)))))` }),
	pgPolicy("maps_insert_developer", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("maps_update_developer", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("maps_delete_developer", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const forumThreadTags = pgTable("forum_thread_tags", {
	threadId: uuid("thread_id").notNull(),
	tagId: uuid("tag_id").notNull(),
}, (table) => [
	index("forum_thread_tags_tag_id_idx").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [forumTags.id],
			name: "forum_thread_tags_tag_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [forumThreads.id],
			name: "forum_thread_tags_thread_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.threadId, table.tagId], name: "forum_thread_tags_thread_id_tag_id_pk"}),
	pgPolicy("forum_thread_tags_select_public", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM forum_threads t
  WHERE ((t.id = forum_thread_tags.thread_id) AND (t.deleted_at IS NULL))))` }),
	pgPolicy("forum_thread_tags_insert_author", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("forum_thread_tags_delete_author", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const roleTemplateRoles = pgTable("role_template_roles", {
	templateId: uuid("template_id").notNull(),
	roleId: uuid("role_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_template_roles_role_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [roleTemplates.id],
			name: "role_template_roles_template_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.templateId, table.roleId], name: "role_template_roles_template_id_role_id_pk"}),
	pgPolicy("role_template_roles_select_authenticated", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const userRoleTemplates = pgTable("user_role_templates", {
	userProfileId: uuid("user_profile_id").notNull(),
	templateId: uuid("template_id").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	grantedBy: uuid("granted_by"),
}, (table) => [
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [userProfiles.id],
			name: "user_role_templates_granted_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [roleTemplates.id],
			name: "user_role_templates_template_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "user_role_templates_user_profile_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userProfileId, table.templateId], name: "user_role_templates_user_profile_id_template_id_pk"}),
	pgPolicy("user_role_templates_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_profile_id IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.user_id = auth.uid())))` }),
]);
