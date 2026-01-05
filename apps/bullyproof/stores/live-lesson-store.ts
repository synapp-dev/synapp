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

interface LiveLessonState {
  isLive: boolean;
  schoolSlug: string | null;
  lessonId: string | null;
  title?: string | null;
  classCount?: number | null;
  startedAt?: string | null; // ISO string
  getUrl: () => string | null;
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
      getUrl: () => {
        const { schoolSlug, lessonId } = get();
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
          });
          return null;
        }
        return `/schools/${schoolSlug}/lessons/${lessonId}`;
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
            });
            return;
          }

          // Fetch lessons with status 'in_progress' or 'pending_review' for the current teacher
          // The API client (apiFetch) automatically handles authentication
          const [inProgressResult, pendingReviewResult] = await Promise.all([
            lessonsApi.get.list({
              teacherId,
              status: "in_progress",
              limit: 1,
            }),
            lessonsApi.get.list({
              teacherId,
              status: "pending_review",
              limit: 1,
            }),
          ]);

          // Check for errors
          if (inProgressResult.error && pendingReviewResult.error) {
            // If both are auth errors (401/403), don't clear state - might be a timing issue
            if (
              (inProgressResult.error.status === 401 || inProgressResult.error.status === 403) &&
              (pendingReviewResult.error.status === 401 || pendingReviewResult.error.status === 403)
            ) {
              console.warn(
                "Auth error fetching live lessons - token may not be ready yet"
              );
              return;
            }
            console.error("Error fetching live lessons:", inProgressResult.error, pendingReviewResult.error);
            // If there's an error, clear the live lesson state
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
            });
            return;
          }

          // Combine results, prioritizing in_progress over pending_review
          const inProgressLessons = inProgressResult.data || [];
          const pendingReviewLessons = pendingReviewResult.data || [];
          const allLiveLessons = [...inProgressLessons, ...pendingReviewLessons];

          if (allLiveLessons.length === 0) {
            // No live lessons found, clear the state
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
            });
            return;
          }

          // Get the first lesson (prioritizes in_progress if both exist)
          const lesson = allLiveLessons[0];

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
            });
            return;
          }

          // Find the school that matches the lesson's schoolId
          const school = schoolsResult.data.find(
            (s) => s.id === lesson.schoolId
          );

          if (!school) {
            console.error("School not found for lesson:", lesson.schoolId);
            // If we can't find the school, we can't build the URL, so clear state
            set({
              isLive: false,
              schoolSlug: null,
              lessonId: null,
              title: null,
              classCount: null,
              startedAt: null,
            });
            return;
          }

          // Type assertion: list endpoint may return extended lesson data
          type LessonWithDetails = typeof lesson & {
            topic?: { title?: string } | null;
            assignedClasses?: Array<unknown> | null;
          };
          const lessonWithDetails = lesson as LessonWithDetails;

          // Count assigned classes if available
          const classCount = lessonWithDetails.assignedClasses?.length || 0;

          // Set the live lesson state
          set({
            isLive: true,
            schoolSlug: school.slug,
            lessonId: lesson.id,
            title: lessonWithDetails.topic?.title || null,
            classCount: classCount > 0 ? classCount : null,
            startedAt: lesson.scheduledFor || lesson.createdAt || null,
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
          };
        }
        return {
          isLive: state.isLive,
          schoolSlug: state.schoolSlug,
          lessonId: state.lessonId,
          title: state.title,
          classCount: state.classCount,
          startedAt: state.startedAt,
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
          }
        }
      },
    }
  )
);
