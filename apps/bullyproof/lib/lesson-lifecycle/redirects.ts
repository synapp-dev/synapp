import type { LessonPersistedStatus, LessonSubPage } from "./types";

export function buildLessonPagePath(
  schoolSlug: string,
  lessonId: string,
  subPage: LessonSubPage
): string {
  if (subPage === "overview") {
    return `/schools/${schoolSlug}/lessons/${lessonId}`;
  }
  return `/schools/${schoolSlug}/lessons/${lessonId}/${subPage}`;
}

/** Default tab when landing on `/lessons/{id}` from server or links. */
export function getDefaultSubPageForStatus(
  status: LessonPersistedStatus | string | undefined | null
): "prepare" | "run-lesson" | "feedback" {
  if (status === "feedback" || status === "completed") {
    return "feedback";
  }
  if (status === "ready" || status === "in_progress") {
    return "run-lesson";
  }
  return "prepare";
}

export function getDefaultPagePath(
  schoolSlug: string,
  lessonId: string,
  status: LessonPersistedStatus | string | undefined | null
): string {
  return buildLessonPagePath(
    schoolSlug,
    lessonId,
    getDefaultSubPageForStatus(status)
  );
}

export function detectSubPageFromPathname(pathname: string): LessonSubPage {
  if (pathname.includes("/feedback")) return "feedback";
  if (pathname.includes("/run-lesson")) return "run-lesson";
  if (pathname.includes("/prepare")) return "prepare";
  if (pathname.includes("/deliver")) return "deliver";
  if (pathname.includes("/history")) return "history";
  return "overview";
}

/** Realtime listener: redirect when lesson enters feedback/completed. */
export function resolveRealtimeStatusRedirect(options: {
  schoolSlug: string;
  lessonId: string;
  newStatus: string;
  pathname: string;
}): string | null {
  const currentPage = detectSubPageFromPathname(options.pathname);

  if (
    (options.newStatus === "completed" || options.newStatus === "feedback") &&
    currentPage !== "feedback"
  ) {
    return buildLessonPagePath(options.schoolSlug, options.lessonId, "feedback");
  }

  return null;
}

/** Run-lesson page fallback when status refetch shows feedback. */
export function resolveRunLessonStatusRedirect(options: {
  schoolSlug: string;
  lessonId: string;
  status: string;
  isLessonCreator: boolean;
}): string | null {
  if (options.isLessonCreator && options.status === "feedback") {
    return buildLessonPagePath(
      options.schoolSlug,
      options.lessonId,
      "feedback"
    );
  }
  return null;
}
