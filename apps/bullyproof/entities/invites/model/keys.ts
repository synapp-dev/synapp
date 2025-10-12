export const invitesKeys = {
  all: () => ["invites"] as const,
  list: () => [...invitesKeys.all(), "list"] as const,
  listInvites: (params?: {
    schoolId?: string;
    email?: string;
    status?: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
    limit?: number;
    offset?: number;
  }) => [...invitesKeys.all(), "listInvites", params] as const,
  detail: (id: string) => [...invitesKeys.all(), "detail", id] as const,
  bySchool: (schoolId: string) => [...invitesKeys.all(), "bySchool", schoolId] as const,
  byEmail: (email: string) => [...invitesKeys.all(), "byEmail", email] as const,
};
