import { relations } from "drizzle-orm/relations";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  schoolLevels,
  schoolYears,
  usersInAuth, // eslint-disable-line @typescript-eslint/no-unused-vars
  userProfile,
  schools,
  classes,
  lessons,
  topics,
  scopes,
  roles,
  curriculumStages,
  topicSlides,
  lessonLiveState,
  userRoles,
  lessonEvents,
  lessonSessions,
  schoolInvites,
  schoolLicences,
  schoolSectors,
  states,
  schoolLevelAssignments,
  lessonClasses,
  stageYearLinks,
  classYears,
  teacherSlideNotes,
  lessonSlideNotes,
} from "./schema";

export const schoolYearsRelations = relations(schoolYears, ({ one, many }) => ({
  schoolLevel: one(schoolLevels, {
    fields: [schoolYears.levelId],
    references: [schoolLevels.id],
  }),
  stageYearLinks: many(stageYearLinks),
  classYears: many(classYears),
}));

export const schoolLevelsRelations = relations(schoolLevels, ({ many }) => ({
  schoolYears: many(schoolYears),
  schoolLevelAssignments: many(schoolLevelAssignments),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [userProfile.id],
    references: [usersInAuth.id],
  }),
}));

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  userProfiles: many(userProfile),
  lessons: many(lessons),
  lessonLiveStates: many(lessonLiveState),
  userRoles: many(userRoles),
  lessonEvents: many(lessonEvents),
  lessonSessions: many(lessonSessions),
  teacherSlideNotes: many(teacherSlideNotes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  lessonClasses: many(lessonClasses),
  classYears: many(classYears),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  classes: many(classes),
  lessons: many(lessons),
  userRoles: many(userRoles),
  schoolInvites: many(schoolInvites),
  schoolLicences: many(schoolLicences),
  schoolSector: one(schoolSectors, {
    fields: [schools.sectorId],
    references: [schoolSectors.id],
  }),
  state: one(states, {
    fields: [schools.stateId],
    references: [states.id],
  }),
  schoolLevelAssignments: many(schoolLevelAssignments),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [lessons.createdByUserId],
    references: [usersInAuth.id],
  }),
  school: one(schools, {
    fields: [lessons.schoolId],
    references: [schools.id],
  }),
  topic: one(topics, {
    fields: [lessons.topicId],
    references: [topics.id],
  }),
  lessonLiveStates: many(lessonLiveState),
  lessonEvents: many(lessonEvents),
  lessonSessions: many(lessonSessions),
  lessonClasses: many(lessonClasses),
  lessonSlideNotes: many(lessonSlideNotes),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  lessons: many(lessons),
  curriculumStage: one(curriculumStages, {
    fields: [topics.stageId],
    references: [curriculumStages.id],
  }),
  topicSlides: many(topicSlides),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  scope: one(scopes, {
    fields: [roles.scopeId],
    references: [scopes.id],
  }),
  userRoles: many(userRoles),
}));

export const scopesRelations = relations(scopes, ({ many }) => ({
  roles: many(roles),
}));

export const curriculumStagesRelations = relations(
  curriculumStages,
  ({ many }) => ({
    topics: many(topics),
    stageYearLinks: many(stageYearLinks),
  })
);

export const lessonLiveStateRelations = relations(
  lessonLiveState,
  ({ one }) => ({
    topicSlide: one(topicSlides, {
      fields: [lessonLiveState.currentSlideId],
      references: [topicSlides.id],
    }),
    lesson: one(lessons, {
      fields: [lessonLiveState.lessonId],
      references: [lessons.id],
    }),
    usersInAuth: one(usersInAuth, {
      fields: [lessonLiveState.updatedBy],
      references: [usersInAuth.id],
    }),
  })
);

export const topicSlidesRelations = relations(topicSlides, ({ one, many }) => ({
  lessonLiveStates: many(lessonLiveState),
  topic: one(topics, {
    fields: [topicSlides.topicId],
    references: [topics.id],
  }),
  teacherSlideNotes: many(teacherSlideNotes),
  lessonSlideNotes: many(lessonSlideNotes),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  school: one(schools, {
    fields: [userRoles.schoolId],
    references: [schools.id],
  }),
  usersInAuth: one(usersInAuth, {
    fields: [userRoles.userId],
    references: [usersInAuth.id],
  }),
}));

export const lessonEventsRelations = relations(lessonEvents, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [lessonEvents.actorUserId],
    references: [usersInAuth.id],
  }),
  lesson: one(lessons, {
    fields: [lessonEvents.lessonId],
    references: [lessons.id],
  }),
  lessonSession: one(lessonSessions, {
    fields: [lessonEvents.sessionId],
    references: [lessonSessions.id],
  }),
}));

export const lessonSessionsRelations = relations(
  lessonSessions,
  ({ one, many }) => ({
    lessonEvents: many(lessonEvents),
    lesson: one(lessons, {
      fields: [lessonSessions.lessonId],
      references: [lessons.id],
    }),
    usersInAuth: one(usersInAuth, {
      fields: [lessonSessions.startedBy],
      references: [usersInAuth.id],
    }),
  })
);

export const schoolInvitesRelations = relations(schoolInvites, ({ one }) => ({
  school: one(schools, {
    fields: [schoolInvites.schoolId],
    references: [schools.id],
  }),
}));

export const schoolLicencesRelations = relations(schoolLicences, ({ one }) => ({
  school: one(schools, {
    fields: [schoolLicences.schoolId],
    references: [schools.id],
  }),
}));

export const schoolSectorsRelations = relations(schoolSectors, ({ many }) => ({
  schools: many(schools),
}));

export const statesRelations = relations(states, ({ many }) => ({
  schools: many(schools),
}));

export const schoolLevelAssignmentsRelations = relations(
  schoolLevelAssignments,
  ({ one }) => ({
    schoolLevel: one(schoolLevels, {
      fields: [schoolLevelAssignments.levelId],
      references: [schoolLevels.id],
    }),
    school: one(schools, {
      fields: [schoolLevelAssignments.schoolId],
      references: [schools.id],
    }),
  })
);

export const lessonClassesRelations = relations(lessonClasses, ({ one }) => ({
  class: one(classes, {
    fields: [lessonClasses.classId],
    references: [classes.id],
  }),
  lesson: one(lessons, {
    fields: [lessonClasses.lessonId],
    references: [lessons.id],
  }),
}));

export const stageYearLinksRelations = relations(stageYearLinks, ({ one }) => ({
  schoolYear: one(schoolYears, {
    fields: [stageYearLinks.schoolYearId],
    references: [schoolYears.id],
  }),
  curriculumStage: one(curriculumStages, {
    fields: [stageYearLinks.stageId],
    references: [curriculumStages.id],
  }),
}));

export const classYearsRelations = relations(classYears, ({ one }) => ({
  class: one(classes, {
    fields: [classYears.classId],
    references: [classes.id],
  }),
  schoolYear: one(schoolYears, {
    fields: [classYears.schoolYearId],
    references: [schoolYears.id],
  }),
}));

export const teacherSlideNotesRelations = relations(
  teacherSlideNotes,
  ({ one }) => ({
    usersInAuth: one(usersInAuth, {
      fields: [teacherSlideNotes.teacherUserId],
      references: [usersInAuth.id],
    }),
    topicSlide: one(topicSlides, {
      fields: [teacherSlideNotes.topicSlideId],
      references: [topicSlides.id],
    }),
  })
);

export const lessonSlideNotesRelations = relations(
  lessonSlideNotes,
  ({ one }) => ({
    lesson: one(lessons, {
      fields: [lessonSlideNotes.lessonId],
      references: [lessons.id],
    }),
    topicSlide: one(topicSlides, {
      fields: [lessonSlideNotes.topicSlideId],
      references: [topicSlides.id],
    }),
  })
);
