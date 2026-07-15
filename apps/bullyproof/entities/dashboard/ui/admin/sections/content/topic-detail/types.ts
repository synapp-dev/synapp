import type { CourseTopicRow, TopicRow, TopicSlideRow } from "@/types/db";
import type { SlideData } from "@/components/organisms/slide-renderer";

export type Topic = TopicRow & {
  stage?: any;
  slides?: Array<TopicSlideRow>;
};

export type CertificationTopic = CourseTopicRow & {
  slides?: Array<TopicSlideRow>;
};

export type TopicContext = "curriculum" | "certification";

// Local state for slides (working copy)
// ExtendedSlideData is the same as SlideData (which now includes quizData)
export type ExtendedSlideData = SlideData;

// Change type for the changes dialog
export type ChangeItem =
  | {
      type: "delete";
      message: string;
      slideNumber: number;
      slide: ExtendedSlideData;
    }
  | {
      type: "new";
      message: string;
      slide: ExtendedSlideData;
      slideNumber: number;
    }
  | {
      type: "replace";
      message: string;
      slideNumber: number;
      slide: ExtendedSlideData;
      oldSlide: ExtendedSlideData;
    }
  | {
      type: "reorder";
      message: string;
      slide: ExtendedSlideData;
      oldPosition: number;
      newPosition: number;
    };

export type LessonPlan = {
  id: string;
  topicId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
};
