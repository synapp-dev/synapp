export const PROJECT_STATUSES = [
  "active",
  "paused",
  "done",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#ec4899",
  "#64748b",
] as const;

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  orderIndex?: number;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  orderIndex?: number;
};
