import { relations } from "drizzle-orm/relations";
import { ssoProvidersInAuth, ssoDomainsInAuth, samlProvidersInAuth, certificationCourses, courseTopics, usersInAuth, mfaFactorsInAuth, sessionsInAuth, refreshTokensInAuth, flowStateInAuth, samlRelayStatesInAuth, mfaAmrClaimsInAuth, identitiesInAuth, oneTimeTokensInAuth, mfaChallengesInAuth, userProfile, oauthClientsInAuth, scopes, roles, slideViewingSessions, courseTopicSlides, quizQuestions, quizAnswers, courseTopicQuizzes, schoolSectors, schools, states, schoolLicences, schoolInvites, oauthAuthorizationsInAuth, courseTopicProgress, oauthConsentsInAuth, lessons, lessonFeedback, userSlideViews, quizAttempts, quizAttemptAnswers, classes, topics, curriculumStages, schoolLevels, schoolYears, topicSlides, lessonLiveState, userRoles, lessonSessions, lessonEvents, userSchoolPositions, courseProgress, courseTopicQuizCompletions, courseRatings, schoolLevelAssignments, stageYearLinks, classYears, lessonClasses, teacherClasses, teacherSlideNotes, lessonSlideNotes } from "./schema";

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
	courseTopicProgresses: many(courseTopicProgress),
	lessonFeedbacks: many(lessonFeedback),
	userSlideViews: many(userSlideViews),
	quizAttempts: many(quizAttempts),
	lessons: many(lessons),
	lessonLiveStates: many(lessonLiveState),
	userRoles: many(userRoles),
	lessonSessions: many(lessonSessions),
	lessonEvents: many(lessonEvents),
	userSchoolPositions: many(userSchoolPositions),
	courseProgresses: many(courseProgress),
	courseTopicQuizCompletions: many(courseTopicQuizCompletions),
	courseRatings: many(courseRatings),
	teacherClasses: many(teacherClasses),
	teacherSlideNotes: many(teacherSlideNotes),
}));

export const oauthClientsInAuthRelations = relations(oauthClientsInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
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
	schoolLicences: many(schoolLicences),
	schoolInvites: many(schoolInvites),
	classes: many(classes),
	lessons: many(lessons),
	userRoles: many(userRoles),
	userSchoolPositions: many(userSchoolPositions),
	schoolLevelAssignments: many(schoolLevelAssignments),
}));

export const schoolSectorsRelations = relations(schoolSectors, ({many}) => ({
	schools: many(schools),
}));

export const statesRelations = relations(states, ({many}) => ({
	schools: many(schools),
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
	lessonLiveStates: many(lessonLiveState),
	lessonSessions: many(lessonSessions),
	lessonEvents: many(lessonEvents),
	lessonClasses: many(lessonClasses),
	lessonSlideNotes: many(lessonSlideNotes),
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
	lessons: many(lessons),
	curriculumStage: one(curriculumStages, {
		fields: [topics.stageId],
		references: [curriculumStages.id]
	}),
	topicSlides: many(topicSlides),
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
}));

export const schoolLevelsRelations = relations(schoolLevels, ({many}) => ({
	schoolYears: many(schoolYears),
	schoolLevelAssignments: many(schoolLevelAssignments),
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