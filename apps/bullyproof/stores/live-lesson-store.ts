import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

interface LiveLessonInfo {
  lessonId: string;
  schoolId: string;
  schoolSlug: string;
  title?: string | null;
  classCount?: number | null;
  startedAt?: string | null;
}

interface LiveLessonState {
  isLive: boolean;
  schoolSlug: string | null;
  lessonId: string | null;
  title?: string | null;
  classCount?: number | null;
  startedAt?: string | null; // ISO string
  liveLessonCount: number;
  liveLessonsBySchool: Record<string, LiveLessonInfo[]>; // schoolId -> lessons
  getUrl: () => string | null;
  getLessonsUrl: () => string | null; // URL to lessons page when multiple lessons
  getUniqueSchools: () => Array<{ schoolId: string; schoolSlug: string; count: number }>;
  needsSchoolSelection: () => boolean; // Returns true if multiple schools have live lessons
  startLiveLesson: (params: {
    schoolSlug: string;
    lessonId: string;
    title?: string;
    classCount?: number;
    startedAt?: string;
  }) => void;
  stopLiveLesson: () => void;
  fetchInProgressLesson: (teacherId?: string) => Promise<void>;
}

export const useLiveLessonStore = create<LiveLessonState>()(
  persist(
    (set, get) => ({
      isLive: false,
      schoolSlug: null,
      lessonId: null,
      title: null,
      classCount: null,
      startedAt: null,
      liveLessonCount: 0,
      liveLessonsBySchool: {},
      getUrl: () => {
        const { schoolSlug, lessonId, liveLessonCount } = get();
        if (!schoolSlug || !lessonId) return null;
        // Validate that schoolSlug is not a UUID - if it is, clear the state
        if (isUUID(schoolSlug)) {
          console.error("Invalid schoolSlug detected (UUID):", schoolSlug);
          set({
            isLive: false,
            schoolSlug: null,
            lessonId: null,
            title: null,
            classCount: null,
            startedAt: null,
            liveLessonCount: 0,
            liveLessonsBySchool: {},
          });
          return null;
        }
        // If only 1 lesson, return specific lesson URL
        if (liveLessonCount === 1) {
          return `/schools/${schoolSlug}/lessons/${lessonId}`;
        }
        // If multiple lessons from same school, return lessons page URL
        // If multiple schools, this will be handled by dialog
        return `/schools/${schoolSlug}/lessons`;
      },
      getLessonsUrl: () => {
        const { schoolSlug } = get();
        if (!schoolSlug) return null;
        // Validate that schoolSlug is not a UUID
        if (isUUID(schoolSlug)) {
          return null;
        }
        return `/schools/${schoolSlug}/lessons`;
      },
      getUniqueSchools: () => {
        const { liveLessonsBySchool } = get();
        return Object.entries(liveLessonsBySchool).map(([schoolId, lessons]) => ({
          schoolId,
          schoolSlug: lessons[0]?.schoolSlug || "",
          count: lessons.length,
        }));
      },
      needsSchoolSelection: () => {
        const { liveLessonsBySchool } = get();
        const uniqueSchools = Object.keys(liveLessonsBySchool);
        return uniqueSchools.length > 1;
      },
      startLiveLesson: ({
        schoolSlug,
        lessonId,
        title,
        classCount,
        startedAt,
      }) => {
        // Validate that schoolSlug is not a UUID
        if (isUUID(schoolSlug)) {
          console.error(
            "Cannot start live lesson with UUID as schoolSlug:",
            schoolSlug
          );
          return;
        }
        set({
          isLive: true,
          schoolSlug,
          lessonId,
          title: title ?? null,
          classCount: classCount ?? null,
          startedAt: startedAt ?? null,
          liveLessonCount: 1, // When manually starting, assume 1 lesson
          liveLessonsBySchool: {}, // Will be populated on fetch
        });
      },
      stopLiveLesson: () =>
        set({
          isLive: false,
          schoolSlug: null,
          lessonId: null,
          title: null,
          classCount: null,
          startedAt: null,
          liveLessonCount: 0,
          liveLessonsBySchool: {},
        }),
      fetchInProgressLesson: async (teacherId?: string) => {
        try {
          // If no teacherId provided, we can't fetch user-specific lessons
          if (!teacherId) {
            console.warn("No teacherId provided to fetchInProgressLesson, clearing state");
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
              liveLessonCount: 0,
              liveLessonsBySchool: {},
            });
            return;
          }

          // Fetch lessons with status 'in_progress' or 'feedback' for the current teacher
          // The API client (apiFetch) automatically handles authentication
          // Increase limit to get all live lessons
          const [inProgressResult, feedbackResult] = await Promise.all([
            lessonsApi.get.list({
              teacherId,
              status: "in_progress",
              limit: 100, // Get all in-progress lessons
            }),
            lessonsApi.get.list({
              teacherId,
              status: "feedback",
              limit: 100, // Get all feedback lessons
            }),
          ]);

          // Check for errors
          if (inProgressResult.error && feedbackResult.error) {
            // If both are auth errors (401/403), don't clear state - might be a timing issue
            if (
              (inProgressResult.error.status === 401 || inProgressResult.error.status === 403) &&
              (feedbackResult.error.status === 401 || feedbackResult.error.status === 403)
            ) {
              console.warn(
                "Auth error fetching live lessons - token may not be ready yet"
              );
              return;
            }
            console.error("Error fetching live lessons:", inProgressResult.error, feedbackResult.error);
            // If there's an error, clear the live lesson state
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
              liveLessonCount: 0,
              liveLessonsBySchool: {},
            });
            return;
          }

          // Combine results, prioritizing in_progress over feedback
          const inProgressLessons = inProgressResult.data || [];
          const feedbackLessons = feedbackResult.data || [];
          const allLiveLessons = [...inProgressLessons, ...feedbackLessons];

          if (allLiveLessons.length === 0) {
            // No live lessons found, clear the state
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
              liveLessonCount: 0,
              liveLessonsBySchool: {},
            });
            return;
          }

          const liveLessonCount = allLiveLessons.length;

          // Fetch user's schools to find the school by ID and get the slug
          const schoolsResult = await schoolApi.get.schools();

          if (schoolsResult.error || !schoolsResult.data) {
            // If it's an auth error (401/403), don't clear state - might be a timing issue
            if (
              schoolsResult.error?.status === 401 ||
              schoolsResult.error?.status === 403
            ) {
              console.warn(
                "Auth error fetching schools - token may not be ready yet"
              );
              return;
            }
            console.error("Error fetching schools:", schoolsResult.error);
            // If we can't get schools, we can't build the URL, so clear state
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
              liveLessonCount: 0,
            });
            return;
          }

          // Group lessons by school
          const lessonsBySchool: Record<string, LiveLessonInfo[]> = {};
          
          // Type assertion: list endpoint may return extended lesson data
          type LessonWithDetails = typeof allLiveLessons[0] & {
            topic?: { title?: string } | null;
            assignedClasses?: Array<unknown> | null;
          };

          for (const lesson of allLiveLessons) {
            const lessonWithDetails = lesson as LessonWithDetails;
            const school = schoolsResult.data.find(
              (s) => s.id === lesson.schoolId
            );

            if (!school) {
              console.warn("School not found for lesson:", lesson.schoolId);
              continue; // Skip lessons without valid schools
            }

            const schoolId = school.id;
            if (!lessonsBySchool[schoolId]) {
              lessonsBySchool[schoolId] = [];
            }

            const classCount = lessonWithDetails.assignedClasses?.length || 0;
            lessonsBySchool[schoolId].push({
              lessonId: lesson.id,
              schoolId: school.id,
              schoolSlug: school.slug,
              title: lessonWithDetails.topic?.title || null,
              classCount: classCount > 0 ? classCount : null,
              startedAt: lesson.scheduledFor || lesson.createdAt || null,
            });
          }

          // If no valid lessons found, clear state
          if (Object.keys(lessonsBySchool).length === 0) {
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
              liveLessonCount: 0,
              liveLessonsBySchool: {},
            });
            return;
          }

          // Get the first school's first lesson for backward compatibility
          const firstSchoolId = Object.keys(lessonsBySchool)[0];
          const firstSchoolLessons = lessonsBySchool[firstSchoolId];
          const firstLesson = firstSchoolLessons[0];
          const firstSchool = schoolsResult.data.find((s) => s.id === firstSchoolId);

          if (!firstSchool) {
            console.error("First school not found");
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
              liveLessonCount: 0,
              liveLessonsBySchool: {},
            });
            return;
          }

          // Set the live lesson state
          set({
            isLive: true,
            schoolSlug: firstSchool.slug,
            lessonId: firstLesson.lessonId,
            title: firstLesson.title,
            classCount: firstLesson.classCount,
            startedAt: firstLesson.startedAt,
            liveLessonCount: liveLessonCount,
            liveLessonsBySchool: lessonsBySchool,
          });
        } catch (error) {
          console.error("Error in fetchInProgressLesson:", error);
          // On error, clear the live lesson state
          set({
            isLive: false,
            schoolSlug: null,
            lessonId: null,
            title: null,
            classCount: null,
            startedAt: null,
            liveLessonCount: 0,
            liveLessonsBySchool: {},
          });
        }
      },
    }),
    {
      name: "live-lesson-store",
      partialize: (state) => {
        // Don't persist if schoolSlug is a UUID
        if (state.schoolSlug && isUUID(state.schoolSlug)) {
          console.warn(
            "Not persisting invalid state: schoolSlug is a UUID",
            state.schoolSlug
          );
          return {
            isLive: false,
            schoolSlug: null,
            lessonId: null,
            title: null,
            classCount: null,
            startedAt: null,
            liveLessonCount: 0,
            liveLessonsBySchool: {},
          };
        }
        return {
          isLive: state.isLive,
          schoolSlug: state.schoolSlug,
          lessonId: state.lessonId,
          title: state.title,
          classCount: state.classCount,
          startedAt: state.startedAt,
          liveLessonCount: state.liveLessonCount,
          liveLessonsBySchool: state.liveLessonsBySchool,
        };
      },
      onRehydrateStorage: () => (state) => {
        // Validate persisted state on rehydration - clear if schoolSlug is a UUID
        if (state?.schoolSlug && isUUID(state.schoolSlug)) {
          console.warn(
            "Clearing invalid persisted state: schoolSlug is a UUID",
            state.schoolSlug
          );
          // Clear the invalid state
          if (state) {
            state.isLive = false;
            state.schoolSlug = null;
            state.lessonId = null;
            state.title = null;
            state.classCount = null;
            state.startedAt = null;
            state.liveLessonCount = 0;
            state.liveLessonsBySchool = {};
          }
        }
      },
    }
  )
);
