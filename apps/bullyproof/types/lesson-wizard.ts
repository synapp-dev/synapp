export interface ClassOption {
  id: string;
  name: string;
  yearLevel: string;
  schoolId: string;
}

export interface TopicOption {
  id: string;
  title: string;
  stageCode: string;
  stageName: string;
  slideCount: number;
  description: string;
}

export interface WizardState {
  step: number;
  selectedClasses: ClassOption[];
  selectedTopic: TopicOption | null;
}

export type ScheduleOption = "immediate" | "scheduled";

export interface LessonCreatePayload {
  schoolId: string;
  topicId: string;
  classIds: string[];
  status: 'preparing' | 'ready' | 'in_progress' | 'feedback' | 'completed' | 'cancelled';
}

