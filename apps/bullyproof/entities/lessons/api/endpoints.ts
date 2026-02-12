import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { lessons } from "@/server/db/schema";

type Lesson = typeof lessons.$inferSelect;

export const lessonsApi = {
  get: {
    list(params?: {
      schoolId?: string;
      teacherId?: string;
      classId?: string;
      topicId?: string;
      status?: string;
      limit?: number;
      offset?: number;
      search?: string;
    }): Promise<ApiResult<Lesson[]>> {
      const searchParams = new URLSearchParams();
      if (params?.schoolId) searchParams.set("schoolId", params.schoolId);
      if (params?.teacherId) searchParams.set("teacherId", params.teacherId);
      if (params?.classId) searchParams.set("classId", params.classId);
      if (params?.topicId) searchParams.set("topicId", params.topicId);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      return apiFetch<Lesson[]>(`/lessons${query ? `?${query}` : ""}`);
    },
    byId(id: string): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>(`/lessons/${encodeURIComponent(id)}`);
    },
    recommendations(params: { classIds: string[] }): Promise<ApiResult<{
      recommendedTopicId: string | null;
      recommendedTopic: {
        id: string;
        title: string;
        stageId: string;
        stageName: string;
        stageOrder: number | null;
      } | null;
      warning: {
        show: boolean;
        classes: Array<{
          classId: string;
          className: string;
          topicTitle: string;
          stageName: string;
        }>;
        multipleStages?: Array<{
          stageId: string;
          stageName: string;
          stageCode: string;
          stageSortIndex: number;
          classes: Array<{
            classId: string;
            className: string;
            yearCodes: string[];
          }>;
          firstTopic: {
            id: string;
            title: string;
            stageOrder: number | null;
          } | null;
        }>;
      } | null;
      reason: "next_topic" | "fallback_year_match" | "final_fallback" | null;
      completedLessonInfo: {
        lessonTitle: string;
        topicTitle: string;
        completedAt: string;
      } | null;
      activeLessons: Array<{
        lessonId: string;
        title: string;
        status: "preparing" | "ready" | "in_progress" | "feedback";
        topicId: string;
        topicTitle: string;
        classIds: string[];
        className: string;
        schoolId: string;
        schoolSlug: string | null;
        createdByUserId: string;
        ownerName: string | null;
        ownerEmail: string | null;
      }>;
    }>> {
      return apiFetch(`/lessons/recommendations`, {
        method: "POST",
        body: JSON.stringify({ classIds: params.classIds }),
      });
    },
  },
  post: {
    takeOver(lessonId: string): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>(
        `/lessons/${encodeURIComponent(lessonId)}/take-over`,
        { method: "POST" }
      );
    },
    create(payload: {
      schoolId: string;
      topicId: string;
      createdByUserId?: string;
      title?: string;
      description?: string;
      scheduledFor?: string;
      status?: string;
      classIds?: string[];
    }): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>("/lessons", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  put: {
    update(
      id: string,
      payload: {
        title?: string;
        description?: string;
        scheduledFor?: string;
        status?: string;
        classIds?: string[];
      }
    ): Promise<ApiResult<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>> {
      return apiFetch<Lesson & { topic?: any; teacher?: any; assignedClasses?: any[] }>(`/lessons/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  delete: {
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(`/lessons/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
  liveState: {
    get: {
      byLessonId(id: string): Promise<ApiResult<{
        liveState: {
          lesson_id: string;
          current_slide_id: string;
          current_index: number;
          is_paused: boolean;
          updated_at: string;
          updated_by: string;
        } | null;
        slides: Array<{
          lessonId: string;
          topicId: string;
          topicSlideId: string;
          orderIndex: number;
          kind: string;
          textHtml: string | null;
          imageUrl: string | null;
          videoUrl: string | null;
          videoStartS: number | null;
          videoEndS: number | null;
          effectiveNotes: string | null;
          teacherUserId: string | null;
        }>;
      }>> {
        return apiFetch(`/lessons/${encodeURIComponent(id)}/live-state`);
      },
    },
    post: {
      update(
        id: string,
        payload: {
          currentSlideId?: string;
          currentIndex?: number;
          isPaused?: boolean;
        }
      ): Promise<ApiResult<{
        lesson_id: string;
        current_slide_id: string;
        current_index: number;
        is_paused: boolean;
        updated_at: string;
        updated_by: string;
      }>> {
        return apiFetch(`/lessons/${encodeURIComponent(id)}/live-state`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
    },
  },
  feedback: {
    get: {
      byLessonId(id: string): Promise<ApiResult<{
        id: string;
        lessonId: string;
        teacherUserId: string;
        rating: number;
        comments: string | null;
        createdAt: string;
      }>> {
        return apiFetch(`/lessons/${encodeURIComponent(id)}/feedback`);
      },
    },
    post: {
      create(
        lessonId: string,
        payload: {
          rating: number;
          comments?: string;
        }
      ): Promise<ApiResult<{
        id: string;
        lessonId: string;
        teacherUserId: string;
        rating: number;
        comments: string | null;
        createdAt: string;
      }>> {
        return apiFetch(`/lessons/${encodeURIComponent(lessonId)}/feedback`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
    },
    put: {
      update(
        lessonId: string,
        payload: {
          rating?: number;
          comments?: string;
        }
      ): Promise<ApiResult<{
        id: string;
        lessonId: string;
        teacherUserId: string;
        rating: number;
        comments: string | null;
        createdAt: string;
      }>> {
        return apiFetch(`/lessons/${encodeURIComponent(lessonId)}/feedback`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      },
    },
  },
};
