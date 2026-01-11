// Client bundle should import the client fetcher; server-only code can use the server fetcher if needed
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { vUserProfileExpanded, vSchoolsEnriched } from "@/drizzle/schema";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;
type School = typeof vSchoolsEnriched.$inferSelect;

export type UpdateLogChange = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

export type UpdateLog = {
  type?: "creation" | "update";
  updatedAt: string;
  updatedBy: string;
  changes?: UpdateLogChange[];
};

export type RoleLog = {
  action: "assigned" | "removed";
  roleId: string;
  roleName: string;
  roleKey: string | null;
  schoolId: string | null;
  schoolName: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type UserWithRolesAndSchools = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: {
    updateLogs?: UpdateLog[];
    roleLogs?: RoleLog[];
    [key: string]: any;
  } | null;
  platformRoles: string[];
  schoolRoles: Array<{
    schoolId: string;
    schoolName: string | null;
    roleKey: string | null;
    roleName: string | null;
  }>;
};

export type TutorialProgress = {
  [key: string]: {
    completed: boolean;
    completedAt?: string;
  };
};

export type DialogProgress = {
  [key: string]: {
    dismissed: boolean;
    dismissedAt?: string;
  };
};

export const meApi = {
  get: {
    currentUser(): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>("/me");
    },
    userById(id: string): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>(`/users/${encodeURIComponent(id)}`);
    },
    userByEmail(email: string): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>(
        `/users?email=${encodeURIComponent(email)}`
      );
    },
    listAllUsers(params?: {
      limit?: number;
      offset?: number;
      search?: string;
      role?: string;
      schoolId?: string;
    }): Promise<ApiResult<UserWithRolesAndSchools[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      if (params?.search) searchParams.set("search", params.search);
      if (params?.role) searchParams.set("role", params.role);
      if (params?.schoolId) searchParams.set("schoolId", params.schoolId);

      const query = searchParams.toString();
      return apiFetch<UserWithRolesAndSchools[]>(
        `/users${query ? `?${query}` : ""}`
      );
    },
  },
  put: {
    updateProfile(payload: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
      metadata?: Record<string, unknown>;
    }): Promise<ApiResult<UserProfile | null>> {
      return apiFetch<UserProfile | null>("/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
  tutorials: {
    get(): Promise<ApiResult<{ tutorials: TutorialProgress }>> {
      return apiFetch<{ tutorials: TutorialProgress }>("/me/tutorials");
    },
    complete(
      tutorialKey: string
    ): Promise<ApiResult<{ tutorials: TutorialProgress }>> {
      return apiFetch<{ tutorials: TutorialProgress }>("/me/tutorials", {
        method: "PATCH",
        body: JSON.stringify({ tutorialKey, completed: true }),
      });
    },
  },
  schools: {
    get: {
      mySchools(params?: {
        limit?: number;
        random?: boolean;
      }): Promise<ApiResult<School[]>> {
        const searchParams = new URLSearchParams();
        if (params?.limit) searchParams.set("limit", params.limit.toString());
        if (params?.random)
          searchParams.set("random", params.random.toString());

        const query = searchParams.toString();
        return apiFetch<School[]>(`/me/schools${query ? `?${query}` : ""}`);
      },
      schoolsForUser(
        userId: string,
        params?: { limit?: number }
      ): Promise<ApiResult<School[]>> {
        const searchParams = new URLSearchParams();
        searchParams.set("userId", userId);
        if (params?.limit) searchParams.set("limit", params.limit.toString());

        return apiFetch<School[]>(`/me/schools?${searchParams.toString()}`);
      },
    },
  },
  teacherClasses: {
    get(): Promise<ApiResult<{ hasClasses: boolean }>> {
      return apiFetch<{ hasClasses: boolean }>("/me/teacher-classes");
    },
    getSchoolsWithClasses(): Promise<ApiResult<{ schoolIds: string[] }>> {
      return apiFetch<{ schoolIds: string[] }>("/me/teacher-classes/schools");
    },
  },
  dialogs: {
    dismiss(
      dialogKey: string
    ): Promise<ApiResult<{ dialogs: DialogProgress }>> {
      return apiFetch<{ dialogs: DialogProgress }>("/me/dialogs", {
        method: "PATCH",
        body: JSON.stringify({ dialogKey, dismissed: true }),
      });
    },
  },
};
