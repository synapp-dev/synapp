import { describe, expect, it, vi } from "vitest";
import {
  buildCreateEventHistory,
  createLesson,
  type CreateLessonDeps,
} from "./create-lesson";

describe("buildCreateEventHistory", () => {
  it("records creator and status on create", () => {
    const events = buildCreateEventHistory("user-1", "Jane Doe", "ready");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "created",
      userId: "user-1",
      userName: "Jane Doe",
      payload: { status: "ready" },
    });
  });
});

describe("createLesson", () => {
  const baseInput = {
    schoolId: "school-1",
    topicId: "topic-1",
    classIds: ["class-1"],
    status: "preparing" as const,
  };

  it("resolves owner, writes metadata, and returns lesson details", async () => {
    const deps: CreateLessonDeps = {
      assertCanManage: vi.fn().mockResolvedValue(undefined),
      resolveOwner: vi.fn().mockResolvedValue({
        effectiveCreatedByUserId: "teacher-1",
        metadata: { createdByAdmin: { adminUserId: "admin-1" } },
      }),
      getCreatorDisplayName: vi.fn().mockResolvedValue("Teacher One"),
      insertLesson: vi.fn().mockResolvedValue({ id: "lesson-1" }),
      getLessonDetails: vi.fn().mockResolvedValue({ id: "lesson-1", status: "preparing" }),
    };

    const result = await createLesson(baseInput, deps);

    expect(deps.assertCanManage).toHaveBeenCalled();
    expect(deps.insertLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: "school-1",
        topicId: "topic-1",
        createdByUserId: "teacher-1",
        classIds: ["class-1"],
        metadata: expect.objectContaining({
          createdByAdmin: { adminUserId: "admin-1" },
          eventHistory: [
            expect.objectContaining({
              type: "created",
              userId: "teacher-1",
              userName: "Teacher One",
            }),
          ],
        }),
      })
    );
    expect(result).toEqual({ id: "lesson-1", status: "preparing" });
  });

  it("defaults event history status to preparing when omitted", async () => {
    const deps: CreateLessonDeps = {
      assertCanManage: vi.fn().mockResolvedValue(undefined),
      resolveOwner: vi.fn().mockResolvedValue({
        effectiveCreatedByUserId: "teacher-1",
      }),
      getCreatorDisplayName: vi.fn().mockResolvedValue(undefined),
      insertLesson: vi.fn().mockResolvedValue({ id: "lesson-1" }),
      getLessonDetails: vi.fn().mockResolvedValue({ id: "lesson-1" }),
    };

    await createLesson(
      { schoolId: "school-1", topicId: "topic-1" },
      deps
    );

    expect(deps.insertLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          eventHistory: [
            expect.objectContaining({
              payload: { status: "preparing" },
            }),
          ],
        }),
      })
    );
  });
});
