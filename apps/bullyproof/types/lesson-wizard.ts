export type ScheduleOption = 'immediate' | 'scheduled';

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
  scheduleOption: ScheduleOption;
  scheduledDate: string;
  scheduledTime: string;
}

export interface LessonCreatePayload {
  schoolId: string;
  topicId: string;
  classIds: string[];
  status: 'draft' | 'scheduled' | 'in_progress';
  scheduledFor?: string;
}

