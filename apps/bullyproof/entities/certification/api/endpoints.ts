import {
  apiFetch,
  type ApiResult,
} from "@/lib/api/fetcher.client";
import type {
  certificationCourses,
  courseTopics,
  courseTopicSlides,
  courseTopicQuizzes,
  quizQuestions,
  quizAnswers,
} from "@/server/db/schema";

type Course = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

type Topic = typeof courseTopics.$inferSelect & {
  slides?: Array<typeof courseTopicSlides.$inferSelect>;
};

type EnrichedTopic = {
  topicId: string;
  courseId: string;
  topicTitle: string;
  courseOrder: number;
  topicStatus: string;
  topicCreatedAt: string;
  slideCount: number;
  hasQuiz: boolean;
  quizCompleted: boolean;
  quizScorePercentage: number | null;
};

type Slide = typeof courseTopicSlides.$inferSelect;

type Quiz = typeof courseTopicQuizzes.$inferSelect;
type QuizQuestion = typeof quizQuestions.$inferSelect;
type QuizAnswer = typeof quizAnswers.$inferSelect;

export const certificationApi = {
  courses: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Course[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Course[]>(
        `/certification/courses${query ? `?${query}` : ""}`
      );
    },
    byId(id: string): Promise<ApiResult<Course & { topicCount?: number }>> {
      return apiFetch<Course & { topicCount?: number }>(
        `/certification/courses/${encodeURIComponent(id)}`
      );
    },
    byCode(code: string): Promise<ApiResult<Course & { topicCount?: number }>> {
      return apiFetch<Course & { topicCount?: number }>(
        `/certification/courses/by-code/${encodeURIComponent(code)}`
      );
    },
    bySlug(slug: string): Promise<ApiResult<Course & { topicCount?: number }>> {
      return apiFetch<Course & { topicCount?: number }>(
        `/certification/courses/by-slug/${encodeURIComponent(slug)}`
      );
    },
    progress: {
      byCode(code: string): Promise<ApiResult<{ progress: any[] }>> {
        return apiFetch<{ progress: any[] }>(
          `/certification/courses/by-code/${encodeURIComponent(code)}/progress`
        );
      },
    },
    create(data: {
      code: string;
      name: string;
      sortIndex?: number;
      certificateType?: "none" | "completion" | "achievement" | "custom" | null;
    }): Promise<ApiResult<Course>> {
      return apiFetch<Course>("/certification/courses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(
      id: string,
      data: {
        name?: string;
        sortIndex?: number;
        certificateType?: "none" | "completion" | "achievement" | "custom" | null;
      }
    ): Promise<ApiResult<Course>> {
      return apiFetch<Course>(`/certification/courses/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/certification/courses/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
    },
  },
  // Legacy stages endpoint for backward compatibility (deprecated)
  stages: {
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Course[]>> {
      return certificationApi.courses.list(params);
    },
    byId(id: string): Promise<ApiResult<Course & { topicCount?: number }>> {
      return certificationApi.courses.byId(id);
    },
    byCode(code: string): Promise<ApiResult<Course & { topicCount?: number }>> {
      return certificationApi.courses.byCode(code);
    },
    progress: {
      byCode(code: string): Promise<ApiResult<{ progress: any[] }>> {
        return certificationApi.courses.progress.byCode(code);
      },
    },
    create(data: {
      code: string;
      name: string;
      sortIndex?: number;
    }): Promise<ApiResult<Course>> {
      return certificationApi.courses.create(data);
    },
    update(
      id: string,
      data: { name?: string; sortIndex?: number }
    ): Promise<ApiResult<Course>> {
      return certificationApi.courses.update(id, data);
    },
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return certificationApi.courses.delete(id);
    },
  },
  topics: {
    byId(
      id: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic>> {
      const searchParams = new URLSearchParams();
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic>(
        `/certification/topics/${encodeURIComponent(id)}${query ? `?${query}` : ""}`
      );
    },
    byCourseCode(
      code: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic[]>> {
      const searchParams = new URLSearchParams();
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic[]>(
        `/certification/topics/by-course-code/${encodeURIComponent(code)}${query ? `?${query}` : ""}`
      );
    },
    bySlug(
      courseCode: string,
      slug: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic>> {
      const searchParams = new URLSearchParams();
      if (params?.includeSlides) searchParams.set("includeSlides", "true");
      if (params?.includeUrls) searchParams.set("includeUrls", "true");

      const query = searchParams.toString();
      return apiFetch<Topic>(
        `/certification/topics/by-slug/${encodeURIComponent(courseCode)}/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`
      );
    },
    // Legacy byStageCode endpoint for backward compatibility (deprecated)
    byStageCode(
      code: string,
      params?: {
        includeSlides?: boolean;
        includeUrls?: boolean;
      }
    ): Promise<ApiResult<Topic[]>> {
      return certificationApi.topics.byCourseCode(code, params);
    },
    enriched: {
      byCourseCode(code: string): Promise<ApiResult<EnrichedTopic[]>> {
        return apiFetch<EnrichedTopic[]>(
          `/certification/topics/enriched?courseCode=${encodeURIComponent(code)}`
        );
      },
    },
    create(data: {
      courseId: string;
      title: string;
      officialNotes?: string | null;
      courseOrder?: number | null;
      isSequential?: boolean;
      quizCompletionPercentage?: number;
    }): Promise<ApiResult<Topic>> {
      return apiFetch<Topic>("/certification/topics", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(
      id: string,
      data: {
        title?: string;
        officialNotes?: string | null;
        status?: "draft" | "published" | "archived";
        courseOrder?: number | null;
        isSequential?: boolean;
        quizCompletionPercentage?: number;
      }
    ): Promise<ApiResult<Topic>> {
      return apiFetch<Topic>(`/certification/topics/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/certification/topics/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
    },
    reorder(data: {
      courseId: string;
      topicIds: string[];
    }): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>("/certification/topics/reorder", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    slides: {
      list(topicId: string): Promise<ApiResult<Slide[]>> {
        return apiFetch<Slide[]>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides`
        );
      },
      create(
        topicId: string,
        payload: {
          orderIndex: number;
          kind: "image" | "video" | "text";
          imageUrl?: string | null;
          videoUrl?: string | null;
          textHtml?: string | null;
          videoStartS?: number | null;
          videoEndS?: number | null;
        }
      ): Promise<ApiResult<Slide>> {
        return apiFetch<Slide>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
      update(
        topicId: string,
        slideId: string,
        payload: {
          kind?: "image" | "video" | "text";
          imageUrl?: string | null;
          videoUrl?: string | null;
          textHtml?: string | null;
          videoStartS?: number | null;
          videoEndS?: number | null;
          orderIndex?: number;
        }
      ): Promise<ApiResult<Slide>> {
        return apiFetch<Slide>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/${encodeURIComponent(slideId)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      },
      delete(
        topicId: string,
        slideId: string
      ): Promise<ApiResult<{ success: boolean }>> {
        return apiFetch<{ success: boolean }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/${encodeURIComponent(slideId)}`,
          {
            method: "DELETE",
          }
        );
      },
      bulkSave(
        topicId: string,
        formData: FormData
      ): Promise<ApiResult<{ success: boolean; topic: Topic }>> {
        return apiFetch<{ success: boolean; topic: Topic }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/bulk`,
          {
            method: "POST",
            body: formData,
          }
        );
      },
      getImageUrl(slideId: string): Promise<ApiResult<{ url: string | null }>> {
        return apiFetch<{ url: string | null }>(
          `/certification-slides/${encodeURIComponent(slideId)}/url`
        );
      },
      markViewed(topicId: string, slideId: string): Promise<ApiResult<{ success: boolean }>> {
        return apiFetch<{ success: boolean }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides/${encodeURIComponent(slideId)}/view`,
          {
            method: "POST",
          }
        );
      },
    },
    progress: {
      get(topicId: string): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress`
        );
      },
      create(
        topicId: string,
        payload: { currentSlideId?: string }
      ): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
      update(
        topicId: string,
        payload: {
          currentSlideId?: string;
          status?: "not_started" | "viewing_slides" | "quiz_unlocked" | "completed";
        }
      ): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      },
      batch(
        topicId: string,
        payload: {
          currentSlideId?: string;
          viewedSlideIds: string[];
        }
      ): Promise<ApiResult<{ attempt: any }>> {
        return apiFetch<{ attempt: any }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress/batch`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
    },
  },
  quizzes: {
    list(topicId: string): Promise<ApiResult<Quiz[]>> {
      return apiFetch<Quiz[]>(
        `/certification/quizzes?topicId=${encodeURIComponent(topicId)}`
      );
    },
    byId(quizId: string): Promise<ApiResult<Quiz>> {
      return apiFetch<Quiz>(
        `/certification/quizzes/${encodeURIComponent(quizId)}`
      );
    },
    create(data: {
      topicId: string;
      title: string;
      description?: string | null;
      passingScorePercentage?: number;
      timeLimitMinutes?: number | null;
      maxAttempts?: number | null;
      isRequired?: boolean;
      sequenceType?: "sequential" | "user_choice";
      sortOrder?: number;
    }): Promise<ApiResult<Quiz>> {
      return apiFetch<Quiz>("/certification/quizzes", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(
      quizId: string,
      data: {
        title?: string;
        description?: string | null;
        passingScorePercentage?: number;
        timeLimitMinutes?: number | null;
        maxAttempts?: number | null;
        isRequired?: boolean;
        sequenceType?: "sequential" | "user_choice";
        sortOrder?: number;
        status?: "draft" | "published" | "archived";
      }
    ): Promise<ApiResult<Quiz>> {
      return apiFetch<Quiz>(
        `/certification/quizzes/${encodeURIComponent(quizId)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );
    },
    delete(quizId: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/certification/quizzes/${encodeURIComponent(quizId)}`,
        {
          method: "DELETE",
        }
      );
    },
    start(quizId: string, data: {
      courseId: string;
      topicProgressId?: string | null;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>(
        `/certification/quizzes/${encodeURIComponent(quizId)}/start`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },
    questions: {
      list(quizId: string): Promise<ApiResult<QuizQuestion[]>> {
        return apiFetch<QuizQuestion[]>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/questions`
        );
      },
      byId(quizId: string, questionId: string): Promise<ApiResult<QuizQuestion>> {
        return apiFetch<QuizQuestion>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`
        );
      },
      create(quizId: string, data: {
        questionText: string;
        questionType?: "multiple_choice" | "single_choice" | "true_false";
        allowMultipleSelections?: boolean;
        explanation?: string | null;
        points?: number;
        orderIndex?: number;
        questionUrls?: Record<string, string> | null;
      }): Promise<ApiResult<QuizQuestion>> {
        return apiFetch<QuizQuestion>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/questions`,
          {
            method: "POST",
            body: JSON.stringify(data),
          }
        );
      },
      update(
        quizId: string,
        questionId: string,
        data: {
          questionText?: string;
          questionType?: "multiple_choice" | "single_choice" | "true_false";
          allowMultipleSelections?: boolean;
          explanation?: string | null;
          points?: number;
          orderIndex?: number;
          questionUrls?: Record<string, string> | null;
        }
      ): Promise<ApiResult<QuizQuestion>> {
        return apiFetch<QuizQuestion>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
        );
      },
      delete(quizId: string, questionId: string): Promise<ApiResult<{ success: boolean }>> {
        return apiFetch<{ success: boolean }>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
          {
            method: "DELETE",
          }
        );
      },
      answers: {
        list(quizId: string, questionId: string): Promise<ApiResult<QuizAnswer[]>> {
          return apiFetch<QuizAnswer[]>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/answers`
          );
        },
        create(quizId: string, questionId: string, data: {
          answerText: string;
          isCorrect: boolean;
          orderIndex?: number;
        }): Promise<ApiResult<QuizAnswer>> {
          return apiFetch<QuizAnswer>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/answers`,
            {
              method: "POST",
              body: JSON.stringify(data),
            }
          );
        },
        update(
          quizId: string,
          questionId: string,
          answerId: string,
          data: {
            answerText?: string;
            isCorrect?: boolean;
            orderIndex?: number;
          }
        ): Promise<ApiResult<QuizAnswer>> {
          return apiFetch<QuizAnswer>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/answers/${encodeURIComponent(answerId)}`,
            {
              method: "PUT",
              body: JSON.stringify(data),
            }
          );
        },
        delete(
          quizId: string,
          questionId: string,
          answerId: string
        ): Promise<ApiResult<{ success: boolean }>> {
          return apiFetch<{ success: boolean }>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/answers/${encodeURIComponent(answerId)}`,
            {
              method: "DELETE",
            }
          );
        },
      },
    },
    attempts: {
      byId(quizId: string, attemptId: string): Promise<ApiResult<any>> {
        return apiFetch<any>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}`
        );
      },
      answers: {
        list(quizId: string, attemptId: string): Promise<ApiResult<any[]>> {
          return apiFetch<any[]>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/answers`
          );
        },
        submit(quizId: string, attemptId: string, data: {
          questionId: string;
          answerId: string;
          timeTakenSeconds?: number;
        }): Promise<ApiResult<any>> {
          return apiFetch<any>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/answers`,
            {
              method: "POST",
              body: JSON.stringify(data),
            }
          );
        },
        update(quizId: string, attemptId: string, data: {
          questionId: string;
          answerId: string;
          oldAnswerId?: string;
          timeTakenSeconds?: number;
        }): Promise<ApiResult<any>> {
          return apiFetch<any>(
            `/certification/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/answers`,
            {
              method: "PUT",
              body: JSON.stringify(data),
            }
          );
        },
      },
      submit(quizId: string, attemptId: string): Promise<ApiResult<any>> {
        return apiFetch<any>(
          `/certification/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/submit`,
          {
            method: "POST",
          }
        );
      },
    },
  },
  slideSessions: {
    start(data: {
      slideId: string;
      topicId: string;
      courseId: string;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/slides/sessions/start", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    heartbeat(data: {
      sessionId: string;
      slideId: string;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/slides/sessions/heartbeat", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    pause(data: {
      sessionId: string;
      slideId: string;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/slides/sessions/pause", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    resume(data: {
      sessionId: string;
      slideId: string;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/slides/sessions/resume", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    end(data: {
      sessionId: string;
      slideId: string;
    }): Promise<ApiResult<any>> {
      return apiFetch<any>("/slides/sessions/end", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};
