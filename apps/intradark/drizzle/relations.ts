import { relations } from "drizzle-orm/relations";
import { flowStateInAuth, samlRelayStatesInAuth, ssoProvidersInAuth, samlProvidersInAuth, usersInAuth, newsArticles, sessionsInAuth, refreshTokensInAuth, oauthClientsInAuth, ssoDomainsInAuth, mfaAmrClaimsInAuth, identitiesInAuth, oneTimeTokensInAuth, mfaFactorsInAuth, mfaChallengesInAuth, steamProfiles, userProfiles, oauthConsentsInAuth, oauthAuthorizationsInAuth, webauthnCredentialsInAuth, maps, utilityMapSpots, webauthnChallengesInAuth, utilityLineups, utilityLineupEnemyPovVideos, userRoles, roles, forumThreads, forumCategories, utilityLineupUploadJobs, forumReplies, mapPools, forumTags, forumThreadTags, roleTemplateRoles, roleTemplates, userRoleTemplates } from "./schema";

export const samlRelayStatesInAuthRelations = relations(samlRelayStatesInAuth, ({one}) => ({
	flowStateInAuth: one(flowStateInAuth, {
		fields: [samlRelayStatesInAuth.flowStateId],
		references: [flowStateInAuth.id]
	}),
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlRelayStatesInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const flowStateInAuthRelations = relations(flowStateInAuth, ({many}) => ({
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
}));

export const ssoProvidersInAuthRelations = relations(ssoProvidersInAuth, ({many}) => ({
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
	samlProvidersInAuths: many(samlProvidersInAuth),
	ssoDomainsInAuths: many(ssoDomainsInAuth),
}));

export const samlProvidersInAuthRelations = relations(samlProvidersInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlProvidersInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const newsArticlesRelations = relations(newsArticles, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [newsArticles.authorUserId],
		references: [usersInAuth.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	newsArticles: many(newsArticles),
	sessionsInAuths: many(sessionsInAuth),
	identitiesInAuths: many(identitiesInAuth),
	oneTimeTokensInAuths: many(oneTimeTokensInAuth),
	mfaFactorsInAuths: many(mfaFactorsInAuth),
	userProfiles: many(userProfiles),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	webauthnCredentialsInAuths: many(webauthnCredentialsInAuth),
	webauthnChallengesInAuths: many(webauthnChallengesInAuth),
	forumThreads: many(forumThreads),
	forumReplies: many(forumReplies),
}));

export const refreshTokensInAuthRelations = relations(refreshTokensInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [refreshTokensInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const sessionsInAuthRelations = relations(sessionsInAuth, ({one, many}) => ({
	refreshTokensInAuths: many(refreshTokensInAuth),
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [sessionsInAuth.oauthClientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [sessionsInAuth.userId],
		references: [usersInAuth.id]
	}),
	mfaAmrClaimsInAuths: many(mfaAmrClaimsInAuth),
}));

export const oauthClientsInAuthRelations = relations(oauthClientsInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
}));

export const ssoDomainsInAuthRelations = relations(ssoDomainsInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [ssoDomainsInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const mfaAmrClaimsInAuthRelations = relations(mfaAmrClaimsInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [mfaAmrClaimsInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const identitiesInAuthRelations = relations(identitiesInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [identitiesInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const oneTimeTokensInAuthRelations = relations(oneTimeTokensInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [oneTimeTokensInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const mfaChallengesInAuthRelations = relations(mfaChallengesInAuth, ({one}) => ({
	mfaFactorsInAuth: one(mfaFactorsInAuth, {
		fields: [mfaChallengesInAuth.factorId],
		references: [mfaFactorsInAuth.id]
	}),
}));

export const mfaFactorsInAuthRelations = relations(mfaFactorsInAuth, ({one, many}) => ({
	mfaChallengesInAuths: many(mfaChallengesInAuth),
	usersInAuth: one(usersInAuth, {
		fields: [mfaFactorsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one, many}) => ({
	steamProfile: one(steamProfiles, {
		fields: [userProfiles.steamProfileId],
		references: [steamProfiles.steamid64]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [userProfiles.userId],
		references: [usersInAuth.id]
	}),
	utilityLineups: many(utilityLineups),
	utilityLineupEnemyPovVideos: many(utilityLineupEnemyPovVideos),
	userRoles_grantedBy: many(userRoles, {
		relationName: "userRoles_grantedBy_userProfiles_id"
	}),
	userRoles_userProfileId: many(userRoles, {
		relationName: "userRoles_userProfileId_userProfiles_id"
	}),
	utilityLineupUploadJobs: many(utilityLineupUploadJobs),
	userRoleTemplates_grantedBy: many(userRoleTemplates, {
		relationName: "userRoleTemplates_grantedBy_userProfiles_id"
	}),
	userRoleTemplates_userProfileId: many(userRoleTemplates, {
		relationName: "userRoleTemplates_userProfileId_userProfiles_id"
	}),
}));

export const steamProfilesRelations = relations(steamProfiles, ({many}) => ({
	userProfiles: many(userProfiles),
}));

export const oauthConsentsInAuthRelations = relations(oauthConsentsInAuth, ({one}) => ({
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [oauthConsentsInAuth.clientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [oauthConsentsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const oauthAuthorizationsInAuthRelations = relations(oauthAuthorizationsInAuth, ({one}) => ({
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [oauthAuthorizationsInAuth.clientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [oauthAuthorizationsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const webauthnCredentialsInAuthRelations = relations(webauthnCredentialsInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [webauthnCredentialsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const utilityMapSpotsRelations = relations(utilityMapSpots, ({one}) => ({
	map: one(maps, {
		fields: [utilityMapSpots.mapId],
		references: [maps.id]
	}),
}));

export const mapsRelations = relations(maps, ({one, many}) => ({
	utilityMapSpots: many(utilityMapSpots),
	utilityLineups: many(utilityLineups),
	mapPool: one(mapPools, {
		fields: [maps.poolId],
		references: [mapPools.id]
	}),
}));

export const webauthnChallengesInAuthRelations = relations(webauthnChallengesInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [webauthnChallengesInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const utilityLineupsRelations = relations(utilityLineups, ({one, many}) => ({
	userProfile: one(userProfiles, {
		fields: [utilityLineups.authorProfileId],
		references: [userProfiles.id]
	}),
	map: one(maps, {
		fields: [utilityLineups.mapId],
		references: [maps.id]
	}),
	utilityLineupEnemyPovVideos: many(utilityLineupEnemyPovVideos),
	utilityLineupUploadJobs_lineupId: many(utilityLineupUploadJobs, {
		relationName: "utilityLineupUploadJobs_lineupId_utilityLineups_id"
	}),
	utilityLineupUploadJobs_parentLineupId: many(utilityLineupUploadJobs, {
		relationName: "utilityLineupUploadJobs_parentLineupId_utilityLineups_id"
	}),
}));

export const utilityLineupEnemyPovVideosRelations = relations(utilityLineupEnemyPovVideos, ({one, many}) => ({
	userProfile: one(userProfiles, {
		fields: [utilityLineupEnemyPovVideos.authorProfileId],
		references: [userProfiles.id]
	}),
	utilityLineup: one(utilityLineups, {
		fields: [utilityLineupEnemyPovVideos.lineupId],
		references: [utilityLineups.id]
	}),
	utilityLineupUploadJobs: many(utilityLineupUploadJobs),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	userProfile_grantedBy: one(userProfiles, {
		fields: [userRoles.grantedBy],
		references: [userProfiles.id],
		relationName: "userRoles_grantedBy_userProfiles_id"
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [userRoles.userProfileId],
		references: [userProfiles.id],
		relationName: "userRoles_userProfileId_userProfiles_id"
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
	roleTemplateRoles: many(roleTemplateRoles),
}));

export const forumThreadsRelations = relations(forumThreads, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [forumThreads.authorUserId],
		references: [usersInAuth.id]
	}),
	forumCategory: one(forumCategories, {
		fields: [forumThreads.categoryId],
		references: [forumCategories.id]
	}),
	forumReplies: many(forumReplies),
	forumThreadTags: many(forumThreadTags),
}));

export const forumCategoriesRelations = relations(forumCategories, ({many}) => ({
	forumThreads: many(forumThreads),
}));

export const utilityLineupUploadJobsRelations = relations(utilityLineupUploadJobs, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [utilityLineupUploadJobs.authorProfileId],
		references: [userProfiles.id]
	}),
	utilityLineupEnemyPovVideo: one(utilityLineupEnemyPovVideos, {
		fields: [utilityLineupUploadJobs.enemyPovVideoId],
		references: [utilityLineupEnemyPovVideos.id]
	}),
	utilityLineup_lineupId: one(utilityLineups, {
		fields: [utilityLineupUploadJobs.lineupId],
		references: [utilityLineups.id],
		relationName: "utilityLineupUploadJobs_lineupId_utilityLineups_id"
	}),
	utilityLineup_parentLineupId: one(utilityLineups, {
		fields: [utilityLineupUploadJobs.parentLineupId],
		references: [utilityLineups.id],
		relationName: "utilityLineupUploadJobs_parentLineupId_utilityLineups_id"
	}),
}));

export const forumRepliesRelations = relations(forumReplies, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [forumReplies.authorUserId],
		references: [usersInAuth.id]
	}),
	forumReply: one(forumReplies, {
		fields: [forumReplies.parentReplyId],
		references: [forumReplies.id],
		relationName: "forumReplies_parentReplyId_forumReplies_id"
	}),
	forumReplies: many(forumReplies, {
		relationName: "forumReplies_parentReplyId_forumReplies_id"
	}),
	forumThread: one(forumThreads, {
		fields: [forumReplies.threadId],
		references: [forumThreads.id]
	}),
}));

export const mapPoolsRelations = relations(mapPools, ({many}) => ({
	maps: many(maps),
}));

export const forumThreadTagsRelations = relations(forumThreadTags, ({one}) => ({
	forumTag: one(forumTags, {
		fields: [forumThreadTags.tagId],
		references: [forumTags.id]
	}),
	forumThread: one(forumThreads, {
		fields: [forumThreadTags.threadId],
		references: [forumThreads.id]
	}),
}));

export const forumTagsRelations = relations(forumTags, ({many}) => ({
	forumThreadTags: many(forumThreadTags),
}));

export const roleTemplateRolesRelations = relations(roleTemplateRoles, ({one}) => ({
	role: one(roles, {
		fields: [roleTemplateRoles.roleId],
		references: [roles.id]
	}),
	roleTemplate: one(roleTemplates, {
		fields: [roleTemplateRoles.templateId],
		references: [roleTemplates.id]
	}),
}));

export const roleTemplatesRelations = relations(roleTemplates, ({many}) => ({
	roleTemplateRoles: many(roleTemplateRoles),
	userRoleTemplates: many(userRoleTemplates),
}));

export const userRoleTemplatesRelations = relations(userRoleTemplates, ({one}) => ({
	userProfile_grantedBy: one(userProfiles, {
		fields: [userRoleTemplates.grantedBy],
		references: [userProfiles.id],
		relationName: "userRoleTemplates_grantedBy_userProfiles_id"
	}),
	roleTemplate: one(roleTemplates, {
		fields: [userRoleTemplates.templateId],
		references: [roleTemplates.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [userRoleTemplates.userProfileId],
		references: [userProfiles.id],
		relationName: "userRoleTemplates_userProfileId_userProfiles_id"
	}),
}));