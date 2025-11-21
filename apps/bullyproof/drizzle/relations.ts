import { relations } from "drizzle-orm/relations";
import { ssoProvidersInAuth, ssoDomainsInAuth, samlProvidersInAuth, usersInAuth, mfaFactorsInAuth, sessionsInAuth, refreshTokensInAuth, schoolLevels, schoolYears, flowStateInAuth, samlRelayStatesInAuth, mfaAmrClaimsInAuth, identitiesInAuth, oneTimeTokensInAuth, mfaChallengesInAuth, userProfile, oauthClientsInAuth, schools, classes, lessons, topics, scopes, roles, curriculumStages, topicSlides, lessonLiveState, userRoles, lessonEvents, lessonSessions, schoolInvites, schoolLicences, schoolSectors, states, oauthAuthorizationsInAuth, oauthConsentsInAuth, schoolLevelAssignments, lessonClasses, stageYearLinks, classYears, teacherSlideNotes, lessonSlideNotes } from "./schema";

export const ssoDomainsInAuthRelations = relations(ssoDomainsInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [ssoDomainsInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const ssoProvidersInAuthRelations = relations(ssoProvidersInAuth, ({many}) => ({
	ssoDomainsInAuths: many(ssoDomainsInAuth),
	samlProvidersInAuths: many(samlProvidersInAuth),
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
}));

export const samlProvidersInAuthRelations = relations(samlProvidersInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlProvidersInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const mfaFactorsInAuthRelations = relations(mfaFactorsInAuth, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [mfaFactorsInAuth.userId],
		references: [usersInAuth.id]
	}),
	mfaChallengesInAuths: many(mfaChallengesInAuth),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	mfaFactorsInAuths: many(mfaFactorsInAuth),
	identitiesInAuths: many(identitiesInAuth),
	oneTimeTokensInAuths: many(oneTimeTokensInAuth),
	userProfiles: many(userProfile),
	sessionsInAuths: many(sessionsInAuth),
	lessons: many(lessons),
	lessonLiveStates: many(lessonLiveState),
	userRoles: many(userRoles),
	lessonEvents: many(lessonEvents),
	lessonSessions: many(lessonSessions),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	teacherSlideNotes: many(teacherSlideNotes),
}));

export const refreshTokensInAuthRelations = relations(refreshTokensInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [refreshTokensInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const sessionsInAuthRelations = relations(sessionsInAuth, ({one, many}) => ({
	refreshTokensInAuths: many(refreshTokensInAuth),
	mfaAmrClaimsInAuths: many(mfaAmrClaimsInAuth),
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [sessionsInAuth.oauthClientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [sessionsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const schoolYearsRelations = relations(schoolYears, ({one, many}) => ({
	schoolLevel: one(schoolLevels, {
		fields: [schoolYears.levelId],
		references: [schoolLevels.id]
	}),
	stageYearLinks: many(stageYearLinks),
	classYears: many(classYears),
}));

export const schoolLevelsRelations = relations(schoolLevels, ({many}) => ({
	schoolYears: many(schoolYears),
	schoolLevelAssignments: many(schoolLevelAssignments),
}));

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

export const userProfileRelations = relations(userProfile, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userProfile.id],
		references: [usersInAuth.id]
	}),
}));

export const oauthClientsInAuthRelations = relations(oauthClientsInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
}));

export const classesRelations = relations(classes, ({one, many}) => ({
	school: one(schools, {
		fields: [classes.schoolId],
		references: [schools.id]
	}),
	lessonClasses: many(lessonClasses),
	classYears: many(classYears),
}));

export const schoolsRelations = relations(schools, ({one, many}) => ({
	classes: many(classes),
	lessons: many(lessons),
	userRoles: many(userRoles),
	schoolInvites: many(schoolInvites),
	schoolLicences: many(schoolLicences),
	schoolSector: one(schoolSectors, {
		fields: [schools.sectorId],
		references: [schoolSectors.id]
	}),
	state: one(states, {
		fields: [schools.stateId],
		references: [states.id]
	}),
	schoolLevelAssignments: many(schoolLevelAssignments),
}));

export const lessonsRelations = relations(lessons, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [lessons.createdByUserId],
		references: [usersInAuth.id]
	}),
	school: one(schools, {
		fields: [lessons.schoolId],
		references: [schools.id]
	}),
	topic: one(topics, {
		fields: [lessons.topicId],
		references: [topics.id]
	}),
	lessonLiveStates: many(lessonLiveState),
	lessonEvents: many(lessonEvents),
	lessonSessions: many(lessonSessions),
	lessonClasses: many(lessonClasses),
	lessonSlideNotes: many(lessonSlideNotes),
}));

export const topicsRelations = relations(topics, ({one, many}) => ({
	lessons: many(lessons),
	curriculumStage: one(curriculumStages, {
		fields: [topics.stageId],
		references: [curriculumStages.id]
	}),
	topicSlides: many(topicSlides),
}));

export const rolesRelations = relations(roles, ({one, many}) => ({
	scope: one(scopes, {
		fields: [roles.scopeId],
		references: [scopes.id]
	}),
	userRoles: many(userRoles),
}));

export const scopesRelations = relations(scopes, ({many}) => ({
	roles: many(roles),
}));

export const curriculumStagesRelations = relations(curriculumStages, ({many}) => ({
	topics: many(topics),
	stageYearLinks: many(stageYearLinks),
}));

export const lessonLiveStateRelations = relations(lessonLiveState, ({one}) => ({
	topicSlide: one(topicSlides, {
		fields: [lessonLiveState.currentSlideId],
		references: [topicSlides.id]
	}),
	lesson: one(lessons, {
		fields: [lessonLiveState.lessonId],
		references: [lessons.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [lessonLiveState.updatedBy],
		references: [usersInAuth.id]
	}),
}));

export const topicSlidesRelations = relations(topicSlides, ({one, many}) => ({
	lessonLiveStates: many(lessonLiveState),
	topic: one(topics, {
		fields: [topicSlides.topicId],
		references: [topics.id]
	}),
	teacherSlideNotes: many(teacherSlideNotes),
	lessonSlideNotes: many(lessonSlideNotes),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	school: one(schools, {
		fields: [userRoles.schoolId],
		references: [schools.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [userRoles.userId],
		references: [usersInAuth.id]
	}),
}));

export const lessonEventsRelations = relations(lessonEvents, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [lessonEvents.actorUserId],
		references: [usersInAuth.id]
	}),
	lesson: one(lessons, {
		fields: [lessonEvents.lessonId],
		references: [lessons.id]
	}),
	lessonSession: one(lessonSessions, {
		fields: [lessonEvents.sessionId],
		references: [lessonSessions.id]
	}),
}));

export const lessonSessionsRelations = relations(lessonSessions, ({one, many}) => ({
	lessonEvents: many(lessonEvents),
	lesson: one(lessons, {
		fields: [lessonSessions.lessonId],
		references: [lessons.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [lessonSessions.startedBy],
		references: [usersInAuth.id]
	}),
}));

export const schoolInvitesRelations = relations(schoolInvites, ({one}) => ({
	school: one(schools, {
		fields: [schoolInvites.schoolId],
		references: [schools.id]
	}),
}));

export const schoolLicencesRelations = relations(schoolLicences, ({one}) => ({
	school: one(schools, {
		fields: [schoolLicences.schoolId],
		references: [schools.id]
	}),
}));

export const schoolSectorsRelations = relations(schoolSectors, ({many}) => ({
	schools: many(schools),
}));

export const statesRelations = relations(states, ({many}) => ({
	schools: many(schools),
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

export const schoolLevelAssignmentsRelations = relations(schoolLevelAssignments, ({one}) => ({
	schoolLevel: one(schoolLevels, {
		fields: [schoolLevelAssignments.levelId],
		references: [schoolLevels.id]
	}),
	school: one(schools, {
		fields: [schoolLevelAssignments.schoolId],
		references: [schools.id]
	}),
}));

export const lessonClassesRelations = relations(lessonClasses, ({one}) => ({
	class: one(classes, {
		fields: [lessonClasses.classId],
		references: [classes.id]
	}),
	lesson: one(lessons, {
		fields: [lessonClasses.lessonId],
		references: [lessons.id]
	}),
}));

export const stageYearLinksRelations = relations(stageYearLinks, ({one}) => ({
	schoolYear: one(schoolYears, {
		fields: [stageYearLinks.schoolYearId],
		references: [schoolYears.id]
	}),
	curriculumStage: one(curriculumStages, {
		fields: [stageYearLinks.stageId],
		references: [curriculumStages.id]
	}),
}));

export const classYearsRelations = relations(classYears, ({one}) => ({
	class: one(classes, {
		fields: [classYears.classId],
		references: [classes.id]
	}),
	schoolYear: one(schoolYears, {
		fields: [classYears.schoolYearId],
		references: [schoolYears.id]
	}),
}));

export const teacherSlideNotesRelations = relations(teacherSlideNotes, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [teacherSlideNotes.teacherUserId],
		references: [usersInAuth.id]
	}),
	topicSlide: one(topicSlides, {
		fields: [teacherSlideNotes.topicSlideId],
		references: [topicSlides.id]
	}),
}));

export const lessonSlideNotesRelations = relations(lessonSlideNotes, ({one}) => ({
	lesson: one(lessons, {
		fields: [lessonSlideNotes.lessonId],
		references: [lessons.id]
	}),
	topicSlide: one(topicSlides, {
		fields: [lessonSlideNotes.topicSlideId],
		references: [topicSlides.id]
	}),
}));