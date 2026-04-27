import { relations } from "drizzle-orm/relations";
import { ssoProvidersInAuth, ssoDomainsInAuth, samlProvidersInAuth, certificationCourses, courseTopics, usersInAuth, mfaFactorsInAuth, sessionsInAuth, refreshTokensInAuth, flowStateInAuth, samlRelayStatesInAuth, mfaAmrClaimsInAuth, identitiesInAuth, oneTimeTokensInAuth, mfaChallengesInAuth, userProfile, oauthClientsInAuth, scopes, roles, slideViewingSessions, courseTopicSlides, quizQuestions, quizAnswers, courseTopicQuizzes, schoolSectors, schools, states, resourceFolders, resourceFiles, schoolLicences, schoolInvites, featurePermissions, features, oauthAuthorizationsInAuth, courseTopicProgress, oauthConsentsInAuth, lessons, lessonFeedback, userSlideViews, quizAttempts, quizAttemptAnswers, teacherSlideNotes, topicSlides, classes, topics, curriculumStages, schoolLevels, schoolYears, lessonSlideNotes, lessonLiveState, userRoles, lessonSessions, lessonEvents, userSessions, userSchoolPositions, courseProgress, courseTopicQuizCompletions, courseRatings, permissionTemplates, permissionTemplateRules, topicLessonPlans, feedbackTickets, schoolLevelAssignments, stageYearLinks, classYears, lessonClasses, schoolYearAssignments, teacherClasses, resourceFileTopics, schoolCultureBenchmarks, schoolCultureComparativePeriods, schoolCultureReportRequests } from "./schema";

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

export const courseTopicsRelations = relations(courseTopics, ({one, many}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [courseTopics.courseId],
		references: [certificationCourses.id]
	}),
	slideViewingSessions: many(slideViewingSessions),
	courseTopicQuizzes: many(courseTopicQuizzes),
	courseTopicProgresses: many(courseTopicProgress),
	courseTopicSlides: many(courseTopicSlides),
	userSlideViews: many(userSlideViews),
	quizAttempts: many(quizAttempts),
	courseProgresses: many(courseProgress),
	courseTopicQuizCompletions: many(courseTopicQuizCompletions),
}));

export const certificationCoursesRelations = relations(certificationCourses, ({many}) => ({
	courseTopics: many(courseTopics),
	slideViewingSessions: many(slideViewingSessions),
	courseTopicProgresses: many(courseTopicProgress),
	userSlideViews: many(userSlideViews),
	quizAttempts: many(quizAttempts),
	courseProgresses: many(courseProgress),
	courseRatings: many(courseRatings),
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
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	userSessions: many(userSessions),
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

export const userProfileRelations = relations(userProfile, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userProfile.id],
		references: [usersInAuth.id]
	}),
	slideViewingSessions: many(slideViewingSessions),
	resourceFiles: many(resourceFiles),
	resourceFolders: many(resourceFolders),
	featurePermissions: many(featurePermissions),
	courseTopicProgresses: many(courseTopicProgress),
	lessonFeedbacks: many(lessonFeedback),
	userSlideViews: many(userSlideViews),
	quizAttempts: many(quizAttempts),
	teacherSlideNotes: many(teacherSlideNotes),
	lessons: many(lessons),
	lessonLiveStates: many(lessonLiveState),
	userRoles: many(userRoles),
	lessonSessions: many(lessonSessions),
	lessonEvents: many(lessonEvents),
	userSessions: many(userSessions),
	userSchoolPositions: many(userSchoolPositions),
	courseProgresses: many(courseProgress),
	courseTopicQuizCompletions: many(courseTopicQuizCompletions),
	courseRatings: many(courseRatings),
	permissionTemplates: many(permissionTemplates),
	topicLessonPlans: many(topicLessonPlans),
	feedbackTickets: many(feedbackTickets),
	teacherClasses: many(teacherClasses),
	resourceFileTopics: many(resourceFileTopics),
}));

export const oauthClientsInAuthRelations = relations(oauthClientsInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	userSessions: many(userSessions),
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

export const slideViewingSessionsRelations = relations(slideViewingSessions, ({one}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [slideViewingSessions.courseId],
		references: [certificationCourses.id]
	}),
	courseTopicSlide: one(courseTopicSlides, {
		fields: [slideViewingSessions.slideId],
		references: [courseTopicSlides.id]
	}),
	courseTopic: one(courseTopics, {
		fields: [slideViewingSessions.topicId],
		references: [courseTopics.id]
	}),
	userProfile: one(userProfile, {
		fields: [slideViewingSessions.userId],
		references: [userProfile.id]
	}),
}));

export const courseTopicSlidesRelations = relations(courseTopicSlides, ({one, many}) => ({
	slideViewingSessions: many(slideViewingSessions),
	courseTopicProgresses: many(courseTopicProgress),
	courseTopic: one(courseTopics, {
		fields: [courseTopicSlides.topicId],
		references: [courseTopics.id]
	}),
	userSlideViews: many(userSlideViews),
}));

export const quizAnswersRelations = relations(quizAnswers, ({one, many}) => ({
	quizQuestion: one(quizQuestions, {
		fields: [quizAnswers.questionId],
		references: [quizQuestions.id]
	}),
	quizAttemptAnswers: many(quizAttemptAnswers),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({one, many}) => ({
	quizAnswers: many(quizAnswers),
	courseTopicQuizz: one(courseTopicQuizzes, {
		fields: [quizQuestions.quizId],
		references: [courseTopicQuizzes.id]
	}),
	quizAttemptAnswers: many(quizAttemptAnswers),
}));

export const courseTopicQuizzesRelations = relations(courseTopicQuizzes, ({one, many}) => ({
	quizQuestions: many(quizQuestions),
	courseTopic: one(courseTopics, {
		fields: [courseTopicQuizzes.topicId],
		references: [courseTopics.id]
	}),
	quizAttempts: many(quizAttempts),
	courseTopicQuizCompletions: many(courseTopicQuizCompletions),
}));

export const schoolsRelations = relations(schools, ({one, many}) => ({
	schoolSector: one(schoolSectors, {
		fields: [schools.sectorId],
		references: [schoolSectors.id]
	}),
	state: one(states, {
		fields: [schools.stateId],
		references: [states.id]
	}),
	resourceFiles: many(resourceFiles),
	schoolLicences: many(schoolLicences),
	resourceFolders: many(resourceFolders),
	schoolInvites: many(schoolInvites),
	featurePermissions: many(featurePermissions),
	classes: many(classes),
	lessons: many(lessons),
	userRoles: many(userRoles),
	userSchoolPositions: many(userSchoolPositions),
	schoolLevelAssignments: many(schoolLevelAssignments),
	schoolYearAssignments: many(schoolYearAssignments),
	schoolCultureBenchmark: one(schoolCultureBenchmarks, {
		fields: [schools.id],
		references: [schoolCultureBenchmarks.schoolId],
	}),
	schoolCultureComparativePeriods: many(schoolCultureComparativePeriods),
}));

export const schoolCultureBenchmarksRelations = relations(schoolCultureBenchmarks, ({one}) => ({
	school: one(schools, {
		fields: [schoolCultureBenchmarks.schoolId],
		references: [schools.id],
	}),
}));

export const schoolCultureComparativePeriodsRelations = relations(
	schoolCultureComparativePeriods,
	({one}) => ({
		school: one(schools, {
			fields: [schoolCultureComparativePeriods.schoolId],
			references: [schools.id],
		}),
		reportRequest: one(schoolCultureReportRequests, {
			fields: [schoolCultureComparativePeriods.id],
			references: [schoolCultureReportRequests.comparativePeriodId],
		}),
	}),
);

export const schoolCultureReportRequestsRelations = relations(
	schoolCultureReportRequests,
	({one}) => ({
		comparativePeriod: one(schoolCultureComparativePeriods, {
			fields: [schoolCultureReportRequests.comparativePeriodId],
			references: [schoolCultureComparativePeriods.id],
		}),
	}),
);

export const schoolSectorsRelations = relations(schoolSectors, ({many}) => ({
	schools: many(schools),
}));

export const statesRelations = relations(states, ({many}) => ({
	schools: many(schools),
}));

export const resourceFilesRelations = relations(resourceFiles, ({one, many}) => ({
	resourceFolder: one(resourceFolders, {
		fields: [resourceFiles.folderId],
		references: [resourceFolders.id]
	}),
	school: one(schools, {
		fields: [resourceFiles.schoolId],
		references: [schools.id]
	}),
	userProfile: one(userProfile, {
		fields: [resourceFiles.uploadedBy],
		references: [userProfile.id]
	}),
	resourceFileTopics: many(resourceFileTopics),
}));

export const resourceFoldersRelations = relations(resourceFolders, ({one, many}) => ({
	resourceFiles: many(resourceFiles),
	userProfile: one(userProfile, {
		fields: [resourceFolders.createdBy],
		references: [userProfile.id]
	}),
	resourceFolder: one(resourceFolders, {
		fields: [resourceFolders.parentId],
		references: [resourceFolders.id],
		relationName: "resourceFolders_parentId_resourceFolders_id"
	}),
	resourceFolders: many(resourceFolders, {
		relationName: "resourceFolders_parentId_resourceFolders_id"
	}),
	school: one(schools, {
		fields: [resourceFolders.schoolId],
		references: [schools.id]
	}),
}));

export const schoolLicencesRelations = relations(schoolLicences, ({one}) => ({
	school: one(schools, {
		fields: [schoolLicences.schoolId],
		references: [schools.id]
	}),
}));

export const schoolInvitesRelations = relations(schoolInvites, ({one}) => ({
	school: one(schools, {
		fields: [schoolInvites.schoolId],
		references: [schools.id]
	}),
}));

export const featurePermissionsRelations = relations(featurePermissions, ({one}) => ({
	userProfile: one(userProfile, {
		fields: [featurePermissions.createdBy],
		references: [userProfile.id]
	}),
	feature: one(features, {
		fields: [featurePermissions.featureId],
		references: [features.id]
	}),
	school: one(schools, {
		fields: [featurePermissions.schoolId],
		references: [schools.id]
	}),
}));

export const featuresRelations = relations(features, ({many}) => ({
	featurePermissions: many(featurePermissions),
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

export const courseTopicProgressRelations = relations(courseTopicProgress, ({one, many}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [courseTopicProgress.courseId],
		references: [certificationCourses.id]
	}),
	courseTopicSlide: one(courseTopicSlides, {
		fields: [courseTopicProgress.currentSlideId],
		references: [courseTopicSlides.id]
	}),
	courseTopic: one(courseTopics, {
		fields: [courseTopicProgress.topicId],
		references: [courseTopics.id]
	}),
	userProfile: one(userProfile, {
		fields: [courseTopicProgress.userId],
		references: [userProfile.id]
	}),
	quizAttempts: many(quizAttempts),
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

export const lessonFeedbackRelations = relations(lessonFeedback, ({one}) => ({
	lesson: one(lessons, {
		fields: [lessonFeedback.lessonId],
		references: [lessons.id]
	}),
	userProfile: one(userProfile, {
		fields: [lessonFeedback.teacherUserId],
		references: [userProfile.id]
	}),
}));

export const lessonsRelations = relations(lessons, ({one, many}) => ({
	lessonFeedbacks: many(lessonFeedback),
	userProfile: one(userProfile, {
		fields: [lessons.createdByUserId],
		references: [userProfile.id]
	}),
	school: one(schools, {
		fields: [lessons.schoolId],
		references: [schools.id]
	}),
	topic: one(topics, {
		fields: [lessons.topicId],
		references: [topics.id]
	}),
	lessonSlideNotes: many(lessonSlideNotes),
	lessonLiveStates: many(lessonLiveState),
	lessonSessions: many(lessonSessions),
	lessonEvents: many(lessonEvents),
	lessonClasses: many(lessonClasses),
}));

export const userSlideViewsRelations = relations(userSlideViews, ({one}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [userSlideViews.courseId],
		references: [certificationCourses.id]
	}),
	courseTopicSlide: one(courseTopicSlides, {
		fields: [userSlideViews.slideId],
		references: [courseTopicSlides.id]
	}),
	courseTopic: one(courseTopics, {
		fields: [userSlideViews.topicId],
		references: [courseTopics.id]
	}),
	userProfile: one(userProfile, {
		fields: [userSlideViews.userId],
		references: [userProfile.id]
	}),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({one, many}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [quizAttempts.courseId],
		references: [certificationCourses.id]
	}),
	courseTopicQuizz: one(courseTopicQuizzes, {
		fields: [quizAttempts.quizId],
		references: [courseTopicQuizzes.id]
	}),
	courseTopic: one(courseTopics, {
		fields: [quizAttempts.topicId],
		references: [courseTopics.id]
	}),
	courseTopicProgress: one(courseTopicProgress, {
		fields: [quizAttempts.topicProgressId],
		references: [courseTopicProgress.id]
	}),
	userProfile: one(userProfile, {
		fields: [quizAttempts.userId],
		references: [userProfile.id]
	}),
	quizAttemptAnswers: many(quizAttemptAnswers),
	courseTopicQuizCompletions: many(courseTopicQuizCompletions),
}));

export const quizAttemptAnswersRelations = relations(quizAttemptAnswers, ({one}) => ({
	quizAnswer: one(quizAnswers, {
		fields: [quizAttemptAnswers.answerId],
		references: [quizAnswers.id]
	}),
	quizAttempt: one(quizAttempts, {
		fields: [quizAttemptAnswers.attemptId],
		references: [quizAttempts.id]
	}),
	quizQuestion: one(quizQuestions, {
		fields: [quizAttemptAnswers.questionId],
		references: [quizQuestions.id]
	}),
}));

export const teacherSlideNotesRelations = relations(teacherSlideNotes, ({one}) => ({
	userProfile: one(userProfile, {
		fields: [teacherSlideNotes.teacherUserId],
		references: [userProfile.id]
	}),
	topicSlide: one(topicSlides, {
		fields: [teacherSlideNotes.topicSlideId],
		references: [topicSlides.id]
	}),
}));

export const topicSlidesRelations = relations(topicSlides, ({one, many}) => ({
	teacherSlideNotes: many(teacherSlideNotes),
	topic: one(topics, {
		fields: [topicSlides.topicId],
		references: [topics.id]
	}),
	lessonSlideNotes: many(lessonSlideNotes),
	lessonLiveStates: many(lessonLiveState),
}));

export const classesRelations = relations(classes, ({one, many}) => ({
	school: one(schools, {
		fields: [classes.schoolId],
		references: [schools.id]
	}),
	classYears: many(classYears),
	lessonClasses: many(lessonClasses),
	teacherClasses: many(teacherClasses),
}));

export const topicsRelations = relations(topics, ({one, many}) => ({
	topicSlides: many(topicSlides),
	curriculumStage: one(curriculumStages, {
		fields: [topics.stageId],
		references: [curriculumStages.id]
	}),
	lessons: many(lessons),
	topicLessonPlans: many(topicLessonPlans),
	resourceFileTopics: many(resourceFileTopics),
}));

export const curriculumStagesRelations = relations(curriculumStages, ({many}) => ({
	topics: many(topics),
	stageYearLinks: many(stageYearLinks),
}));

export const schoolYearsRelations = relations(schoolYears, ({one, many}) => ({
	schoolLevel: one(schoolLevels, {
		fields: [schoolYears.levelId],
		references: [schoolLevels.id]
	}),
	stageYearLinks: many(stageYearLinks),
	classYears: many(classYears),
	schoolYearAssignments: many(schoolYearAssignments),
}));

export const schoolLevelsRelations = relations(schoolLevels, ({many}) => ({
	schoolYears: many(schoolYears),
	schoolLevelAssignments: many(schoolLevelAssignments),
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

export const lessonLiveStateRelations = relations(lessonLiveState, ({one}) => ({
	topicSlide: one(topicSlides, {
		fields: [lessonLiveState.currentSlideId],
		references: [topicSlides.id]
	}),
	lesson: one(lessons, {
		fields: [lessonLiveState.lessonId],
		references: [lessons.id]
	}),
	userProfile: one(userProfile, {
		fields: [lessonLiveState.updatedBy],
		references: [userProfile.id]
	}),
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
	userProfile: one(userProfile, {
		fields: [userRoles.userId],
		references: [userProfile.id]
	}),
}));

export const lessonSessionsRelations = relations(lessonSessions, ({one, many}) => ({
	lesson: one(lessons, {
		fields: [lessonSessions.lessonId],
		references: [lessons.id]
	}),
	userProfile: one(userProfile, {
		fields: [lessonSessions.startedBy],
		references: [userProfile.id]
	}),
	lessonEvents: many(lessonEvents),
}));

export const lessonEventsRelations = relations(lessonEvents, ({one}) => ({
	userProfile: one(userProfile, {
		fields: [lessonEvents.actorUserId],
		references: [userProfile.id]
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

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [userSessions.oauthClientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [userSessions.userId],
		references: [usersInAuth.id]
	}),
	userProfile: one(userProfile, {
		fields: [userSessions.userId],
		references: [userProfile.id]
	}),
}));

export const userSchoolPositionsRelations = relations(userSchoolPositions, ({one}) => ({
	school: one(schools, {
		fields: [userSchoolPositions.schoolId],
		references: [schools.id]
	}),
	userProfile: one(userProfile, {
		fields: [userSchoolPositions.userId],
		references: [userProfile.id]
	}),
}));

export const courseProgressRelations = relations(courseProgress, ({one}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [courseProgress.courseId],
		references: [certificationCourses.id]
	}),
	courseTopic: one(courseTopics, {
		fields: [courseProgress.currentTopicId],
		references: [courseTopics.id]
	}),
	userProfile: one(userProfile, {
		fields: [courseProgress.userId],
		references: [userProfile.id]
	}),
}));

export const courseTopicQuizCompletionsRelations = relations(courseTopicQuizCompletions, ({one}) => ({
	quizAttempt: one(quizAttempts, {
		fields: [courseTopicQuizCompletions.passedAttemptId],
		references: [quizAttempts.id]
	}),
	courseTopicQuizz: one(courseTopicQuizzes, {
		fields: [courseTopicQuizCompletions.quizId],
		references: [courseTopicQuizzes.id]
	}),
	courseTopic: one(courseTopics, {
		fields: [courseTopicQuizCompletions.topicId],
		references: [courseTopics.id]
	}),
	userProfile: one(userProfile, {
		fields: [courseTopicQuizCompletions.userId],
		references: [userProfile.id]
	}),
}));

export const courseRatingsRelations = relations(courseRatings, ({one}) => ({
	certificationCourse: one(certificationCourses, {
		fields: [courseRatings.courseId],
		references: [certificationCourses.id]
	}),
	userProfile: one(userProfile, {
		fields: [courseRatings.userId],
		references: [userProfile.id]
	}),
}));

export const permissionTemplateRulesRelations = relations(permissionTemplateRules, ({one}) => ({
	permissionTemplate: one(permissionTemplates, {
		fields: [permissionTemplateRules.templateId],
		references: [permissionTemplates.id]
	}),
}));

export const permissionTemplatesRelations = relations(permissionTemplates, ({one, many}) => ({
	permissionTemplateRules: many(permissionTemplateRules),
	userProfile: one(userProfile, {
		fields: [permissionTemplates.createdBy],
		references: [userProfile.id]
	}),
}));

export const topicLessonPlansRelations = relations(topicLessonPlans, ({one}) => ({
	topic: one(topics, {
		fields: [topicLessonPlans.topicId],
		references: [topics.id]
	}),
	userProfile: one(userProfile, {
		fields: [topicLessonPlans.uploadedBy],
		references: [userProfile.id]
	}),
}));

export const feedbackTicketsRelations = relations(feedbackTickets, ({one}) => ({
	userProfile: one(userProfile, {
		fields: [feedbackTickets.userId],
		references: [userProfile.id]
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

export const schoolYearAssignmentsRelations = relations(schoolYearAssignments, ({one}) => ({
	school: one(schools, {
		fields: [schoolYearAssignments.schoolId],
		references: [schools.id]
	}),
	schoolYear: one(schoolYears, {
		fields: [schoolYearAssignments.schoolYearId],
		references: [schoolYears.id]
	}),
}));

export const teacherClassesRelations = relations(teacherClasses, ({one}) => ({
	class: one(classes, {
		fields: [teacherClasses.classId],
		references: [classes.id]
	}),
	userProfile: one(userProfile, {
		fields: [teacherClasses.userId],
		references: [userProfile.id]
	}),
}));

export const resourceFileTopicsRelations = relations(resourceFileTopics, ({one}) => ({
	userProfile: one(userProfile, {
		fields: [resourceFileTopics.createdBy],
		references: [userProfile.id]
	}),
	resourceFile: one(resourceFiles, {
		fields: [resourceFileTopics.fileId],
		references: [resourceFiles.id]
	}),
	topic: one(topics, {
		fields: [resourceFileTopics.topicId],
		references: [topics.id]
	}),
}));