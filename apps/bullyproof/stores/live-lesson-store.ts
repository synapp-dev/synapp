import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LiveLessonState {
  isLive: boolean;
  schoolSlug: string | null;
  lessonId: string | null;
  title?: string | null;
  classCount?: number | null;
  startedAt?: string | null; // ISO string
  getUrl: () => string | null;
  startLiveLesson: (params: { schoolSlug: string; lessonId: string; title?: string; classCount?: number; startedAt?: string }) => void;
  stopLiveLesson: () => void;
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
        return `/schools/${schoolSlug}/lessons/${lessonId}`;
      },
      startLiveLesson: ({ schoolSlug, lessonId, title, classCount, startedAt }) =>
        set({ isLive: true, schoolSlug, lessonId, title: title ?? null, classCount: classCount ?? null, startedAt: startedAt ?? null }),
      stopLiveLesson: () => set({ isLive: false, schoolSlug: null, lessonId: null, title: null, classCount: null, startedAt: null }),
    }),
    {
      name: "live-lesson-store",
      partialize: (state) => ({ isLive: state.isLive, schoolSlug: state.schoolSlug, lessonId: state.lessonId, title: state.title, classCount: state.classCount, startedAt: state.startedAt }),
    }
  )
);


