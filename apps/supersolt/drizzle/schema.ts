import { customType, pgTable, pgSchema, index, foreignKey, check, uuid, text, timestamp, jsonb, varchar, bigserial, boolean, inet, bigint, uniqueIndex, smallint, json, pgPolicy, integer, date, unique, numeric, time, type AnyPgColumn, primaryKey, char, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
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
export const employeeDocumentType = pgEnum("employee_document_type", ['employment_contract', 'photo_id', 'work_rights', 'tfn_declaration', 'super_choice', 'certification', 'termination_letter', 'other'])
export const employeeEmploymentStatus = pgEnum("employee_employment_status", ['active', 'on_leave', 'on_parental_leave', 'terminated', 'archived'])
export const employeeTfnStatus = pgEnum("employee_tfn_status", ['provided', 'pending', 'under_18_low_earnings', 'no_tfn_withholding'])
export const employmentType = pgEnum("employment_type", ['full_time', 'part_time', 'casual', 'fixed_term'])
export const leaveAccrualBasis = pgEnum("leave_accrual_basis", ['hours_worked', 'years_service', 'per_occasion', 'calendar_year', 'none'])
export const leaveAccrualTrigger = pgEnum("leave_accrual_trigger", ['timesheet_approval', 'manual_adjustment', 'leave_taken', 'accrual_correction', 'opening_balance', 'termination_payout'])
export const leaveApprovalRole = pgEnum("leave_approval_role", ['manager', 'owner'])
export const leaveRequestStatus = pgEnum("leave_request_status", ['pending', 'approved', 'rejected', 'withdrawn', 'cancelled'])
export const libraryUpdateType = pgEnum("library_update_type", ['annual_awr', 'fwc_variation', 'correction'])
export const payPeriodFrequency = pgEnum("pay_period_frequency", ['weekly', 'fortnightly', 'monthly'])
export const payPeriodStatus = pgEnum("pay_period_status", ['open', 'closed', 'exported', 'locked'])
export const payRateChangeReason = pgEnum("pay_rate_change_reason", ['hire', 'manual_adjustment', 'award_uplift', 'awr_percentage_uplift', 'correction'])
export const payRateReasonCategory = pgEnum("pay_rate_reason_category", ['annual_review', 'award_uplift', 'promotion', 'market_correction', 'other'])
export const payrollOverrideCategory = pgEnum("payroll_override_category", ['payg_correction', 'allowance', 'termination_etp', 'wage_theft_exemption', 'other'])
export const payrollRunStatus = pgEnum("payroll_run_status", ['draft', 'returned_for_revision', 'pending_owner_approval', 'approved', 'xero_push_pending', 'sent_to_xero', 'finalised_in_xero', 'paid', 'payslips_issued', 'stp_lodged', 'super_scheduled', 'super_paid', 'reconciled'])
export const penaltyDayType = pgEnum("penalty_day_type", ['mon_fri', 'saturday', 'sunday', 'public_holiday'])
export const penaltyEmploymentScope = pgEnum("penalty_employment_scope", ['ft_pt', 'casual', 'all'])
export const penaltyUpliftType = pgEnum("penalty_uplift_type", ['percentage', 'dollar_per_hour'])
export const rosterShiftLifecycle = pgEnum("roster_shift_lifecycle", ['draft', 'published', 'modified'])
export const rosterShiftSource = pgEnum("roster_shift_source", ['manual', 'copy_week', 'template_apply', 'autofill', 'demand_fill'])
export const shiftComplianceRule = pgEnum("shift_compliance_rule", ['leave_clash', 'cert_missing', 'cert_expired', 'under18_hours', 'visa_expired', 'rest_gap', 'max_hours', 'availability', 'over_budget', 'min_engagement', 'pt_pattern'])
export const shiftComplianceTier = pgEnum("shift_compliance_tier", ['hard_block', 'warn'])
export const stapledCheckStatus = pgEnum("stapled_check_status", ['not_required', 'pending', 'checked', 'default_fund_used'])
export const timesheetBreakMode = pgEnum("timesheet_break_mode", ['explicit_events', 'auto_deduct'])
export const timesheetClockEventType = pgEnum("timesheet_clock_event_type", ['clock_in', 'clock_out', 'break_start', 'break_end', 'auto_clock_out', 'manual_correction'])
export const timesheetDisputeResolution = pgEnum("timesheet_dispute_resolution", ['pending', 'accepted', 'partial', 'rejected'])
export const timesheetStatus = pgEnum("timesheet_status", ['open', 'submitted', 'approved', 'disputed', 'locked'])
export const xeroSyncDirection = pgEnum("xero_sync_direction", ['xero_to_supersolt', 'supersolt_to_xero'])


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
	// TODO: failed to parse database type 'bytea'
	credentialId: bytea("credential_id").notNull(),
	// TODO: failed to parse database type 'bytea'
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

export const userVenues = pgTable("user_venues", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userOrganisationId: uuid("user_organisation_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	roleId: uuid("role_id"),
	defaultPositionId: uuid("default_position_id"),
}, (table) => [
	uniqueIndex("user_venues_active_mapping_uq").using("btree", table.userOrganisationId.asc().nullsLast().op("uuid_ops"), table.venueId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("user_venues_default_position_idx").using("btree", table.defaultPositionId.asc().nullsLast().op("uuid_ops")).where(sql`((archived_at IS NULL) AND (default_position_id IS NOT NULL))`),
	index("user_venues_membership_active_idx").using("btree", table.userOrganisationId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("user_venues_role_id_idx").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")).where(sql`((archived_at IS NULL) AND (role_id IS NOT NULL))`),
	index("user_venues_venue_active_idx").using("btree", table.venueId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.defaultPositionId],
			foreignColumns: [positions.id],
			name: "user_venues_default_position_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_venues_role_id_fkey"
		}),
	foreignKey({
			columns: [table.userOrganisationId, table.organisationId],
			foreignColumns: [userOrganisations.id, userOrganisations.organisationId],
			name: "user_venues_user_org_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "user_venues_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("user_venues_admin_manage", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_admin(organisation_id)`, withCheck: sql`is_org_admin(organisation_id)`  }),
	pgPolicy("user_venues_select_org_peers", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("user_venues_select_own", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const venueForecastState = pgTable("venue_forecast_state", {
	venueId: uuid("venue_id").primaryKey().notNull(),
	availableHistoryDays: integer("available_history_days").default(0).notNull(),
	forecastReady: boolean("forecast_ready").default(false).notNull(),
	backfillStatus: text("backfill_status").default('idle').notNull(),
	backfillProgress: jsonb("backfill_progress"),
	dataStartsFrom: date("data_starts_from"),
	lastDailySalesSyncAt: timestamp("last_daily_sales_sync_at", { withTimezone: true, mode: 'string' }),
	lastComputedAt: timestamp("last_computed_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastPaymentsSyncAt: timestamp("last_payments_sync_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_forecast_state_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("venue_forecast_state_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = venue_forecast_state.venue_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("venue_forecast_state_backfill_status_chk", sql`backfill_status = ANY (ARRAY['idle'::text, 'running'::text, 'complete'::text, 'failed'::text])`),
]);

export const venueSquareConnections = pgTable("venue_square_connections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	squareMerchantId: text("square_merchant_id").notNull(),
	squareAccessToken: text("square_access_token").notNull(),
	squareRefreshToken: text("square_refresh_token").notNull(),
	tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, mode: 'string' }),
	environment: text().notNull(),
	squareLocationId: text("square_location_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("venue_square_connections_org_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_square_connections_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_square_connections_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_square_connections_venue_uq").on(table.venueId),
	pgPolicy("venue_square_connections_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`is_org_admin(organisation_id)` }),
	pgPolicy("venue_square_connections_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("venue_square_connections_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("venue_square_connections_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("venue_square_connections_environment_chk", sql`environment = ANY (ARRAY['sandbox'::text, 'production'::text])`),
]);

export const recipes = pgTable("recipes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	name: text().notNull(),
	description: text(),
	category: text().default('other').notNull(),
	serves: integer().default(1).notNull(),
	method: text(),
	status: text().default('draft').notNull(),
	costPerServeCents: integer("cost_per_serve_cents").default(0).notNull(),
	suggestedPriceCents: integer("suggested_price_cents").default(0).notNull(),
	gpTargetPercent: integer("gp_target_percent").default(0).notNull(),
	wastePercent: integer("waste_percent").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "recipes_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "recipes_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("recipes_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = recipes.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("recipes_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("recipes_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("recipes_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const recipeMethodSteps = pgTable("recipe_method_steps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recipeId: uuid("recipe_id").notNull(),
	stepOrder: integer("step_order").notNull(),
	instruction: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_method_steps_recipe_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("recipe_method_steps_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (recipes r
     JOIN user_organisations uo ON ((uo.organisation_id = r.organisation_id)))
  WHERE ((r.id = recipe_method_steps.recipe_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (recipes r
     JOIN user_organisations uo ON ((uo.organisation_id = r.organisation_id)))
  WHERE ((r.id = recipe_method_steps.recipe_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const menuItemSquareCatalogLinks = pgTable("menu_item_square_catalog_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	menuItemId: uuid("menu_item_id").notNull(),
	squareCatalogObjectId: text("square_catalog_object_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("menu_item_square_catalog_links_menu_item_idx").using("btree", table.menuItemId.asc().nullsLast().op("uuid_ops")),
	index("menu_item_square_catalog_links_venue_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.menuItemId],
			foreignColumns: [menuItems.id],
			name: "menu_item_square_catalog_links_menu_item_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "menu_item_square_catalog_links_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "menu_item_square_catalog_links_venue_id_fkey"
		}).onDelete("cascade"),
	unique("menu_item_square_catalog_links_uq").on(table.venueId, table.squareCatalogObjectId),
	pgPolicy("menu_item_square_catalog_links_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`is_org_admin(organisation_id)` }),
	pgPolicy("menu_item_square_catalog_links_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("menu_item_square_catalog_links_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("menu_item_square_catalog_links_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const recipeAllergens = pgTable("recipe_allergens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recipeId: uuid("recipe_id").notNull(),
	allergenCode: text("allergen_code").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_allergens_recipe_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("recipe_allergens_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (recipes r
     JOIN user_organisations uo ON ((uo.organisation_id = r.organisation_id)))
  WHERE ((r.id = recipe_allergens.recipe_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (recipes r
     JOIN user_organisations uo ON ((uo.organisation_id = r.organisation_id)))
  WHERE ((r.id = recipe_allergens.recipe_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const menuItemRecipes = pgTable("menu_item_recipes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	menuItemId: uuid("menu_item_id").notNull(),
	recipeId: uuid("recipe_id").notNull(),
	quantity: numeric().default('1').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.menuItemId],
			foreignColumns: [menuItems.id],
			name: "menu_item_recipes_menu_item_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "menu_item_recipes_recipe_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("menu_item_recipes_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (menu_items m
     JOIN user_organisations uo ON ((uo.organisation_id = m.organisation_id)))
  WHERE ((m.id = menu_item_recipes.menu_item_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (menu_items m
     JOIN user_organisations uo ON ((uo.organisation_id = m.organisation_id)))
  WHERE ((m.id = menu_item_recipes.menu_item_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const roles = pgTable("roles", {
	id: uuid().primaryKey().notNull(),
	organisationId: uuid("organisation_id"),
	slug: text().notNull(),
	displayName: text("display_name").notNull(),
	description: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	grantsOrgAdmin: boolean("grants_org_admin").default(false).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("roles_org_list_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	uniqueIndex("roles_org_slug_uq").using("btree", table.organisationId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")).where(sql`((organisation_id IS NOT NULL) AND (archived_at IS NULL))`),
	uniqueIndex("roles_platform_slug_uq").using("btree", table.slug.asc().nullsLast().op("text_ops")).where(sql`((organisation_id IS NULL) AND (archived_at IS NULL))`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "roles_organisation_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("roles_delete_org_custom", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`((organisation_id IS NOT NULL) AND (is_system = false) AND is_org_admin(organisation_id))` }),
	pgPolicy("roles_insert_org_custom", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("roles_select_org_scoped", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("roles_select_platform", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("roles_update_org_custom", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("roles_slug_format_chk", sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text`),
]);

export const menuItems = pgTable("menu_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	name: text().notNull(),
	sectionName: text("section_name").notNull(),
	pluCode: text("plu_code"),
	priceCents: integer("price_cents").default(0).notNull(),
	costPerServeCents: integer("cost_per_serve_cents").default(0).notNull(),
	gpPercent: integer("gp_percent").default(0).notNull(),
	gstMode: text("gst_mode").default('inclusive').notNull(),
	priceMode: text("price_mode").default('fixed').notNull(),
	tags: text().array().default([""]).notNull(),
	showOnMenu: boolean("show_on_menu").default(true).notNull(),
	status: text().default('active').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	groupId: uuid("group_id"),
	squareRaw: jsonb("square_raw"),
}, (table) => [
	index("idx_menu_items_group_id").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")).where(sql`(group_id IS NOT NULL)`),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [menuItemGroups.id],
			name: "menu_items_group_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "menu_items_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "menu_items_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("menu_items_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = menu_items.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("menu_items_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("menu_items_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("menu_items_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const venueSquareOrderLines = pgTable("venue_square_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	squarePaymentId: text("square_payment_id").notNull(),
	squareOrderId: text("square_order_id"),
	squareLineUid: text("square_line_uid").notNull(),
	quantity: numeric().notNull(),
	lineName: text("line_name"),
	squareCatalogObjectId: text("square_catalog_object_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	grossAmountCents: bigint("gross_amount_cents", { mode: "number" }).default(0).notNull(),
	currency: text().default('AUD').notNull(),
	menuItemId: uuid("menu_item_id"),
	matchSource: text("match_source").default('unmapped').notNull(),
	observedAt: timestamp("observed_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("venue_square_order_lines_venue_observed_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.observedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.menuItemId],
			foreignColumns: [menuItems.id],
			name: "venue_square_order_lines_menu_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_square_order_lines_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_square_order_lines_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_square_order_lines_uq").on(table.venueId, table.squarePaymentId, table.squareLineUid),
	pgPolicy("venue_square_order_lines_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = venue_square_order_lines.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("venue_square_order_lines_match_chk", sql`match_source = ANY (ARRAY['catalog_link'::text, 'name_exact'::text, 'unmapped'::text])`),
]);

export const ingredientOrderBuffers = pgTable("ingredient_order_buffers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	bufferPercent: numeric("buffer_percent", { precision: 5, scale:  2 }).notNull(),
	excludeFromOrderGuide: boolean("exclude_from_order_guide").default(false).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ingredient_order_buffers_venue").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "ingredient_order_buffers_ingredient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "ingredient_order_buffers_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "ingredient_order_buffers_venue_id_fkey"
		}).onDelete("cascade"),
	unique("ingredient_order_buffers_uq").on(table.venueId, table.ingredientId),
	pgPolicy("ingredient_order_buffers_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = ingredient_order_buffers.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = ingredient_order_buffers.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const positions = pgTable("positions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	slug: text().notNull(),
	displayName: text("display_name").notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("positions_venue_list_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	uniqueIndex("positions_venue_slug_uq").using("btree", table.venueId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "positions_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "positions_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("positions_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = positions.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("positions_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("positions_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("positions_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("positions_slug_format_chk", sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text`),
]);

export const suppliers = pgTable("suppliers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id"),
	name: text().notNull(),
	contactPerson: text("contact_person"),
	email: text(),
	phone: text(),
	abn: text(),
	category: text().default('other').notNull(),
	paymentTerms: text("payment_terms"),
	deliveryDays: text("delivery_days"),
	orderMethod: text("order_method"),
	active: boolean().default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	suburb: text(),
	state: text(),
	postcode: text(),
	country: text(),
	isGstRegistered: boolean("is_gst_registered").default(true).notNull(),
	deliverySchedule: jsonb("delivery_schedule").default([]).notNull(),
	scheduleOverrides: jsonb("schedule_overrides").default([]).notNull(),
	haccpCertified: boolean("haccp_certified").default(false).notNull(),
	certificateNumber: text("certificate_number"),
	certificateExpiry: date("certificate_expiry"),
	notes: text(),
	orderingEmail: text("ordering_email"),
	leadTimeDays: integer("lead_time_days").default(3).notNull(),
	minimumOrderCents: integer("minimum_order_cents").default(0).notNull(),
	lateDeliveryGraceDays: integer("late_delivery_grace_days").default(1).notNull(),
	xeroContactId: text("xero_contact_id"),
	detailsSourceInvoiceDate: date("details_source_invoice_date"),
	isInventorySource: boolean("is_inventory_source").default(true).notNull(),
}, (table) => [
	index("idx_suppliers_org_list").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("idx_suppliers_org_venue_list").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.venueId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	uniqueIndex("idx_suppliers_org_xero_contact").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.xeroContactId.asc().nullsLast().op("uuid_ops")).where(sql`((xero_contact_id IS NOT NULL) AND (archived_at IS NULL))`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "suppliers_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "suppliers_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("suppliers_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = auth.uid()) AND (uo.organisation_id = suppliers.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("suppliers_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("suppliers_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("suppliers_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const rosterTemplates = pgTable("roster_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	name: text().notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("roster_templates_venue_list_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "roster_templates_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "roster_templates_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("roster_templates_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = roster_templates.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("roster_templates_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("roster_templates_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("roster_templates_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const rosterTemplateShifts = pgTable("roster_template_shifts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	dayOfWeek: smallint("day_of_week").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	breakMinutes: integer("break_minutes").default(0).notNull(),
	positionId: uuid("position_id").notNull(),
	userProfileId: uuid("user_profile_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("roster_template_shifts_template_idx").using("btree", table.templateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "roster_template_shifts_position_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [rosterTemplates.id],
			name: "roster_template_shifts_template_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "roster_template_shifts_user_profile_id_fkey"
		}).onDelete("set null"),
	pgPolicy("roster_template_shifts_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (roster_templates t
     JOIN user_organisations uo ON ((uo.organisation_id = t.organisation_id)))
  WHERE ((t.id = roster_template_shifts.template_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("roster_template_shifts_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("roster_template_shifts_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("roster_template_shifts_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("roster_template_shifts_break_chk", sql`break_minutes >= 0`),
	check("roster_template_shifts_day_chk", sql`(day_of_week >= 0) AND (day_of_week <= 6)`),
]);

export const dashboardUserPreferences = pgTable("dashboard_user_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	timeWindow: text("time_window").default('today').notNull(),
	venueScopeMode: text("venue_scope_mode").default('all').notNull(),
	selectedVenueIds: uuid("selected_venue_ids").array(),
	customRangeStart: date("custom_range_start"),
	customRangeEnd: date("custom_range_end"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("dashboard_user_preferences_org_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "dashboard_user_preferences_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "dashboard_user_preferences_user_profile_id_fkey"
		}).onDelete("cascade"),
	unique("dashboard_user_preferences_user_org_uq").on(table.userProfileId, table.organisationId),
	pgPolicy("dashboard_user_preferences_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`((user_profile_id = ( SELECT auth.uid() AS uid)) AND (organisation_id IN ( SELECT current_user_org_ids() AS current_user_org_ids)))` }),
	pgPolicy("dashboard_user_preferences_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("dashboard_user_preferences_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("dashboard_user_preferences_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("dashboard_user_preferences_custom_range_chk", sql`((time_window <> 'custom'::text) AND (custom_range_start IS NULL) AND (custom_range_end IS NULL)) OR ((time_window = 'custom'::text) AND (custom_range_start IS NOT NULL) AND (custom_range_end IS NOT NULL) AND (custom_range_end >= custom_range_start))`),
	check("dashboard_user_preferences_time_window_chk", sql`time_window = ANY (ARRAY['today'::text, 'yesterday'::text, 'this_week'::text, 'last_week'::text, 'this_month'::text, 'last_month'::text, 'custom'::text])`),
	check("dashboard_user_preferences_venue_scope_chk", sql`venue_scope_mode = ANY (ARRAY['all'::text, 'single'::text, 'selected'::text])`),
]);

export const agentDigestCache = pgTable("agent_digest_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	digestDate: date("digest_date").notNull(),
	bodyMd: text("body_md").notNull(),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("agent_digest_cache_lookup_idx").using("btree", table.userProfileId.asc().nullsLast().op("date_ops"), table.organisationId.asc().nullsLast().op("uuid_ops"), table.digestDate.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "agent_digest_cache_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "agent_digest_cache_user_profile_id_fkey"
		}).onDelete("cascade"),
	unique("agent_digest_cache_user_org_day_uq").on(table.userProfileId, table.organisationId, table.digestDate),
	pgPolicy("agent_digest_cache_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`((user_profile_id = ( SELECT auth.uid() AS uid)) AND (organisation_id IN ( SELECT current_user_org_ids() AS current_user_org_ids)))` }),
	pgPolicy("agent_digest_cache_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("agent_digest_cache_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("agent_digest_cache_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const venueStaffWeeklyAvailability = pgTable("venue_staff_weekly_availability", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	dayOfWeek: smallint("day_of_week").notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	availableStartTime: time("available_start_time"),
	availableEndTime: time("available_end_time"),
}, (table) => [
	index("venue_staff_weekly_availability_venue_list_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("venue_staff_weekly_availability_venue_user_dow_uq").using("btree", table.venueId.asc().nullsLast().op("uuid_ops"), table.userProfileId.asc().nullsLast().op("int2_ops"), table.dayOfWeek.asc().nullsLast().op("int2_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_staff_weekly_availability_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "venue_staff_weekly_availability_user_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "venue_staff_weekly_availability_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("venue_staff_weekly_availability_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = venue_staff_weekly_availability.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("venue_staff_weekly_availability_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("venue_staff_weekly_availability_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("venue_staff_weekly_availability_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("venue_staff_weekly_availability_day_chk", sql`(day_of_week >= 0) AND (day_of_week <= 6)`),
]);

export const insightsAlerts = pgTable("insights_alerts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id"),
	module: text().notNull(),
	severity: text().default('notable').notNull(),
	headline: text().notNull(),
	supportingMetric: text("supporting_metric"),
	destinationKey: text("destination_key"),
	destinationPayload: jsonb("destination_payload"),
	detectedAt: timestamp("detected_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: 'string' }),
	dismissedBy: uuid("dismissed_by"),
	sourceRunId: text("source_run_id"),
}, (table) => [
	index("insights_alerts_venue_active_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.detectedAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(dismissed_at IS NULL)`),
	foreignKey({
			columns: [table.dismissedBy],
			foreignColumns: [usersInAuth.id],
			name: "insights_alerts_dismissed_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "insights_alerts_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "insights_alerts_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("insights_alerts_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = insights_alerts.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND ((insights_alerts.venue_id IS NULL) OR (EXISTS ( SELECT 1
           FROM user_venues uv
          WHERE ((uv.venue_id = insights_alerts.venue_id) AND (uv.user_organisation_id = uo.id) AND (uv.is_active = true) AND (uv.archived_at IS NULL))))))))` }),
	pgPolicy("insights_alerts_update_dismiss", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("insights_alerts_module_chk", sql`module = ANY (ARRAY['sales'::text, 'labour'::text, 'inventory'::text, 'forecast'::text])`),
	check("insights_alerts_severity_chk", sql`severity = ANY (ARRAY['urgent'::text, 'notable'::text, 'informational'::text])`),
]);

export const venueXeroConnections = pgTable("venue_xero_connections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	xeroTenantId: text("xero_tenant_id").notNull(),
	xeroTenantName: text("xero_tenant_name"),
	xeroAccessToken: text("xero_access_token").notNull(),
	xeroRefreshToken: text("xero_refresh_token").notNull(),
	tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastInvoiceSyncAt: timestamp("last_invoice_sync_at", { withTimezone: true, mode: 'string' }),
	lastInvoiceSyncError: text("last_invoice_sync_error"),
	lastSupplierSyncAt: timestamp("last_supplier_sync_at", { withTimezone: true, mode: 'string' }),
	lastSupplierSyncError: text("last_supplier_sync_error"),
}, (table) => [
	index("venue_xero_connections_org_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_xero_connections_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_xero_connections_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_xero_connections_venue_uq").on(table.venueId),
	pgPolicy("venue_xero_connections_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`is_org_admin(organisation_id)` }),
	pgPolicy("venue_xero_connections_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("venue_xero_connections_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("venue_xero_connections_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const organisationPurchasingSettings = pgTable("organisation_purchasing_settings", {
	organisationId: uuid("organisation_id").primaryKey().notNull(),
	defaultBufferPercent: numeric("default_buffer_percent", { precision: 5, scale:  2 }).default('15').notNull(),
	poApprovalThresholdCents: integer("po_approval_threshold_cents").default(50000).notNull(),
	gstTreatment: text("gst_treatment").default('exclusive').notNull(),
	poEmailTemplate: text("po_email_template"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	invoiceApprovalThresholdCents: integer("invoice_approval_threshold_cents").default(250000).notNull(),
	stockCountLargeVarianceCents: integer("stock_count_large_variance_cents").default(50000).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "organisation_purchasing_settings_organisation_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("organisation_purchasing_settings_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = organisation_purchasing_settings.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("organisation_purchasing_settings_gst_chk", sql`gst_treatment = ANY (ARRAY['inclusive'::text, 'exclusive'::text])`),
]);

export const inventorySetupImportJobs = pgTable("inventory_setup_import_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	createdByUserId: uuid("created_by_user_id").notNull(),
	status: text().default('pending').notNull(),
	currentStepId: text("current_step_id"),
	steps: jsonb().default([]).notNull(),
	result: jsonb(),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	jobType: text("job_type").default('xero').notNull(),
}, (table) => [
	index("inventory_setup_import_jobs_venue_created_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("inventory_setup_import_jobs_venue_type_active_idx").using("btree", table.venueId.asc().nullsLast().op("text_ops"), table.jobType.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(status = ANY (ARRAY['pending'::text, 'running'::text]))`),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [userProfiles.id],
			name: "inventory_setup_import_jobs_created_by_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "inventory_setup_import_jobs_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "inventory_setup_import_jobs_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("inventory_setup_import_jobs_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`((created_by_user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = inventory_setup_import_jobs.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL)))))`  }),
	pgPolicy("inventory_setup_import_jobs_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("inventory_setup_import_jobs_job_type_check", sql`job_type = ANY (ARRAY['xero'::text, 'square_catalog'::text])`),
	check("inventory_setup_import_jobs_status_check", sql`status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])`),
]);

export const venueStaffWeekInstanceAvailability = pgTable("venue_staff_week_instance_availability", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	weekStartMonday: date("week_start_monday").notNull(),
	dayOfWeek: smallint("day_of_week").notNull(),
	isAvailable: boolean("is_available").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	availableStartTime: time("available_start_time"),
	availableEndTime: time("available_end_time"),
}, (table) => [
	uniqueIndex("venue_staff_week_instance_availability_uq").using("btree", table.venueId.asc().nullsLast().op("int2_ops"), table.userProfileId.asc().nullsLast().op("int2_ops"), table.weekStartMonday.asc().nullsLast().op("int2_ops"), table.dayOfWeek.asc().nullsLast().op("int2_ops")),
	index("venue_staff_week_instance_availability_week_lookup_idx").using("btree", table.venueId.asc().nullsLast().op("date_ops"), table.weekStartMonday.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_staff_week_instance_availability_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "venue_staff_week_instance_availability_user_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "venue_staff_week_instance_availability_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("venue_staff_week_instance_availability_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = venue_staff_week_instance_availability.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("venue_staff_week_instance_availability_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("venue_staff_week_instance_availability_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("venue_staff_week_instance_availability_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("venue_staff_week_instance_availability_day_chk", sql`(day_of_week >= 0) AND (day_of_week <= 6)`),
]);

export const purchaseOrderEmails = pgTable("purchase_order_emails", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	direction: text().notNull(),
	fromAddress: text("from_address").notNull(),
	toAddress: text("to_address").notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	attachments: jsonb().default([]).notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }),
	providerMessageId: text("provider_message_id"),
}, (table) => [
	index("idx_purchase_order_emails_po").using("btree", table.poId.asc().nullsLast().op("timestamptz_ops"), table.sentAt.desc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_emails_po_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("purchase_order_emails_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_emails.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_emails.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("purchase_order_emails_direction_check", sql`direction = ANY (ARRAY['outbound'::text, 'inbound'::text])`),
]);

export const purchaseOrderLines = pgTable("purchase_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	supplierProductId: uuid("supplier_product_id"),
	ingredientId: uuid("ingredient_id"),
	productName: text("product_name").notNull(),
	quantityOrdered: numeric("quantity_ordered").default('0').notNull(),
	quantityReceived: numeric("quantity_received").default('0').notNull(),
	unitPriceCents: integer("unit_price_cents").default(0).notNull(),
	subtotalCents: integer("subtotal_cents").default(0).notNull(),
	notes: text(),
	isOutstanding: boolean("is_outstanding").default(false).notNull(),
	outstandingResolution: text("outstanding_resolution"),
	expectedDeliveryDate: date("expected_delivery_date"),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_purchase_order_lines_po").using("btree", table.poId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "purchase_order_lines_ingredient_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_lines_po_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierProductId],
			foreignColumns: [supplierProducts.id],
			name: "purchase_order_lines_supplier_product_id_fkey"
		}).onDelete("set null"),
	pgPolicy("purchase_order_lines_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_lines.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_lines.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const purchaseOrderReceivingEvents = pgTable("purchase_order_receiving_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	receivedByUserId: uuid("received_by_user_id"),
	quantitiesReceived: jsonb("quantities_received").default({}).notNull(),
	notes: text(),
	overReceiptResolution: jsonb("over_receipt_resolution"),
}, (table) => [
	index("idx_po_receiving_events_po").using("btree", table.poId.asc().nullsLast().op("timestamptz_ops"), table.receivedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_receiving_events_po_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("purchase_order_receiving_events_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_receiving_events.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_receiving_events.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	supplierId: uuid("supplier_id").notNull(),
	poNumber: text("po_number").notNull(),
	status: text().default('draft').notNull(),
	expectedDeliveryDate: date("expected_delivery_date"),
	actualDeliveryDate: date("actual_delivery_date"),
	subtotalCents: integer("subtotal_cents").default(0).notNull(),
	gstCents: integer("gst_cents").default(0).notNull(),
	totalCents: integer("total_cents").default(0).notNull(),
	gstTreatment: text("gst_treatment").default('exclusive').notNull(),
	notes: text(),
	partialDeliveryFlag: boolean("partial_delivery_flag").default(false).notNull(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancellationReason: text("cancellation_reason"),
	approvalStatus: text("approval_status"),
	approvedByUserId: uuid("approved_by_user_id"),
	approvalComment: text("approval_comment"),
	rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: 'string' }),
	linkedInvoiceId: uuid("linked_invoice_id"),
}, (table) => [
	index("idx_purchase_orders_supplier").using("btree", table.supplierId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_purchase_orders_venue_status").using("btree", table.venueId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "purchase_orders_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchase_orders_supplier_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "purchase_orders_venue_id_fkey"
		}).onDelete("cascade"),
	unique("purchase_orders_venue_po_number_uq").on(table.venueId, table.poNumber),
	pgPolicy("purchase_orders_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = purchase_orders.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = purchase_orders.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("purchase_orders_status_chk", sql`status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'submitted'::text, 'confirmed'::text, 'delivered'::text, 'closed'::text, 'cancelled'::text])`),
]);

export const purchaseOrderAuditLog = pgTable("purchase_order_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	eventType: text("event_type").notNull(),
	beforeValue: jsonb("before_value"),
	afterValue: jsonb("after_value"),
	changedByUserId: uuid("changed_by_user_id"),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_purchase_order_audit_po").using("btree", table.poId.asc().nullsLast().op("timestamptz_ops"), table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_audit_log_po_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("purchase_order_audit_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM (purchase_orders po
     JOIN user_organisations uo ON ((uo.organisation_id = po.organisation_id)))
  WHERE ((po.id = purchase_order_audit_log.po_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("purchase_order_audit_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const orderGuideCache = pgTable("order_guide_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	computedAt: timestamp("computed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	forecastHorizonDays: integer("forecast_horizon_days").notNull(),
	periodPreset: text("period_preset").default('lead_time').notNull(),
	suggestions: jsonb().default([]).notNull(),
	meta: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "order_guide_cache_venue_id_fkey"
		}).onDelete("cascade"),
	unique("order_guide_cache_venue_uq").on(table.venueId),
	pgPolicy("order_guide_cache_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = order_guide_cache.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("order_guide_cache_upsert", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const venueInvoiceLineItems = pgTable("venue_invoice_line_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	parsedDescription: text("parsed_description"),
	supplierProductId: uuid("supplier_product_id"),
	ingredientId: uuid("ingredient_id"),
	quantity: numeric(),
	unit: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unitPriceCents: bigint("unit_price_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lineTotalCents: bigint("line_total_cents", { mode: "number" }),
	gstTreatment: text("gst_treatment"),
	isUnmapped: boolean("is_unmapped").default(true).notNull(),
	mappingMethod: text("mapping_method"),
	sortOrder: integer("sort_order").default(0).notNull(),
	notes: text(),
	isLikelyInventory: boolean("is_likely_inventory"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_venue_invoice_line_items_invoice").using("btree", table.invoiceId.asc().nullsLast().op("int4_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "venue_invoice_line_items_ingredient_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [venueInvoices.id],
			name: "venue_invoice_line_items_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_invoice_line_items_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierProductId],
			foreignColumns: [supplierProducts.id],
			name: "venue_invoice_line_items_supplier_product_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_invoice_line_items_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("venue_invoice_line_items_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = venue_invoice_line_items.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("venue_invoice_line_items_write", { as: "permissive", for: "all", to: ["authenticated"] }),
	check("venue_invoice_line_items_mapping_method_chk", sql`(mapping_method IS NULL) OR (mapping_method = ANY (ARRAY['auto'::text, 'manual'::text]))`),
]);

export const invoiceCostChangeEvents = pgTable("invoice_cost_change_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	supplierProductId: uuid("supplier_product_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	oldPriceCents: bigint("old_price_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	newPriceCents: bigint("new_price_cents", { mode: "number" }),
	propagated: boolean().default(false).notNull(),
	affectedRecipeCount: integer("affected_recipe_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_invoice_cost_change_events_invoice").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [venueInvoices.id],
			name: "invoice_cost_change_events_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierProductId],
			foreignColumns: [supplierProducts.id],
			name: "invoice_cost_change_events_supplier_product_id_fkey"
		}).onDelete("set null"),
	pgPolicy("invoice_cost_change_events_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM ((venue_invoices vi
     JOIN venues v ON ((v.id = vi.venue_id)))
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((vi.id = invoice_cost_change_events.invoice_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
]);

export const menuItemGroups = pgTable("menu_item_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	squareItemId: text("square_item_id").notNull(),
	name: text().notNull(),
	sectionName: text("section_name").default('Uncategorised').notNull(),
	description: text(),
	squareRaw: jsonb("square_raw"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_menu_item_groups_org_venue").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "menu_item_groups_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "menu_item_groups_venue_id_fkey"
		}).onDelete("cascade"),
	unique("menu_item_groups_venue_square_item_uq").on(table.venueId, table.squareItemId),
	pgPolicy("menu_item_groups_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = menu_item_groups.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = menu_item_groups.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const venueModifierLists = pgTable("venue_modifier_lists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	squareModifierListId: text("square_modifier_list_id").notNull(),
	name: text().notNull(),
	selectionType: text("selection_type").default('multi').notNull(),
	minSelected: integer("min_selected"),
	maxSelected: integer("max_selected"),
	squareRaw: jsonb("square_raw"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_venue_modifier_lists_org_venue").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_modifier_lists_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_modifier_lists_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_modifier_lists_venue_square_uq").on(table.venueId, table.squareModifierListId),
	pgPolicy("venue_modifier_lists_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_modifier_lists.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_modifier_lists.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("venue_modifier_lists_selection_type_check", sql`selection_type = ANY (ARRAY['single'::text, 'multi'::text])`),
]);

export const venueModifiers = pgTable("venue_modifiers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	modifierListId: uuid("modifier_list_id").notNull(),
	squareModifierId: text("square_modifier_id").notNull(),
	name: text().notNull(),
	priceCents: integer("price_cents").default(0).notNull(),
	squareRaw: jsonb("square_raw"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_venue_modifiers_list").using("btree", table.modifierListId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.modifierListId],
			foreignColumns: [venueModifierLists.id],
			name: "venue_modifiers_modifier_list_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_modifiers_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_modifiers_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_modifiers_venue_square_uq").on(table.venueId, table.squareModifierId),
	pgPolicy("venue_modifiers_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_modifiers.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_modifiers.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const menuItemGroupModifierLists = pgTable("menu_item_group_modifier_lists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	groupId: uuid("group_id").notNull(),
	modifierListId: uuid("modifier_list_id").notNull(),
	enabled: boolean().default(true).notNull(),
	minSelected: integer("min_selected"),
	maxSelected: integer("max_selected"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_menu_item_group_modifier_lists_group").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("idx_menu_item_group_modifier_lists_list").using("btree", table.modifierListId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [menuItemGroups.id],
			name: "menu_item_group_modifier_lists_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.modifierListId],
			foreignColumns: [venueModifierLists.id],
			name: "menu_item_group_modifier_lists_modifier_list_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "menu_item_group_modifier_lists_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "menu_item_group_modifier_lists_venue_id_fkey"
		}).onDelete("cascade"),
	unique("menu_item_group_modifier_lists_uq").on(table.groupId, table.modifierListId),
	pgPolicy("menu_item_group_modifier_lists_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = menu_item_group_modifier_lists.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = menu_item_group_modifier_lists.organisation_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const venueEmailInboxes = pgTable("venue_email_inboxes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	address: text().notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_email_inboxes_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_email_inboxes_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_email_inboxes_venue_uq").on(table.venueId),
	unique("venue_email_inboxes_address_uq").on(table.address),
	pgPolicy("venue_email_inboxes_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_email_inboxes.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("venue_email_inboxes_status_chk", sql`status = ANY (ARRAY['active'::text, 'suspended'::text])`),
]);

export const venueInvoiceAttachments = pgTable("venue_invoice_attachments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	fileName: text("file_name").notNull(),
	mimeType: text("mime_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contentLength: bigint("content_length", { mode: "number" }),
	storagePath: text("storage_path").notNull(),
	source: text().default('upload').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_venue_invoice_attachments_invoice").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [venueInvoices.id],
			name: "venue_invoice_attachments_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_invoice_attachments_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_invoice_attachments_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("venue_invoice_attachments_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = venue_invoice_attachments.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("venue_invoice_attachments_source_chk", sql`source = ANY (ARRAY['upload'::text, 'email'::text, 'xero'::text])`),
]);

export const venueInvoiceAuditLog = pgTable("venue_invoice_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	eventType: text("event_type").notNull(),
	beforeValue: jsonb("before_value"),
	afterValue: jsonb("after_value"),
	changedByUserId: uuid("changed_by_user_id"),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_venue_invoice_audit_invoice").using("btree", table.invoiceId.asc().nullsLast().op("timestamptz_ops"), table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [venueInvoices.id],
			name: "venue_invoice_audit_log_invoice_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("venue_invoice_audit_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM ((venue_invoices vi
     JOIN venues v ON ((v.id = vi.venue_id)))
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((vi.id = venue_invoice_audit_log.invoice_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("venue_invoice_audit_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const venueInvoices = pgTable("venue_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	xeroInvoiceId: uuid("xero_invoice_id"),
	invoiceNumber: text("invoice_number"),
	supplierName: text("supplier_name"),
	xeroContactId: text("xero_contact_id"),
	invoiceDate: date("invoice_date"),
	dueDate: date("due_date"),
	documentType: text("document_type").default('invoice').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalCents: bigint("total_cents", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amountDueCents: bigint("amount_due_cents", { mode: "number" }),
	currencyCode: text("currency_code").default('AUD').notNull(),
	xeroStatus: text("xero_status").notNull(),
	reviewStatus: text("review_status").default('pending_review').notNull(),
	source: text().default('xero').notNull(),
	reference: text(),
	xeroUpdatedAt: timestamp("xero_updated_at", { withTimezone: true, mode: 'string' }),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	supplierId: uuid("supplier_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subtotalCents: bigint("subtotal_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gstCents: bigint("gst_cents", { mode: "number" }),
	gstTreatment: text("gst_treatment"),
	parseConfidence: text("parse_confidence"),
	matchMethod: text("match_method"),
	disputeReason: text("dispute_reason"),
	disputeNotes: text("dispute_notes"),
	notes: text(),
	attachmentStoragePath: text("attachment_storage_path"),
	emailMessageId: uuid("email_message_id"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	confirmedByUserId: uuid("confirmed_by_user_id"),
	disputedAt: timestamp("disputed_at", { withTimezone: true, mode: 'string' }),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	attachmentParsedAt: timestamp("attachment_parsed_at", { withTimezone: true, mode: 'string' }),
	attachmentParseFingerprint: text("attachment_parse_fingerprint"),
	attachmentParseError: text("attachment_parse_error"),
}, (table) => [
	index("venue_invoices_org_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")),
	index("venue_invoices_po_idx").using("btree", table.purchaseOrderId.asc().nullsLast().op("uuid_ops")).where(sql`(purchase_order_id IS NOT NULL)`),
	index("venue_invoices_review_status_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops"), table.reviewStatus.asc().nullsLast().op("uuid_ops")),
	index("venue_invoices_supplier_idx").using("btree", table.supplierId.asc().nullsLast().op("uuid_ops")).where(sql`(supplier_id IS NOT NULL)`),
	index("venue_invoices_venue_date_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops"), table.invoiceDate.desc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_invoices_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrders.id],
			name: "venue_invoices_purchase_order_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "venue_invoices_supplier_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_invoices_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_invoices_venue_xero_uq").on(table.venueId, table.xeroInvoiceId),
	pgPolicy("venue_invoices_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = venue_invoices.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("venue_invoices_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("venue_invoices_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("venue_invoices_document_type_chk", sql`document_type = ANY (ARRAY['invoice'::text, 'credit_note'::text])`),
	check("venue_invoices_gst_treatment_chk", sql`(gst_treatment IS NULL) OR (gst_treatment = ANY (ARRAY['inclusive'::text, 'exclusive'::text, 'mixed'::text]))`),
	check("venue_invoices_match_method_chk", sql`(match_method IS NULL) OR (match_method = ANY (ARRAY['auto'::text, 'manual'::text, 'standalone'::text]))`),
	check("venue_invoices_parse_confidence_chk", sql`(parse_confidence IS NULL) OR (parse_confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))`),
	check("venue_invoices_review_status_chk", sql`review_status = ANY (ARRAY['pending_review'::text, 'pending_approval'::text, 'confirmed'::text, 'disputed'::text, 'duplicate'::text, 'archived'::text])`),
	check("venue_invoices_source_chk", sql`source = ANY (ARRAY['xero'::text, 'upload'::text, 'email'::text])`),
]);

export const rosterShifts = pgTable("roster_shifts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	userProfileId: uuid("user_profile_id"),
	positionId: uuid("position_id").notNull(),
	breakMinutes: integer("break_minutes").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }).notNull(),
	lifecycle: rosterShiftLifecycle().default('published').notNull(),
	source: rosterShiftSource().default('manual').notNull(),
	templateId: uuid("template_id"),
	awardCode: text("award_code"),
	computedCostCents: integer("computed_cost_cents"),
	baseCostCents: integer("base_cost_cents"),
	penaltyCostCents: integer("penalty_cost_cents"),
	rosterWeekId: uuid("roster_week_id"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	publishedBy: uuid("published_by"),
	clockedStartsAt: timestamp("clocked_starts_at", { withTimezone: true, mode: 'string' }),
	clockedEndsAt: timestamp("clocked_ends_at", { withTimezone: true, mode: 'string' }),
	clockedBreakMinutes: integer("clocked_break_minutes"),
}, (table) => [
	index("roster_shifts_venue_draft_starts_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.startsAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(lifecycle = 'draft'::roster_shift_lifecycle)`),
	index("roster_shifts_venue_overlap_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.startsAt.asc().nullsLast().op("uuid_ops"), table.endsAt.asc().nullsLast().op("timestamptz_ops")),
	index("roster_shifts_venue_published_starts_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.startsAt.asc().nullsLast().op("uuid_ops")).where(sql`(lifecycle = 'published'::roster_shift_lifecycle)`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "roster_shifts_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "roster_shifts_position_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.publishedBy],
			foreignColumns: [userProfiles.id],
			name: "roster_shifts_published_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.rosterWeekId],
			foreignColumns: [rosterWeeks.id],
			name: "roster_shifts_roster_week_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [rosterTemplates.id],
			name: "roster_shifts_template_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "roster_shifts_user_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "roster_shifts_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("roster_shifts_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = roster_shifts.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("roster_shifts_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("roster_shifts_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("roster_shifts_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("roster_shifts_break_non_negative_chk", sql`break_minutes >= 0`),
	check("roster_shifts_time_order_chk", sql`ends_at > starts_at`),
]);

export const supplierProductPriceHistory = pgTable("supplier_product_price_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	supplierProductId: uuid("supplier_product_id").notNull(),
	oldPriceCents: integer("old_price_cents"),
	newPriceCents: integer("new_price_cents").notNull(),
	source: text().notNull(),
	sourceRef: text("source_ref"),
	changedByUserId: uuid("changed_by_user_id"),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supplier_product_price_history_product").using("btree", table.supplierProductId.asc().nullsLast().op("timestamptz_ops"), table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "supplier_product_price_history_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierProductId],
			foreignColumns: [supplierProducts.id],
			name: "supplier_product_price_history_supplier_product_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("supplier_product_price_history_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = supplier_product_price_history.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = supplier_product_price_history.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("supplier_product_price_history_source_chk", sql`source = ANY (ARRAY['manual_edit'::text, 'invoice'::text, 'xero_sync'::text, 'bulk_import'::text, 'active_switch'::text])`),
]);

export const inboundEmailLog = pgTable("inbound_email_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	inboxId: uuid("inbox_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	fromAddress: text("from_address").notNull(),
	subject: text(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: text().default('received').notNull(),
	parseResult: jsonb("parse_result"),
	linkedInvoiceId: uuid("linked_invoice_id"),
	rawBlobPath: text("raw_blob_path"),
}, (table) => [
	index("idx_inbound_email_log_venue").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.receivedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.inboxId],
			foreignColumns: [venueEmailInboxes.id],
			name: "inbound_email_log_inbox_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.linkedInvoiceId],
			foreignColumns: [venueInvoices.id],
			name: "inbound_email_log_linked_invoice_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "inbound_email_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "inbound_email_log_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("inbound_email_log_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = inbound_email_log.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("inbound_email_log_status_chk", sql`status = ANY (ARRAY['received'::text, 'parsed'::text, 'failed'::text, 'non_invoice'::text, 'spam'::text])`),
]);

export const rosterWeeks = pgTable("roster_weeks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	weekStart: date("week_start").notNull(),
	state: text().default('draft').notNull(),
	targetLabourPct: numeric("target_labour_pct", { precision: 5, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	forecastSalesCents: bigint("forecast_sales_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	labourBudgetCents: bigint("labour_budget_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalCostCents: bigint("total_cost_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalBaseCostCents: bigint("total_base_cost_cents", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalPenaltyCostCents: bigint("total_penalty_cost_cents", { mode: "number" }),
	splhPlanned: numeric("splh_planned", { precision: 12, scale:  4 }),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	publishedBy: uuid("published_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("roster_weeks_venue_week_idx").using("btree", table.venueId.asc().nullsLast().op("date_ops"), table.weekStart.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "roster_weeks_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.publishedBy],
			foreignColumns: [userProfiles.id],
			name: "roster_weeks_published_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "roster_weeks_venue_org_fk"
		}).onDelete("cascade"),
	unique("roster_weeks_venue_week_uq").on(table.venueId, table.weekStart),
	pgPolicy("roster_weeks_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = auth.uid()) AND (uo.organisation_id = roster_weeks.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("roster_weeks_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("roster_weeks_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("roster_weeks_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("roster_weeks_state_check", sql`state = ANY (ARRAY['draft'::text, 'published'::text, 'modified'::text])`),
]);

export const shiftComplianceFlags = pgTable("shift_compliance_flags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shiftId: uuid("shift_id").notNull(),
	rule: shiftComplianceRule().notNull(),
	tier: shiftComplianceTier().notNull(),
	message: text().notNull(),
	overridden: boolean().default(false).notNull(),
	overrideReason: text("override_reason"),
	overrideBy: uuid("override_by"),
	overrideAt: timestamp("override_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shift_compliance_flags_shift_idx").using("btree", table.shiftId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.overrideBy],
			foreignColumns: [userProfiles.id],
			name: "shift_compliance_flags_override_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [rosterShifts.id],
			name: "shift_compliance_flags_shift_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("shift_compliance_flags_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (roster_shifts rs
     JOIN user_organisations uo ON ((uo.organisation_id = rs.organisation_id)))
  WHERE ((rs.id = shift_compliance_flags.shift_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("shift_compliance_flags_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("shift_compliance_flags_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("shift_compliance_flags_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const rosterPublishDeliveries = pgTable("roster_publish_deliveries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	rosterWeekId: uuid("roster_week_id").notNull(),
	userProfileId: uuid("user_profile_id"),
	channel: text().notNull(),
	status: text().default('pending').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	error: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("roster_publish_deliveries_week_idx").using("btree", table.rosterWeekId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.rosterWeekId],
			foreignColumns: [rosterWeeks.id],
			name: "roster_publish_deliveries_roster_week_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "roster_publish_deliveries_user_profile_id_fkey"
		}).onDelete("set null"),
	pgPolicy("roster_publish_deliveries_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM (roster_weeks rw
     JOIN user_organisations uo ON ((uo.organisation_id = rw.organisation_id)))
  WHERE ((rw.id = roster_publish_deliveries.roster_week_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("roster_publish_deliveries_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("roster_publish_deliveries_channel_check", sql`channel = ANY (ARRAY['email'::text, 'pdf'::text])`),
]);

export const shiftBreaks = pgTable("shift_breaks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shiftId: uuid("shift_id").notNull(),
	breakType: text("break_type").notNull(),
	minutes: integer().notNull(),
	taken: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shift_breaks_shift_idx").using("btree", table.shiftId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [rosterShifts.id],
			name: "shift_breaks_shift_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("shift_breaks_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM (roster_shifts rs
     JOIN user_organisations uo ON ((uo.organisation_id = rs.organisation_id)))
  WHERE ((rs.id = shift_breaks.shift_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("shift_breaks_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("shift_breaks_break_type_check", sql`break_type = ANY (ARRAY['meal_unpaid'::text, 'rest_paid'::text])`),
	check("shift_breaks_minutes_check", sql`minutes >= 0`),
]);

export const leaveTypes = pgTable("leave_types", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	code: text().notNull(),
	name: text().notNull(),
	isPaid: boolean("is_paid").default(true).notNull(),
	isAccruable: boolean("is_accruable").default(true).notNull(),
	accrualRatePct: numeric("accrual_rate_pct", { precision: 6, scale:  3 }),
	accrualBasis: leaveAccrualBasis("accrual_basis").default('hours_worked').notNull(),
	defaultApprovalRole: leaveApprovalRole("default_approval_role").default('manager').notNull(),
	isPerOccasion: boolean("is_per_occasion").default(false).notNull(),
	isPrivate: boolean("is_private").default(false).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("leave_types_org_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "leave_types_organisation_id_fkey"
		}).onDelete("cascade"),
	unique("leave_types_org_code_uq").on(table.organisationId, table.code),
	pgPolicy("leave_types_manage", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_admin(organisation_id)`, withCheck: sql`is_org_admin(organisation_id)`  }),
	pgPolicy("leave_types_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const leaveBalances = pgTable("leave_balances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	leaveTypeId: uuid("leave_type_id").notNull(),
	currentBalanceHours: numeric("current_balance_hours", { precision: 10, scale:  2 }).default('0').notNull(),
	accruedLifetimeHours: numeric("accrued_lifetime_hours", { precision: 12, scale:  2 }).default('0').notNull(),
	usedLifetimeHours: numeric("used_lifetime_hours", { precision: 12, scale:  2 }).default('0').notNull(),
	lastAccrualAt: timestamp("last_accrual_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("leave_balances_user_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.userProfileId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_balances_leave_type_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "leave_balances_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "leave_balances_user_profile_id_fkey"
		}).onDelete("cascade"),
	unique("leave_balances_uq").on(table.organisationId, table.userProfileId, table.leaveTypeId),
	pgPolicy("leave_balances_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`((user_profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = leave_balances.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL)))))` }),
	pgPolicy("leave_balances_write", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const leaveRequests = pgTable("leave_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	leaveTypeId: uuid("leave_type_id").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	startTime: time("start_time"),
	endTime: time("end_time"),
	totalHours: numeric("total_hours", { precision: 10, scale:  2 }).notNull(),
	isPaid: boolean("is_paid").notNull(),
	paidHours: numeric("paid_hours", { precision: 10, scale:  2 }).default('0').notNull(),
	unpaidHours: numeric("unpaid_hours", { precision: 10, scale:  2 }).default('0').notNull(),
	reason: text(),
	commentsToManager: text("comments_to_manager"),
	status: leaveRequestStatus().default('pending').notNull(),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	decidedByUserId: uuid("decided_by_user_id"),
	decisionReason: text("decision_reason"),
	rosterResolution: jsonb("roster_resolution"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("leave_requests_approved_range_idx").using("btree", table.organisationId.asc().nullsLast().op("date_ops"), table.userProfileId.asc().nullsLast().op("uuid_ops"), table.startDate.asc().nullsLast().op("uuid_ops"), table.endDate.asc().nullsLast().op("date_ops")).where(sql`(status = 'approved'::leave_request_status)`),
	index("leave_requests_user_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.userProfileId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("leave_requests_venue_status_idx").using("btree", table.venueId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops"), table.startDate.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.decidedByUserId],
			foreignColumns: [userProfiles.id],
			name: "leave_requests_decided_by_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_requests_leave_type_id_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "leave_requests_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "leave_requests_user_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "leave_requests_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("leave_requests_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`((user_profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((user_venues uv
     JOIN user_organisations uo ON ((uo.id = uv.user_organisation_id)))
     JOIN roles r ON ((r.id = uo.role_id)))
  WHERE ((uv.venue_id = leave_requests.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND (uv.is_active = true) AND (uv.archived_at IS NULL) AND (r.slug = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'supervisor'::text]))))))`  }),
	pgPolicy("leave_requests_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("leave_requests_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("leave_requests_dates_chk", sql`end_date >= start_date`),
	check("leave_requests_hours_split_chk", sql`(paid_hours + unpaid_hours) = total_hours`),
]);

export const leaveAuditLog = pgTable("leave_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	leaveRequestId: uuid("leave_request_id"),
	userProfileId: uuid("user_profile_id").notNull(),
	changeType: text("change_type").notNull(),
	beforeState: jsonb("before_state"),
	afterState: jsonb("after_state"),
	actorUserId: uuid("actor_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("leave_audit_log_subject_idx").using("btree", table.organisationId.asc().nullsLast().op("timestamptz_ops"), table.userProfileId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [userProfiles.id],
			name: "leave_audit_log_actor_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leaveRequestId],
			foreignColumns: [leaveRequests.id],
			name: "leave_audit_log_leave_request_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "leave_audit_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "leave_audit_log_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("leave_audit_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = leave_audit_log.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("leave_audit_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const lslStateRules = pgTable("lsl_state_rules", {
	state: text().primaryKey().notNull(),
	minYearsService: numeric("min_years_service", { precision: 4, scale:  1 }).notNull(),
	proRataYearsService: numeric("pro_rata_years_service", { precision: 4, scale:  1 }),
	accrualWeeksPerYear: numeric("accrual_weeks_per_year", { precision: 6, scale:  3 }).notNull(),
}, (table) => [
	pgPolicy("lsl_state_rules_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const leaveAccrualEvents = pgTable("leave_accrual_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	leaveTypeId: uuid("leave_type_id").notNull(),
	triggeredBy: leaveAccrualTrigger("triggered_by").notNull(),
	hoursChange: numeric("hours_change", { precision: 10, scale:  2 }).notNull(),
	sourceRef: text("source_ref"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("leave_accrual_events_timesheet_uq").using("btree", table.organisationId.asc().nullsLast().op("text_ops"), table.sourceRef.asc().nullsLast().op("text_ops"), table.triggeredBy.asc().nullsLast().op("text_ops")).where(sql`((triggered_by = 'timesheet_approval'::leave_accrual_trigger) AND (source_ref IS NOT NULL))`),
	index("leave_accrual_events_user_idx").using("btree", table.organisationId.asc().nullsLast().op("timestamptz_ops"), table.userProfileId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_accrual_events_leave_type_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "leave_accrual_events_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "leave_accrual_events_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("leave_accrual_events_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = leave_accrual_events.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("leave_accrual_events_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const payrollLeaveLines = pgTable("payroll_leave_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	leaveRequestId: uuid("leave_request_id"),
	payPeriodStart: date("pay_period_start").notNull(),
	payPeriodEnd: date("pay_period_end").notNull(),
	leaveTypeId: uuid("leave_type_id").notNull(),
	hours: numeric({ precision: 10, scale:  2 }).notNull(),
	rateCents: integer("rate_cents").default(0).notNull(),
	isTerminationPayout: boolean("is_termination_payout").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	payRunId: uuid("pay_run_id"),
}, (table) => [
	index("payroll_leave_lines_user_period_idx").using("btree", table.organisationId.asc().nullsLast().op("date_ops"), table.userProfileId.asc().nullsLast().op("date_ops"), table.payPeriodStart.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.leaveRequestId],
			foreignColumns: [leaveRequests.id],
			name: "payroll_leave_lines_leave_request_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "payroll_leave_lines_leave_type_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "payroll_leave_lines_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payRunId],
			foreignColumns: [payRuns.id],
			name: "payroll_leave_lines_pay_run_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "payroll_leave_lines_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("payroll_leave_lines_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = payroll_leave_lines.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("payroll_leave_lines_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const organisations = pgTable("organisations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	legalName: text("legal_name"),
	abn: text(),
	email: text(),
	phone: text(),
	website: text(),
	logoUrl: text("logo_url"),
	timezone: text().default('Australia/Melbourne').notNull(),
	currency: text().default('AUD').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isGstRegistered: boolean("is_gst_registered").default(false).notNull(),
	leaveOwnerApprovalMinDays: integer("leave_owner_approval_min_days").default(5).notNull(),
	timesheetPayPeriodFrequency: payPeriodFrequency("timesheet_pay_period_frequency").default('fortnightly').notNull(),
	timesheetPeriodStartDow: smallint("timesheet_period_start_dow").default(1).notNull(),
	timesheetMatchToleranceMin: integer("timesheet_match_tolerance_min").default(5).notNull(),
	timesheetOwnerApprovalVarianceMin: integer("timesheet_owner_approval_variance_min").default(120).notNull(),
	timesheetGeolocationEnabled: boolean("timesheet_geolocation_enabled").default(false).notNull(),
	timesheetBreakMode: timesheetBreakMode("timesheet_break_mode").default('explicit_events').notNull(),
	timesheetAutoDeductBreakMin: integer("timesheet_auto_deduct_break_min").default(30).notNull(),
	timesheetAutoDeductAfterHours: numeric("timesheet_auto_deduct_after_hours", { precision: 4, scale:  2 }).default('5').notNull(),
	timesheetRoundingMinutes: integer("timesheet_rounding_minutes").default(0).notNull(),
	timesheetApprovalWindowHours: integer("timesheet_approval_window_hours").default(48).notNull(),
	setupProgress: jsonb("setup_progress").default({}).notNull(),
}, (table) => [
	index("organisations_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(archived_at IS NULL)`),
	uniqueIndex("organisations_slug_uq").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("organisations_admin_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`is_org_admin(id)` }),
	pgPolicy("organisations_admin_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("organisations_admin_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("organisations_insert_authenticated", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("organisations_select_member", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("organisations_slug_format_chk", sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text`),
]);

export const venues = pgTable("venues", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	venueType: text("venue_type").default('restaurant').notNull(),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	suburb: text(),
	state: text(),
	postcode: text(),
	country: text().default('Australia'),
	email: text(),
	phone: text(),
	timezone: text().default('Australia/Melbourne').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	locationLat: numeric("location_lat", { precision: 9, scale:  6 }),
	locationLng: numeric("location_lng", { precision: 9, scale:  6 }),
	geolocationRadiusM: integer("geolocation_radius_m").default(100).notNull(),
	dataStartsFrom: date("data_starts_from"),
	inventorySetupWizardState: jsonb("inventory_setup_wizard_state").default({}).notNull(),
}, (table) => [
	index("venues_org_active_idx").using("btree", table.organisationId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	uniqueIndex("venues_org_slug_uq").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.slug.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venues_organisation_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("venues_admin_manage", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_admin(organisation_id)`, withCheck: sql`is_org_admin(organisation_id)`  }),
	pgPolicy("venues_select_scoped", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("venues_slug_format_chk", sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text`),
	check("venues_venue_type_check", sql`venue_type = ANY (ARRAY['restaurant'::text, 'cafe'::text, 'bar'::text, 'food_truck'::text, 'catering'::text, 'other'::text])`),
]);

export const awards = pgTable("awards", {
	awardCode: text("award_code").primaryKey().notNull(),
	awardName: text("award_name").notNull(),
	awardShortName: text("award_short_name").notNull(),
	currentVersionPrReference: text("current_version_pr_reference").notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveUntil: date("effective_until"),
	sourceUrl: text("source_url").notNull(),
	casualLoadingPct: numeric("casual_loading_pct", { precision: 5, scale:  3 }).default('25.000').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("awards_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const awardClassifications = pgTable("award_classifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code").notNull(),
	classificationLevel: text("classification_level").notNull(),
	classificationGrade: text("classification_grade").default(sql`NULL`).notNull(),
	displayOrder: smallint("display_order").default(0).notNull(),
	description: text().notNull(),
	isJuniorEligible: boolean("is_junior_eligible").default(true).notNull(),
	isLiquorServiceEligible: boolean("is_liquor_service_eligible").default(false).notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "award_classifications_award_code_fkey"
		}).onDelete("cascade"),
	unique("award_classifications_award_code_classification_level_class_key").on(table.awardCode, table.classificationLevel, table.classificationGrade),
	pgPolicy("award_classifications_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const awardRates = pgTable("award_rates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code").notNull(),
	classificationLevel: text("classification_level").notNull(),
	classificationGrade: text("classification_grade").default(sql`NULL`).notNull(),
	employmentType: employmentType("employment_type").notNull(),
	ageBracket: smallint("age_bracket"),
	baseHourlyCents: integer("base_hourly_cents").notNull(),
	casualLoadedHourlyCents: integer("casual_loaded_hourly_cents").notNull(),
	weeklyMinimumCents: integer("weekly_minimum_cents"),
	effectiveFrom: date("effective_from").notNull(),
	effectiveUntil: date("effective_until"),
	sourcePrReference: text("source_pr_reference").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("award_rates_lookup_idx").using("btree", table.awardCode.asc().nullsLast().op("date_ops"), table.classificationLevel.asc().nullsLast().op("enum_ops"), table.classificationGrade.asc().nullsLast().op("text_ops"), table.employmentType.asc().nullsLast().op("text_ops"), table.effectiveFrom.desc().nullsFirst().op("enum_ops")),
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "award_rates_award_code_fkey"
		}).onDelete("cascade"),
	pgPolicy("award_rates_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const penaltyRates = pgTable("penalty_rates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code").notNull(),
	classificationLevel: text("classification_level"),
	employmentTypeScope: penaltyEmploymentScope("employment_type_scope").default('all').notNull(),
	dayType: penaltyDayType("day_type").notNull(),
	timeStart: time("time_start").default('00:00:00').notNull(),
	timeEnd: time("time_end").default('24:00:00').notNull(),
	isOvertime: boolean("is_overtime").default(false).notNull(),
	upliftType: penaltyUpliftType("uplift_type").notNull(),
	upliftValue: numeric("uplift_value", { precision: 10, scale:  4 }).notNull(),
	appliesAfterOrdinaryHours: boolean("applies_after_ordinary_hours").default(false).notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveUntil: date("effective_until"),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "penalty_rates_award_code_fkey"
		}).onDelete("cascade"),
	pgPolicy("penalty_rates_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const juniorRateScales = pgTable("junior_rate_scales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code").notNull(),
	classificationLevel: text("classification_level"),
	age: smallint().notNull(),
	percentageOfAdult: numeric("percentage_of_adult", { precision: 5, scale:  2 }).notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveUntil: date("effective_until"),
}, (table) => [
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "junior_rate_scales_award_code_fkey"
		}).onDelete("cascade"),
	pgPolicy("junior_rate_scales_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	check("junior_rate_scales_age_check", sql`(age >= 16) AND (age <= 20)`),
]);

export const minimumEngagements = pgTable("minimum_engagements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code").notNull(),
	employmentType: employmentType("employment_type").notNull(),
	dayType: text("day_type").default('regular').notNull(),
	minimumHours: numeric("minimum_hours", { precision: 4, scale:  2 }).notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "minimum_engagements_award_code_fkey"
		}).onDelete("cascade"),
	pgPolicy("minimum_engagements_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const awardAllowances = pgTable("award_allowances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code").notNull(),
	allowanceCode: text("allowance_code").notNull(),
	description: text().notNull(),
	amountCents: integer("amount_cents").notNull(),
	unit: text().notNull(),
	conditions: text(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveUntil: date("effective_until"),
	sourcePrReference: text("source_pr_reference"),
}, (table) => [
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "award_allowances_award_code_fkey"
		}).onDelete("cascade"),
	pgPolicy("award_allowances_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const libraryUpdateLog = pgTable("library_update_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	awardCode: text("award_code"),
	updateType: libraryUpdateType("update_type").notNull(),
	affectedRecordCount: integer("affected_record_count").default(0).notNull(),
	sourceReference: text("source_reference").notNull(),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "library_update_log_award_code_fkey"
		}),
	pgPolicy("library_update_log_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const organisationAwardConfig = pgTable("organisation_award_config", {
	organisationId: uuid("organisation_id").primaryKey().notNull(),
	defaultAwardCode: text("default_award_code"),
	isEbaCovered: boolean("is_eba_covered").default(false).notNull(),
	casualLoadingPctOverride: numeric("casual_loading_pct_override", { precision: 5, scale:  3 }),
	annualisedSalaryBufferPct: numeric("annualised_salary_buffer_pct", { precision: 5, scale:  3 }).default('25.000').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	aboveAwardHighIncomeThresholdCents: bigint("above_award_high_income_threshold_cents", { mode: "number" }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.defaultAwardCode],
			foreignColumns: [awards.awardCode],
			name: "organisation_award_config_default_award_code_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "organisation_award_config_organisation_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("organisation_award_config_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (user_organisations uo
     JOIN roles r ON ((r.id = uo.role_id)))
  WHERE ((uo.organisation_id = organisation_award_config.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND (r.grants_org_admin = true))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (user_organisations uo
     JOIN roles r ON ((r.id = uo.role_id)))
  WHERE ((uo.organisation_id = organisation_award_config.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND (r.grants_org_admin = true))))`  }),
	pgPolicy("organisation_award_config_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const awrUpliftEvents = pgTable("awr_uplift_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	awardCode: text("award_code").notNull(),
	awrYear: smallint("awr_year").notNull(),
	effectiveDate: date("effective_date").notNull(),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedByUserId: uuid("applied_by_user_id").notNull(),
	affectedEmployeeCount: integer("affected_employee_count").default(0).notNull(),
	skippedEmployeeCount: integer("skipped_employee_count").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalUpliftCents: bigint("total_uplift_cents", { mode: "number" }),
	sourcePrReference: text("source_pr_reference").notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.appliedByUserId],
			foreignColumns: [userProfiles.id],
			name: "awr_uplift_events_applied_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.awardCode],
			foreignColumns: [awards.awardCode],
			name: "awr_uplift_events_award_code_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "awr_uplift_events_organisation_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("awr_uplift_events_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM (user_organisations uo
     JOIN roles r ON ((r.id = uo.role_id)))
  WHERE ((uo.organisation_id = awr_uplift_events.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND (r.grants_org_admin = true))))`  }),
	pgPolicy("awr_uplift_events_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const employeePayRateHistory = pgTable("employee_pay_rate_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	payRateCents: integer("pay_rate_cents").notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveUntil: date("effective_until"),
	reasonCategory: payRateChangeReason("reason_category").notNull(),
	sourceReference: text("source_reference"),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("employee_pay_rate_history_lookup_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.userProfileId.asc().nullsLast().op("date_ops"), table.effectiveFrom.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [userProfiles.id],
			name: "employee_pay_rate_history_created_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "employee_pay_rate_history_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "employee_pay_rate_history_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("employee_pay_rate_history_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM (user_organisations uo
     JOIN roles r ON ((r.id = uo.role_id)))
  WHERE ((uo.organisation_id = employee_pay_rate_history.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND (r.grants_org_admin = true))))`  }),
	pgPolicy("employee_pay_rate_history_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const timesheets = pgTable("timesheets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	shiftId: uuid("shift_id"),
	userProfileId: uuid("user_profile_id").notNull(),
	rosteredStartsAt: timestamp("rostered_starts_at", { withTimezone: true, mode: 'string' }).notNull(),
	rosteredEndsAt: timestamp("rostered_ends_at", { withTimezone: true, mode: 'string' }).notNull(),
	rosteredBreakMinutes: integer("rostered_break_minutes").default(0).notNull(),
	actualStartsAt: timestamp("actual_starts_at", { withTimezone: true, mode: 'string' }),
	actualEndsAt: timestamp("actual_ends_at", { withTimezone: true, mode: 'string' }),
	actualBreakMinutes: integer("actual_break_minutes"),
	source: text().default('manual_p1').notNull(),
	approvedBy: uuid("approved_by"),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	positionId: uuid("position_id"),
	payPeriodId: uuid("pay_period_id"),
	status: timesheetStatus().default('open').notNull(),
	rosteredHours: numeric("rostered_hours", { precision: 6, scale:  2 }),
	actualHours: numeric("actual_hours", { precision: 6, scale:  2 }),
	startVarianceMin: integer("start_variance_min"),
	endVarianceMin: integer("end_variance_min"),
	hoursVariance: numeric("hours_variance", { precision: 6, scale:  2 }),
	payRateCents: integer("pay_rate_cents"),
	isAutoClocked: boolean("is_auto_clocked").default(false).notNull(),
	isNoRoster: boolean("is_no_roster").default(false).notNull(),
	clockInLat: numeric("clock_in_lat", { precision: 9, scale:  6 }),
	clockInLng: numeric("clock_in_lng", { precision: 9, scale:  6 }),
	clockOutLat: numeric("clock_out_lat", { precision: 9, scale:  6 }),
	clockOutLng: numeric("clock_out_lng", { precision: 9, scale:  6 }),
	geolocationFlagged: boolean("geolocation_flagged").default(false).notNull(),
	notesEmployee: text("notes_employee"),
	notesManager: text("notes_manager"),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	lockedAt: timestamp("locked_at", { withTimezone: true, mode: 'string' }),
	lockedInPayrollExportId: uuid("locked_in_payroll_export_id"),
	workDate: date("work_date").default(sql`CURRENT_DATE`).notNull(),
}, (table) => [
	uniqueIndex("timesheets_shift_uq").using("btree", table.shiftId.asc().nullsLast().op("uuid_ops")).where(sql`(shift_id IS NOT NULL)`),
	index("timesheets_user_work_date_idx").using("btree", table.userProfileId.asc().nullsLast().op("date_ops"), table.workDate.asc().nullsLast().op("uuid_ops")),
	index("timesheets_venue_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	index("timesheets_venue_period_status_idx").using("btree", table.venueId.asc().nullsLast().op("enum_ops"), table.payPeriodId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [userProfiles.id],
			name: "timesheets_approved_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.lockedInPayrollExportId],
			foreignColumns: [payRuns.id],
			name: "timesheets_locked_in_payroll_export_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "timesheets_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payPeriodId],
			foreignColumns: [payPeriods.id],
			name: "timesheets_pay_period_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "timesheets_position_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [rosterShifts.id],
			name: "timesheets_shift_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "timesheets_user_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId, table.venueId],
			foreignColumns: [venues.id, venues.organisationId],
			name: "timesheets_venue_org_fk"
		}).onDelete("cascade"),
	pgPolicy("timesheets_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = auth.uid()) AND (uo.organisation_id = timesheets.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("timesheets_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("timesheets_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("timesheets_source_check", sql`source = ANY (ARRAY['roster_publish'::text, 'clock_in'::text, 'manager_edit'::text, 'accept_as_rostered'::text, 'dispute_resolution'::text, 'auto_clock_out'::text, 'manual_p1'::text, 'clock_in_p2'::text])`),
]);

export const payrollTimesheetLines = pgTable("payroll_timesheet_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	timesheetId: uuid("timesheet_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	payPeriodId: uuid("pay_period_id").notNull(),
	hours: numeric({ precision: 6, scale:  2 }).notNull(),
	baseRateCents: integer("base_rate_cents").notNull(),
	overtimeHours: numeric("overtime_hours", { precision: 6, scale:  2 }).default('0').notNull(),
	overtimeRateCents: integer("overtime_rate_cents"),
	grossCents: integer("gross_cents").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	payRunId: uuid("pay_run_id"),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "payroll_timesheet_lines_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payPeriodId],
			foreignColumns: [payPeriods.id],
			name: "payroll_timesheet_lines_pay_period_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payRunId],
			foreignColumns: [payRuns.id],
			name: "payroll_timesheet_lines_pay_run_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.timesheetId],
			foreignColumns: [timesheets.id],
			name: "payroll_timesheet_lines_timesheet_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "payroll_timesheet_lines_user_profile_id_fkey"
		}).onDelete("cascade"),
	unique("payroll_timesheet_lines_timesheet_id_key").on(table.timesheetId),
	pgPolicy("payroll_timesheet_lines_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = payroll_timesheet_lines.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("payroll_timesheet_lines_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const payPeriods = pgTable("pay_periods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	frequency: payPeriodFrequency().default('fortnightly').notNull(),
	status: payPeriodStatus().default('open').notNull(),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	exportedAt: timestamp("exported_at", { withTimezone: true, mode: 'string' }),
	payrollExportId: uuid("payroll_export_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("pay_periods_org_status_idx").using("btree", table.organisationId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "pay_periods_organisation_id_fkey"
		}).onDelete("cascade"),
	unique("pay_periods_organisation_id_start_date_end_date_key").on(table.organisationId, table.startDate, table.endDate),
	pgPolicy("pay_periods_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = pay_periods.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("pay_periods_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("pay_periods_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const timesheetClockEvents = pgTable("timesheet_clock_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	timesheetId: uuid("timesheet_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	eventType: timesheetClockEventType("event_type").notNull(),
	eventAt: timestamp("event_at", { withTimezone: true, mode: 'string' }).notNull(),
	deviceInfo: jsonb("device_info"),
	locationLat: numeric("location_lat", { precision: 9, scale:  6 }),
	locationLng: numeric("location_lng", { precision: 9, scale:  6 }),
	isValidatedLocation: boolean("is_validated_location"),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("timesheet_clock_events_timesheet_idx").using("btree", table.timesheetId.asc().nullsLast().op("timestamptz_ops"), table.eventAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [userProfiles.id],
			name: "timesheet_clock_events_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "timesheet_clock_events_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.timesheetId],
			foreignColumns: [timesheets.id],
			name: "timesheet_clock_events_timesheet_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("timesheet_clock_events_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = timesheet_clock_events.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("timesheet_clock_events_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const timesheetDisputes = pgTable("timesheet_disputes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	timesheetId: uuid("timesheet_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	disputedBy: uuid("disputed_by").notNull(),
	disputedAt: timestamp("disputed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	claimedStartsAt: timestamp("claimed_starts_at", { withTimezone: true, mode: 'string' }),
	claimedEndsAt: timestamp("claimed_ends_at", { withTimezone: true, mode: 'string' }),
	claimedHours: numeric("claimed_hours", { precision: 6, scale:  2 }),
	claimNotes: text("claim_notes").notNull(),
	resolution: timesheetDisputeResolution().default('pending').notNull(),
	resolutionNotes: text("resolution_notes"),
	resolvedBy: uuid("resolved_by"),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("timesheet_disputes_timesheet_idx").using("btree", table.timesheetId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.disputedBy],
			foreignColumns: [userProfiles.id],
			name: "timesheet_disputes_disputed_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "timesheet_disputes_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [userProfiles.id],
			name: "timesheet_disputes_resolved_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.timesheetId],
			foreignColumns: [timesheets.id],
			name: "timesheet_disputes_timesheet_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("timesheet_disputes_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = timesheet_disputes.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("timesheet_disputes_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("timesheet_disputes_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const timesheetAuditLog = pgTable("timesheet_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	timesheetId: uuid("timesheet_id").notNull(),
	changeType: text("change_type").notNull(),
	beforeState: jsonb("before_state"),
	afterState: jsonb("after_state"),
	reason: text(),
	actorUserId: uuid("actor_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("timesheet_audit_log_timesheet_idx").using("btree", table.timesheetId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [userProfiles.id],
			name: "timesheet_audit_log_actor_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "timesheet_audit_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.timesheetId],
			foreignColumns: [timesheets.id],
			name: "timesheet_audit_log_timesheet_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("timesheet_audit_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = timesheet_audit_log.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("timesheet_audit_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const organisationPayrollSettings = pgTable("organisation_payroll_settings", {
	organisationId: uuid("organisation_id").primaryKey().notNull(),
	superRatePct: numeric("super_rate_pct", { precision: 5, scale:  3 }).default('12.000').notNull(),
	superRateEffectiveFrom: date("super_rate_effective_from").default('2025-07-01').notNull(),
	primaryXeroVenueId: uuid("primary_xero_venue_id"),
	defaultPaydayOffsetDays: smallint("default_payday_offset_days").default(3).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "organisation_payroll_settings_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.primaryXeroVenueId],
			foreignColumns: [venues.id],
			name: "organisation_payroll_settings_primary_xero_venue_id_fkey"
		}).onDelete("set null"),
	pgPolicy("organisation_payroll_settings_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (user_organisations uo
     JOIN roles r ON ((r.id = uo.role_id)))
  WHERE ((uo.organisation_id = organisation_payroll_settings.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL) AND (r.grants_org_admin = true))))` }),
	pgPolicy("organisation_payroll_settings_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const payRuns = pgTable("pay_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	payPeriodId: uuid("pay_period_id").notNull(),
	frequency: payPeriodFrequency().notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	payDate: date("pay_date").notNull(),
	status: payrollRunStatus().default('draft').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalGrossCents: bigint("total_gross_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalSuperCents: bigint("total_super_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalPaygCents: bigint("total_payg_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalNetCents: bigint("total_net_cents", { mode: "number" }).default(0).notNull(),
	employeeCount: integer("employee_count").default(0).notNull(),
	calculationSnapshot: jsonb("calculation_snapshot"),
	calculationVersion: integer("calculation_version").default(1).notNull(),
	preparedBy: uuid("prepared_by"),
	preparedAt: timestamp("prepared_at", { withTimezone: true, mode: 'string' }),
	submittedForApprovalAt: timestamp("submitted_for_approval_at", { withTimezone: true, mode: 'string' }),
	ownerReturnNotes: text("owner_return_notes"),
	returnedAt: timestamp("returned_at", { withTimezone: true, mode: 'string' }),
	returnedBy: uuid("returned_by"),
	approvedBy: uuid("approved_by"),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	xeroTenantId: text("xero_tenant_id"),
	xeroPayRunId: text("xero_pay_run_id"),
	xeroPushAttemptedAt: timestamp("xero_push_attempted_at", { withTimezone: true, mode: 'string' }),
	xeroPushRetryCount: integer("xero_push_retry_count").default(0).notNull(),
	xeroFinalisedAt: timestamp("xero_finalised_at", { withTimezone: true, mode: 'string' }),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	payslipsIssuedAt: timestamp("payslips_issued_at", { withTimezone: true, mode: 'string' }),
	stpLodgedAt: timestamp("stp_lodged_at", { withTimezone: true, mode: 'string' }),
	superScheduledAt: timestamp("super_scheduled_at", { withTimezone: true, mode: 'string' }),
	superPaidAt: timestamp("super_paid_at", { withTimezone: true, mode: 'string' }),
	reconciledAt: timestamp("reconciled_at", { withTimezone: true, mode: 'string' }),
	isCorrectionRun: boolean("is_correction_run").default(false).notNull(),
	correctsPayRunId: uuid("corrects_pay_run_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("pay_runs_one_primary_per_period_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.payPeriodId.asc().nullsLast().op("uuid_ops")).where(sql`(is_correction_run = false)`),
	index("pay_runs_org_status_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [userProfiles.id],
			name: "pay_runs_approved_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.correctsPayRunId],
			foreignColumns: [table.id],
			name: "pay_runs_corrects_pay_run_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "pay_runs_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payPeriodId],
			foreignColumns: [payPeriods.id],
			name: "pay_runs_pay_period_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.preparedBy],
			foreignColumns: [userProfiles.id],
			name: "pay_runs_prepared_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.returnedBy],
			foreignColumns: [userProfiles.id],
			name: "pay_runs_returned_by_fkey"
		}).onDelete("set null"),
	pgPolicy("pay_runs_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = pay_runs.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("pay_runs_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("pay_runs_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const payRunLineItems = pgTable("pay_run_line_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payRunId: uuid("pay_run_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	hoursTotal: numeric("hours_total", { precision: 8, scale:  2 }).default('0').notNull(),
	hoursBreakdown: jsonb("hours_breakdown").default({}).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	grossCents: bigint("gross_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	superCents: bigint("super_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	paygCents: bigint("payg_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	netCents: bigint("net_cents", { mode: "number" }).default(0).notNull(),
	payRateSnapshotCents: integer("pay_rate_snapshot_cents"),
	awardClassificationSnapshot: text("award_classification_snapshot"),
	taxTreatmentCodeSnapshot: text("tax_treatment_code_snapshot"),
	stp2IncomeTypeSnapshot: text("stp2_income_type_snapshot"),
	superFundSnapshot: jsonb("super_fund_snapshot"),
	bankSnapshot: jsonb("bank_snapshot"),
	isTermination: boolean("is_termination").default(false).notNull(),
	cessationReasonCode: text("cessation_reason_code"),
	terminationPayoutBreakdown: jsonb("termination_payout_breakdown"),
	hasOverrides: boolean("has_overrides").default(false).notNull(),
	overrideReason: text("override_reason"),
	overrideCategory: payrollOverrideCategory("override_category"),
	hasFdvLeave: boolean("has_fdv_leave").default(false).notNull(),
	fdvPayslipLabel: text("fdv_payslip_label"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "pay_run_line_items_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payRunId],
			foreignColumns: [payRuns.id],
			name: "pay_run_line_items_pay_run_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "pay_run_line_items_user_profile_id_fkey"
		}).onDelete("cascade"),
	unique("pay_run_line_items_pay_run_id_user_profile_id_key").on(table.payRunId, table.userProfileId),
	pgPolicy("pay_run_line_items_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = pay_run_line_items.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("pay_run_line_items_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("pay_run_line_items_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const payrollPreflightChecks = pgTable("payroll_preflight_checks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payRunId: uuid("pay_run_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	checkedAt: timestamp("checked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	checkedBy: uuid("checked_by").notNull(),
	results: jsonb().notNull(),
	hardBlockCount: integer("hard_block_count").default(0).notNull(),
	softWarningCount: integer("soft_warning_count").default(0).notNull(),
	passed: boolean().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.checkedBy],
			foreignColumns: [userProfiles.id],
			name: "payroll_preflight_checks_checked_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "payroll_preflight_checks_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payRunId],
			foreignColumns: [payRuns.id],
			name: "payroll_preflight_checks_pay_run_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("payroll_preflight_checks_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = payroll_preflight_checks.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("payroll_preflight_checks_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const payrollAuditLog = pgTable("payroll_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	payRunId: uuid("pay_run_id").notNull(),
	lineItemId: uuid("line_item_id"),
	changeType: text("change_type").notNull(),
	beforeState: jsonb("before_state"),
	afterState: jsonb("after_state"),
	reason: text(),
	reasonCategory: payrollOverrideCategory("reason_category"),
	actorUserId: uuid("actor_user_id").notNull(),
	contentHash: text("content_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [userProfiles.id],
			name: "payroll_audit_log_actor_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.lineItemId],
			foreignColumns: [payRunLineItems.id],
			name: "payroll_audit_log_line_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "payroll_audit_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payRunId],
			foreignColumns: [payRuns.id],
			name: "payroll_audit_log_pay_run_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("payroll_audit_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = payroll_audit_log.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("payroll_audit_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const payrollXeroPushLog = pgTable("payroll_xero_push_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payRunId: uuid("pay_run_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	attemptedAt: timestamp("attempted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	attemptNumber: integer("attempt_number").notNull(),
	payloadDigest: text("payload_digest").notNull(),
	responseStatus: integer("response_status"),
	responseBody: jsonb("response_body"),
	success: boolean().notNull(),
	errorCode: text("error_code"),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "payroll_xero_push_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payRunId],
			foreignColumns: [payRuns.id],
			name: "payroll_xero_push_log_pay_run_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("payroll_xero_push_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = payroll_xero_push_log.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	pgPolicy("payroll_xero_push_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const authWhitelist = pgTable("auth_whitelist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	trialExpiresAt: timestamp("trial_expires_at", { withTimezone: true, mode: 'string' }),
	status: text().default('active').notNull(),
	addedBy: uuid("added_by"),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("auth_whitelist_active_email_org_uq").using("btree", sql`lower(TRIM(BOTH FROM email))`, sql`organisation_id`).where(sql`(status = 'active'::text)`),
	index("auth_whitelist_org_status_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [userProfiles.id],
			name: "auth_whitelist_added_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "auth_whitelist_organisation_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("auth_whitelist_manage_owner", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_owner(organisation_id)`, withCheck: sql`is_org_owner(organisation_id)`  }),
	pgPolicy("auth_whitelist_select_owner", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("auth_whitelist_status_check", sql`status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])`),
]);

export const organisationMemberInvites = pgTable("organisation_member_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	email: text().notNull(),
	roleId: uuid("role_id").notNull(),
	invitingUserId: uuid("inviting_user_id").notNull(),
	venueIds: uuid("venue_ids").array().default([""]).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("organisation_member_invites_email_org_idx").using("btree", sql`organisation_id`, sql`lower(TRIM(BOTH FROM email))`),
	index("organisation_member_invites_org_pending_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.expiresAt.asc().nullsLast().op("uuid_ops")).where(sql`((accepted_at IS NULL) AND (revoked_at IS NULL))`),
	foreignKey({
			columns: [table.invitingUserId],
			foreignColumns: [userProfiles.id],
			name: "organisation_member_invites_inviting_user_id_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "organisation_member_invites_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "organisation_member_invites_role_id_fkey"
		}),
	pgPolicy("organisation_member_invites_manage_owner", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_owner(organisation_id)`, withCheck: sql`is_org_owner(organisation_id)`  }),
	pgPolicy("organisation_member_invites_select_owner", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("organisation_member_invites_email_format_chk", sql`email ~* '^[^@]+@[^@]+\.[^@]+$'::text`),
]);

export const venueSquarePayments = pgTable("venue_square_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	squarePaymentId: text("square_payment_id").notNull(),
	squareOrderId: text("square_order_id"),
	orderDatetime: timestamp("order_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	orderNumber: text("order_number"),
	channel: text().default('pos').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	grossAmountCents: bigint("gross_amount_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	taxAmountCents: bigint("tax_amount_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	netAmountCents: bigint("net_amount_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	discountAmountCents: bigint("discount_amount_cents", { mode: "number" }).default(0).notNull(),
	isVoid: boolean("is_void").default(false).notNull(),
	isRefund: boolean("is_refund").default(false).notNull(),
	refundReason: text("refund_reason"),
	paymentMethod: text("payment_method"),
	squareStatus: text("square_status"),
	squareSourceType: text("square_source_type"),
	squareLocationId: text("square_location_id"),
	receiptUrl: text("receipt_url"),
	receiptNumber: text("receipt_number"),
	squareCreatedAt: timestamp("square_created_at", { withTimezone: true, mode: 'string' }),
	squareUpdatedAt: timestamp("square_updated_at", { withTimezone: true, mode: 'string' }),
	observedAt: timestamp("observed_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("venue_square_payments_venue_datetime_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.orderDatetime.desc().nullsFirst().op("timestamptz_ops")),
	index("venue_square_payments_venue_square_updated_idx").using("btree", table.venueId.asc().nullsLast().op("timestamptz_ops"), table.squareUpdatedAt.desc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_square_payments_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_square_payments_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_square_payments_uq").on(table.venueId, table.squarePaymentId),
	pgPolicy("venue_square_payments_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = venue_square_payments.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
]);

export const venueStorageLocations = pgTable("venue_storage_locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	name: text().notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_venue_storage_locations_venue").using("btree", table.venueId.asc().nullsLast().op("int4_ops"), table.displayOrder.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "venue_storage_locations_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_storage_locations_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_storage_locations_venue_name_uq").on(table.venueId, table.name),
	pgPolicy("venue_storage_locations_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_storage_locations.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = venue_storage_locations.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const ingredientStorageLocations = pgTable("ingredient_storage_locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	locationId: uuid("location_id").notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
}, (table) => [
	index("idx_ingredient_storage_locations_location").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "ingredient_storage_locations_ingredient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [venueStorageLocations.id],
			name: "ingredient_storage_locations_location_id_fkey"
		}).onDelete("cascade"),
	unique("ingredient_storage_locations_uq").on(table.ingredientId, table.locationId),
	pgPolicy("ingredient_storage_locations_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (ingredients i
     JOIN user_organisations uo ON ((uo.organisation_id = i.organisation_id)))
  WHERE ((i.id = ingredient_storage_locations.ingredient_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (ingredients i
     JOIN user_organisations uo ON ((uo.organisation_id = i.organisation_id)))
  WHERE ((i.id = ingredient_storage_locations.ingredient_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const stockCountSchedules = pgTable("stock_count_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	cadence: text().default('weekly').notNull(),
	cronExpression: text("cron_expression"),
	defaultAssigneeUserId: uuid("default_assignee_user_id"),
	defaultScopeType: text("default_scope_type").default('full').notNull(),
	defaultScopeFilter: jsonb("default_scope_filter").default({}).notNull(),
	isPaused: boolean("is_paused").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_count_schedules_venue").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "stock_count_schedules_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "stock_count_schedules_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stock_count_schedules_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = stock_count_schedules.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = stock_count_schedules.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("stock_count_schedules_cadence_chk", sql`cadence = ANY (ARRAY['weekly'::text, 'fortnightly'::text, 'monthly'::text, 'custom'::text])`),
	check("stock_count_schedules_scope_type_chk", sql`default_scope_type = ANY (ARRAY['full'::text, 'location'::text, 'cycle'::text, 'category'::text])`),
]);

export const stockCountTemplates = pgTable("stock_count_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	name: text().notNull(),
	locationOrder: jsonb("location_order").default([]).notNull(),
	ingredientGroupings: jsonb("ingredient_groupings").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_count_templates_venue").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "stock_count_templates_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stock_count_templates_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = stock_count_templates.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = stock_count_templates.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const stockCounts = pgTable("stock_counts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	scheduleId: uuid("schedule_id"),
	templateId: uuid("template_id"),
	name: text().notNull(),
	status: text().default('scheduled').notNull(),
	scopeType: text("scope_type").default('full').notNull(),
	scopeFilter: jsonb("scope_filter").default({}).notNull(),
	assigneeUserId: uuid("assignee_user_id"),
	createdByUserId: uuid("created_by_user_id").notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	approvedByUserId: uuid("approved_by_user_id"),
	rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: 'string' }),
	rejectedByUserId: uuid("rejected_by_user_id"),
	rejectionReason: text("rejection_reason"),
	isBaseline: boolean("is_baseline").default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalVarianceCents: bigint("total_variance_cents", { mode: "number" }),
	totalVariancePct: numeric("total_variance_pct"),
	largeVarianceOwnerRequired: boolean("large_variance_owner_required").default(false).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_counts_venue_status").using("btree", table.venueId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "stock_counts_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [stockCountSchedules.id],
			name: "stock_counts_schedule_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [stockCountTemplates.id],
			name: "stock_counts_template_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "stock_counts_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stock_counts_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = stock_counts.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = stock_counts.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("stock_counts_scope_type_chk", sql`scope_type = ANY (ARRAY['full'::text, 'location'::text, 'cycle'::text, 'category'::text])`),
	check("stock_counts_status_chk", sql`status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'pending_approval'::text, 'approved'::text, 'rejected'::text, 'archived'::text])`),
]);

export const ingredientConsumptionDaily = pgTable("ingredient_consumption_daily", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id").notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	date: date().notNull(),
	qtyConsumedBaseUnits: numeric("qty_consumed_base_units").default('0').notNull(),
	sourceRecipeCount: integer("source_recipe_count").default(0).notNull(),
	sourceSalesCount: integer("source_sales_count").default(0).notNull(),
	computedAt: timestamp("computed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ingredient_consumption_daily_venue_date").using("btree", table.venueId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "ingredient_consumption_daily_ingredient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "ingredient_consumption_daily_venue_id_fkey"
		}).onDelete("cascade"),
	unique("ingredient_consumption_daily_uq").on(table.venueId, table.ingredientId, table.date),
	pgPolicy("ingredient_consumption_daily_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = ingredient_consumption_daily.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = ingredient_consumption_daily.venue_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const stockCountEntries = pgTable("stock_count_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	countId: uuid("count_id").notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	locationId: uuid("location_id"),
	previousCountQty: numeric("previous_count_qty"),
	expectedQty: numeric("expected_qty"),
	countedQty: numeric("counted_qty"),
	unitUsed: text("unit_used"),
	mixedUnitBreakdown: jsonb("mixed_unit_breakdown"),
	varianceQty: numeric("variance_qty"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	varianceCents: bigint("variance_cents", { mode: "number" }),
	notes: text(),
	photoUrls: text("photo_urls").array().default([""]).notNull(),
	needsVerification: boolean("needs_verification").default(false).notNull(),
	isRecountRequired: boolean("is_recount_required").default(false).notNull(),
	isSkipped: boolean("is_skipped").default(false).notNull(),
	isRowComplete: boolean("is_row_complete").default(false).notNull(),
	countedByUserId: uuid("counted_by_user_id"),
	countedAt: timestamp("counted_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_count_entries_count").using("btree", table.countId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.countId],
			foreignColumns: [stockCounts.id],
			name: "stock_count_entries_count_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "stock_count_entries_ingredient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [venueStorageLocations.id],
			name: "stock_count_entries_location_id_fkey"
		}).onDelete("set null"),
	unique("stock_count_entries_count_ingredient_uq").on(table.countId, table.ingredientId),
	pgPolicy("stock_count_entries_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (stock_counts sc
     JOIN user_organisations uo ON ((uo.organisation_id = sc.organisation_id)))
  WHERE ((sc.id = stock_count_entries.count_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (stock_counts sc
     JOIN user_organisations uo ON ((uo.organisation_id = sc.organisation_id)))
  WHERE ((sc.id = stock_count_entries.count_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const stockCountVarianceEvents = pgTable("stock_count_variance_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	countId: uuid("count_id").notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	varianceQty: numeric("variance_qty").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	varianceCents: bigint("variance_cents", { mode: "number" }).notNull(),
	taggedReason: text("tagged_reason"),
	taggedByUserId: uuid("tagged_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_count_variance_events_count").using("btree", table.countId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.countId],
			foreignColumns: [stockCounts.id],
			name: "stock_count_variance_events_count_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "stock_count_variance_events_ingredient_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stock_count_variance_events_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (stock_counts sc
     JOIN user_organisations uo ON ((uo.organisation_id = sc.organisation_id)))
  WHERE ((sc.id = stock_count_variance_events.count_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (stock_counts sc
     JOIN user_organisations uo ON ((uo.organisation_id = sc.organisation_id)))
  WHERE ((sc.id = stock_count_variance_events.count_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("stock_count_variance_events_reason_chk", sql`(tagged_reason IS NULL) OR (tagged_reason = ANY (ARRAY['waste'::text, 'theft'::text, 'mis_count'::text, 'known_breakage'::text, 'unknown'::text]))`),
]);

export const stockCountAuditEvents = pgTable("stock_count_audit_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	countId: uuid("count_id").notNull(),
	actorUserId: uuid("actor_user_id"),
	eventType: text("event_type").notNull(),
	payload: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_count_audit_events_count").using("btree", table.countId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.countId],
			foreignColumns: [stockCounts.id],
			name: "stock_count_audit_events_count_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stock_count_audit_events_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (stock_counts sc
     JOIN user_organisations uo ON ((uo.organisation_id = sc.organisation_id)))
  WHERE ((sc.id = stock_count_audit_events.count_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (stock_counts sc
     JOIN user_organisations uo ON ((uo.organisation_id = sc.organisation_id)))
  WHERE ((sc.id = stock_count_audit_events.count_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const venueReadinessUserState = pgTable("venue_readiness_user_state", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	dismissedSuggestionKeys: text("dismissed_suggestion_keys").array().default([""]).notNull(),
	seenUnlockModuleIds: text("seen_unlock_module_ids").array().default([""]).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("venue_readiness_user_state_venue_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "venue_readiness_user_state_user_profile_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_readiness_user_state_venue_id_fkey"
		}).onDelete("cascade"),
	unique("venue_readiness_user_state_user_venue_uq").on(table.userProfileId, table.venueId),
	pgPolicy("venue_readiness_user_state_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`((user_profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (user_venues uv
     JOIN user_organisations uo ON ((uo.id = uv.user_organisation_id)))
  WHERE ((uv.venue_id = venue_readiness_user_state.venue_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uv.is_active = true) AND (uv.archived_at IS NULL) AND (uo.is_active = true) AND (uo.archived_at IS NULL)))))`  }),
	pgPolicy("venue_readiness_user_state_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("venue_readiness_user_state_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const userProfiles = pgTable("user_profiles", {
	id: uuid().primaryKey().notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	phone: text(),
	timezone: text().default('Australia/Melbourne'),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true, mode: 'string' }),
	preferredName: text("preferred_name"),
	dateOfBirth: date("date_of_birth"),
	residentialAddress: jsonb("residential_address"),
	emergencyContact: jsonb("emergency_contact"),
}, (table) => [
	index("user_profiles_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.id],
			foreignColumns: [usersInAuth.id],
			name: "user_profiles_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("user_profiles_insert_own", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(id = ( SELECT auth.uid() AS uid))`  }),
	pgPolicy("user_profiles_select_org_peers", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("user_profiles_select_own", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("user_profiles_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const userOrganisations = pgTable("user_organisations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	organisationId: uuid("organisation_id").notNull(),
	invitedAt: timestamp("invited_at", { withTimezone: true, mode: 'string' }),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	roleId: uuid("role_id").notNull(),
	employmentType: employmentType("employment_type").default('casual').notNull(),
	contractedHoursPerWeek: numeric("contracted_hours_per_week", { precision: 4, scale:  1 }),
	startDate: date("start_date"),
	continuousServiceStartDate: date("continuous_service_start_date"),
	endDate: date("end_date"),
	employmentStatus: employeeEmploymentStatus("employment_status").default('active').notNull(),
	probationStartDate: date("probation_start_date"),
	probationEndDate: date("probation_end_date"),
	weeklyHoursCommitment: numeric("weekly_hours_commitment", { precision: 4, scale:  1 }),
	payRateCents: integer("pay_rate_cents"),
	payRatePeriod: text("pay_rate_period").default('hourly').notNull(),
	awardCode: text("award_code"),
	classificationLevel: text("classification_level"),
	classificationGrade: text("classification_grade"),
	classificationHistory: jsonb("classification_history").default([]).notNull(),
	secondaryPositionIds: uuid("secondary_position_ids").array().default([""]).notNull(),
	xeroEmployeeId: text("xero_employee_id"),
	needsSupersoltDetail: boolean("needs_supersolt_detail").default(false).notNull(),
	fwisIssuedDate: date("fwis_issued_date"),
	ceisIssuedDate: date("ceis_issued_date"),
	fixedTermStatementIssuedDate: date("fixed_term_statement_issued_date"),
	casualConversionEligible: boolean("casual_conversion_eligible").default(false).notNull(),
	casualConversionEligibleAt: date("casual_conversion_eligible_at"),
	lslEligibleAt: date("lsl_eligible_at"),
	lslBalanceWeeks: numeric("lsl_balance_weeks", { precision: 8, scale:  2 }),
	notes: text(),
	terminatedAt: timestamp("terminated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("user_orgs_active_membership_uq").using("btree", table.userProfileId.asc().nullsLast().op("uuid_ops"), table.organisationId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("user_orgs_org_active_idx").using("btree", table.organisationId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(archived_at IS NULL)`),
	index("user_orgs_role_id_idx").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("user_orgs_user_active_idx").using("btree", table.userProfileId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "user_organisations_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_organisations_role_id_fkey"
		}),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "user_organisations_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("user_orgs_admin_manage", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_admin(organisation_id)`, withCheck: sql`is_org_admin(organisation_id)`  }),
	pgPolicy("user_orgs_insert_own_membership", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("user_orgs_select_org_peers", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("user_orgs_select_own", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const employeeCertifications = pgTable("employee_certifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	certType: text("cert_type").notNull(),
	certState: text("cert_state"),
	certificateNumber: text("certificate_number"),
	issueDate: date("issue_date").notNull(),
	expiryDate: date("expiry_date"),
	issuingAuthority: text("issuing_authority"),
	documentStoragePath: text("document_storage_path"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("employee_certifications_lookup_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.userProfileId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "employee_certifications_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "employee_certifications_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("employee_certifications_manage", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(is_org_admin(organisation_id) OR (user_profile_id = auth.uid()))`, withCheck: sql`(is_org_admin(organisation_id) OR (user_profile_id = auth.uid()))`  }),
	pgPolicy("employee_certifications_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const employeeDocuments = pgTable("employee_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	documentType: employeeDocumentType("document_type").notNull(),
	storagePath: text("storage_path").notNull(),
	fileName: text("file_name").notNull(),
	isSensitive: boolean("is_sensitive").default(false).notNull(),
	uploadedByUserId: uuid("uploaded_by_user_id").notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "employee_documents_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedByUserId],
			foreignColumns: [userProfiles.id],
			name: "employee_documents_uploaded_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "employee_documents_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("employee_documents_manage", { as: "permissive", for: "all", to: ["authenticated"], using: sql`can_read_employee_sensitive(organisation_id, user_profile_id)`, withCheck: sql`can_read_employee_sensitive(organisation_id, user_profile_id)`  }),
	pgPolicy("employee_documents_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const employeeAuditLog = pgTable("employee_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	fieldPath: text("field_path").notNull(),
	beforeValue: jsonb("before_value"),
	afterValue: jsonb("after_value"),
	isSensitive: boolean("is_sensitive").default(false).notNull(),
	actorUserId: uuid("actor_user_id").notNull(),
	justification: text(),
	contentHash: text("content_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("employee_audit_log_lookup_idx").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.userProfileId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [userProfiles.id],
			name: "employee_audit_log_actor_user_id_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "employee_audit_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "employee_audit_log_user_profile_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("employee_audit_log_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(actor_user_id = auth.uid())`  }),
	pgPolicy("employee_audit_log_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const xeroEmployeeSyncLog = pgTable("xero_employee_sync_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id"),
	direction: xeroSyncDirection().notNull(),
	fieldPath: text("field_path").notNull(),
	xeroValue: jsonb("xero_value"),
	supersoltValue: jsonb("supersolt_value"),
	resolution: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "xero_employee_sync_log_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "xero_employee_sync_log_user_profile_id_fkey"
		}).onDelete("set null"),
	pgPolicy("xero_employee_sync_log_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_org_admin(organisation_id)` }),
]);

export const employeeOnboardingTokens = pgTable("employee_onboarding_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	userOrganisationId: uuid("user_organisation_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [userProfiles.id],
			name: "employee_onboarding_tokens_created_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "employee_onboarding_tokens_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userOrganisationId],
			foreignColumns: [userOrganisations.id],
			name: "employee_onboarding_tokens_user_organisation_id_fkey"
		}).onDelete("cascade"),
	unique("employee_onboarding_tokens_token_hash_key").on(table.tokenHash),
	pgPolicy("employee_onboarding_tokens_admin", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_org_admin(organisation_id)`, withCheck: sql`is_org_admin(organisation_id)`  }),
]);

export const supplierRawItems = pgTable("supplier_raw_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	supplierId: uuid("supplier_id").notNull(),
	rawDescription: text("raw_description").notNull(),
	rawDescriptionNormalized: text("raw_description_normalized").notNull(),
	rawUnit: text("raw_unit"),
	lastQuantity: numeric("last_quantity"),
	lastUnitPriceCents: integer("last_unit_price_cents"),
	lastLineTotalCents: integer("last_line_total_cents"),
	source: text().default('manual').notNull(),
	firstSeenAt: timestamp("first_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastInvoiceId: uuid("last_invoice_id"),
	normalisationStatus: text("normalisation_status").default('pending').notNull(),
	supplierProductId: uuid("supplier_product_id"),
	isLikelyInventory: boolean("is_likely_inventory"),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_supplier_raw_items_org_supplier").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.supplierId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("idx_supplier_raw_items_pending").using("btree", table.supplierId.asc().nullsLast().op("uuid_ops")).where(sql`((archived_at IS NULL) AND (normalisation_status = 'pending'::text))`),
	foreignKey({
			columns: [table.lastInvoiceId],
			foreignColumns: [venueInvoices.id],
			name: "supplier_raw_items_last_invoice_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "supplier_raw_items_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "supplier_raw_items_supplier_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierProductId],
			foreignColumns: [supplierProducts.id],
			name: "supplier_raw_items_supplier_product_id_fkey"
		}).onDelete("set null"),
	unique("supplier_raw_items_supplier_dedupe_uq").on(table.supplierId, table.rawDescriptionNormalized),
	pgPolicy("supplier_raw_items_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = supplier_raw_items.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = supplier_raw_items.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
	check("supplier_raw_items_normalisation_status_check", sql`normalisation_status = ANY (ARRAY['pending'::text, 'normalised'::text, 'skipped'::text])`),
	check("supplier_raw_items_source_check", sql`source = ANY (ARRAY['xero_api'::text, 'invoice_parse'::text, 'manual'::text])`),
]);

export const supplierProducts = pgTable("supplier_products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id"),
	supplierId: uuid("supplier_id").notNull(),
	ingredientId: uuid("ingredient_id"),
	name: text().notNull(),
	skuCode: text("sku_code"),
	packLabel: text("pack_label").default('each').notNull(),
	unitsPerPack: numeric("units_per_pack").default('1').notNull(),
	packUnit: text("pack_unit").default('each').notNull(),
	unitPriceCents: integer("unit_price_cents").default(0).notNull(),
	isActiveForIngredient: boolean("is_active_for_ingredient").default(false).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_supplier_products_ingredient").using("btree", table.ingredientId.asc().nullsLast().op("uuid_ops")).where(sql`((archived_at IS NULL) AND (is_active_for_ingredient = true))`),
	index("idx_supplier_products_supplier").using("btree", table.supplierId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "supplier_products_ingredient_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "supplier_products_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "supplier_products_supplier_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "supplier_products_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("supplier_products_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = supplier_products.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.organisation_id = supplier_products.organisation_id) AND (uo.user_profile_id = auth.uid()) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const ingredients = pgTable("ingredients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organisationId: uuid("organisation_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	name: text().notNull(),
	category: text().default('other').notNull(),
	unit: text().notNull(),
	costPerUnitCents: integer("cost_per_unit_cents").default(0).notNull(),
	currentStockLevel: numeric("current_stock_level").default('0').notNull(),
	bestSupplierCostCents: integer("best_supplier_cost_cents"),
	status: text().default('active').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	supplierId: uuid("supplier_id"),
	activeSupplierProductId: uuid("active_supplier_product_id"),
}, (table) => [
	index("idx_ingredients_org_venue").using("btree", table.organisationId.asc().nullsLast().op("uuid_ops"), table.venueId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	index("idx_ingredients_supplier_id").using("btree", table.supplierId.asc().nullsLast().op("uuid_ops")).where(sql`(archived_at IS NULL)`),
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "ingredients_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "ingredients_supplier_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "ingredients_venue_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("ingredients_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_organisations uo
  WHERE ((uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.organisation_id = ingredients.organisation_id) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	pgPolicy("ingredients_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("ingredients_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("ingredients_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recipeId: uuid("recipe_id").notNull(),
	ingredientId: uuid("ingredient_id"),
	ingredientName: text("ingredient_name").notNull(),
	quantity: numeric().notNull(),
	unit: text().notNull(),
	unitCostCents: integer("unit_cost_cents").default(0).notNull(),
	isSubRecipe: boolean("is_sub_recipe").default(false).notNull(),
	subRecipeId: uuid("sub_recipe_id"),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "recipe_ingredients_ingredient_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_ingredients_recipe_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subRecipeId],
			foreignColumns: [recipes.id],
			name: "recipe_ingredients_sub_recipe_id_fkey"
		}).onDelete("set null"),
	pgPolicy("recipe_ingredients_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (recipes r
     JOIN user_organisations uo ON ((uo.organisation_id = r.organisation_id)))
  WHERE ((r.id = recipe_ingredients.recipe_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM (recipes r
     JOIN user_organisations uo ON ((uo.organisation_id = r.organisation_id)))
  WHERE ((r.id = recipe_ingredients.recipe_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))`  }),
]);

export const purchaseOrderNumberSequences = pgTable("purchase_order_number_sequences", {
	venueId: uuid("venue_id").notNull(),
	year: integer().notNull(),
	lastNumber: integer("last_number").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "purchase_order_number_sequences_venue_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.venueId, table.year], name: "purchase_order_number_sequences_pkey"}),
]);

export const forecasts = pgTable("forecasts", {
	venueId: uuid("venue_id").notNull(),
	date: date().notNull(),
	metric: text().notNull(),
	forecastValue: numeric("forecast_value").notNull(),
	confidence: text().notNull(),
	confidenceLowerBound: numeric("confidence_lower_bound"),
	confidenceUpperBound: numeric("confidence_upper_bound"),
	inputs: jsonb().default({}).notNull(),
	isAnomalyFlagged: boolean("is_anomaly_flagged").default(false).notNull(),
	anomalyResolution: text("anomaly_resolution"),
	computedAt: timestamp("computed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("forecasts_venue_date_idx").using("btree", table.venueId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "forecasts_venue_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.venueId, table.date, table.metric], name: "forecasts_pkey"}),
	pgPolicy("forecasts_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = forecasts.venue_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
	check("forecasts_anomaly_resolution_chk", sql`(anomaly_resolution IS NULL) OR (anomaly_resolution = ANY (ARRAY['one_off'::text, 'include_in_baseline'::text]))`),
	check("forecasts_confidence_chk", sql`confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])`),
	check("forecasts_metric_chk", sql`metric = ANY (ARRAY['revenue'::text, 'orders'::text, 'avg_check'::text])`),
]);

export const dailySales = pgTable("daily_sales", {
	venueId: uuid("venue_id").notNull(),
	date: date().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	revenueCents: bigint("revenue_cents", { mode: "number" }).default(0).notNull(),
	ordersCount: integer("orders_count").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	avgCheckCents: bigint("avg_check_cents", { mode: "number" }).default(0).notNull(),
	refundsCount: integer("refunds_count").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	refundsValueCents: bigint("refunds_value_cents", { mode: "number" }).default(0).notNull(),
	voidsCount: integer("voids_count").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	dineInRevenueCents: bigint("dine_in_revenue_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pickUpRevenueCents: bigint("pick_up_revenue_cents", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deliveryRevenueCents: bigint("delivery_revenue_cents", { mode: "number" }).default(0).notNull(),
	source: text().default('square').notNull(),
	computedAt: timestamp("computed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("daily_sales_venue_date_idx").using("btree", table.venueId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("date_ops")),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "daily_sales_venue_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.venueId, table.date], name: "daily_sales_pkey"}),
	pgPolicy("daily_sales_select", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (venues v
     JOIN user_organisations uo ON ((uo.organisation_id = v.organisation_id)))
  WHERE ((v.id = daily_sales.venue_id) AND (uo.user_profile_id = ( SELECT auth.uid() AS uid)) AND (uo.is_active = true) AND (uo.archived_at IS NULL))))` }),
]);

export const employeePayrollProfiles = pgTable("employee_payroll_profiles", {
	organisationId: uuid("organisation_id").notNull(),
	userProfileId: uuid("user_profile_id").notNull(),
	tfn: text(),
	taxTreatmentCode: text("tax_treatment_code"),
	stp2IncomeType: text("stp2_income_type"),
	superFundUsi: text("super_fund_usi"),
	superMemberNumber: text("super_member_number"),
	bankBsb: text("bank_bsb"),
	bankAccountNumber: text("bank_account_number"),
	bankAccountName: text("bank_account_name"),
	awardCode: text("award_code"),
	awardClassification: text("award_classification"),
	awardGrade: text("award_grade"),
	payRateCents: integer("pay_rate_cents"),
	dateOfBirth: date("date_of_birth"),
	employmentType: employmentType("employment_type"),
	fdvPayslipLabel: text("fdv_payslip_label").default('other_paid_leave').notNull(),
	isTerminated: boolean("is_terminated").default(false).notNull(),
	terminationDate: date("termination_date"),
	cessationReasonCode: text("cessation_reason_code"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	tfnStatus: employeeTfnStatus("tfn_status"),
	superFundAbn: text("super_fund_abn"),
	superFundName: text("super_fund_name"),
	superChoiceFormDate: date("super_choice_form_date"),
	stapledCheckStatus: stapledCheckStatus("stapled_check_status"),
	stapledCheckDate: date("stapled_check_date"),
	stapledCheckPerformedBy: uuid("stapled_check_performed_by"),
	visaSubclass: text("visa_subclass"),
	countryCode: char("country_code", { length: 2 }),
	visaExpiry: date("visa_expiry"),
	lastVevoCheckDate: date("last_vevo_check_date"),
	vevoReference: text("vevo_reference"),
	isBridgingVisa: boolean("is_bridging_visa").default(false).notNull(),
	xeroManagedFields: jsonb("xero_managed_fields").default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organisationId],
			foreignColumns: [organisations.id],
			name: "employee_payroll_profiles_organisation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.stapledCheckPerformedBy],
			foreignColumns: [userProfiles.id],
			name: "employee_payroll_profiles_stapled_check_performed_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "employee_payroll_profiles_user_profile_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.organisationId, table.userProfileId], name: "employee_payroll_profiles_pkey"}),
	pgPolicy("employee_payroll_profiles_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`can_read_employee_sensitive(organisation_id, user_profile_id)`  }),
	pgPolicy("employee_payroll_profiles_select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("employee_payroll_profiles_update", { as: "permissive", for: "update", to: ["authenticated"] }),
]);
