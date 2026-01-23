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
    ratings: {
      submit(
        courseId: string,
        data: { rating: number; comment?: string | null }
      ): Promise<ApiResult<{ id: string; rating: number; comment: string | null; createdAt: string; updatedAt: string }>> {
        return apiFetch<{ id: string; rating: number; comment: string | null; createdAt: string; updatedAt: string }>(
          `/certification/courses/${encodeURIComponent(courseId)}/ratings`,
          {
            method: "POST",
            body: JSON.stringify(data),
          }
        );
      },
      check(
        courseId: string
      ): Promise<ApiResult<{ hasRated: boolean; rating?: { id: string; rating: number; comment: string | null; createdAt: string } }>> {
        return apiFetch<{ hasRated: boolean; rating?: { id: string; rating: number; comment: string | null; createdAt: string } }>(
          `/certification/courses/${encodeURIComponent(courseId)}/ratings/check`
        );
      },
      getAll(
        courseId: string
      ): Promise<ApiResult<Array<{ id: string; userId: string; courseId: string; rating: number; comment: string | null; createdAt: string; updatedAt: string; questionMetadata: Record<string, any> | null }>>> {
        return apiFetch<Array<{ id: string; userId: string; courseId: string; rating: number; comment: string | null; createdAt: string; updatedAt: string; questionMetadata: Record<string, any> | null }>>(
          `/certification/courses/${encodeURIComponent(courseId)}/ratings`
        );
      },
    },
    unrated(): Promise<ApiResult<Array<{ id: string; name: string; completedAt: string | null }>>> {
      return apiFetch<Array<{ id: string; name: string; completedAt: string | null }>>(
        "/certification/courses/unrated"
      );
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
        ratingQuestions?: Array<{
          id: string;
          type: "text" | "rating" | "multiple_choice";
          label: string;
          required: boolean;
          options?: string[];
          min?: number;
          max?: number;
        }> | null;
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
    bySlugWithCourse(
      courseSlug: string,
      topicSlug: string
    ): Promise<ApiResult<{
      topic: Topic;
      slides: Slide[];
      attempt: any | null;
      isUnlocked: boolean;
      unlockReason?: string;
    }>> {
      return apiFetch<{
        topic: Topic;
        slides: Slide[];
        attempt: any | null;
        isUnlocked: boolean;
        unlockReason?: string;
      }>(
        `/certification/topics/by-slug-with-course/${encodeURIComponent(topicSlug)}?course=${encodeURIComponent(courseSlug)}`
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
      withProgress(topicId: string): Promise<ApiResult<{ slides: Slide[]; attempt: any | null }>> {
        return apiFetch<{ slides: Slide[]; attempt: any | null }>(
          `/certification/topics/${encodeURIComponent(topicId)}/slides-with-progress`
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
      complete(
        topicId: string,
        payload: { currentSlideId?: string }
      ): Promise<ApiResult<{ attempt: any; hasQuiz: boolean }>> {
        return apiFetch<{ attempt: any; hasQuiz: boolean }>(
          `/certification/topics/${encodeURIComponent(topicId)}/progress/complete`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
      getQuizInProgress(topicId: string): Promise<ApiResult<any | null>> {
        return apiFetch<any | null>(
          `/certification/topics/${encodeURIComponent(topicId)}/quiz-in-progress`
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
    bySlugs(
      courseSlug: string,
      topicSlug: string,
      quizSlug: string
    ): Promise<ApiResult<{
      quiz: any;
      attempt: any | null;
      existingAnswers: any[];
      earliestUnansweredQuestionIndex: number;
      course: any;
      topic: any;
    }>> {
      return apiFetch<any>(
        `/certification/quizzes/by-slugs?course=${encodeURIComponent(courseSlug)}&topic=${encodeURIComponent(topicSlug)}&quiz=${encodeURIComponent(quizSlug)}`
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
          answerIds: string[]; // Array of answer IDs (supports single and multiple choice)
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
