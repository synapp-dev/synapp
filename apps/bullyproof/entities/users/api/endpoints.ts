import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { UserLookupResponse } from "@/entities/users/types/user-lookup";

export type CreateSchoolAdminResponse = {
  userId: string;
  email: string;
  schoolId: string;
};

export type CreateTeacherResponse = {
  userId: string;
  email: string;
  schoolId: string;
};

export type CreatePlatformAdminResponse = {
  userId: string;
  email: string;
};

export type CreateSchoolLicenseResponse = {
  id: string;
  schoolId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  school?: any;
  createdByUser?: any;
};

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

export type UpdateUserResponse = {
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

export const usersApi = {
  get: {
    lookup(params: {
      email: string;
      schoolId?: string;
    }): Promise<ApiResult<UserLookupResponse>> {
      const searchParams = new URLSearchParams({ email: params.email });
      if (params.schoolId) {
        searchParams.set("schoolId", params.schoolId);
      }
      return apiFetch<UserLookupResponse>(
        `/users/lookup?${searchParams.toString()}`
      );
    },
  },
  post: {
    new: {
      schoolAdmin(payload: {
        schoolId: string;
        email: string;
        firstName?: string;
        lastName?: string;
      }): Promise<ApiResult<CreateSchoolAdminResponse>> {
        return apiFetch<CreateSchoolAdminResponse>("/users/new/school-admin", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
      teacher(payload: {
        schoolId: string;
        email: string;
        firstName?: string;
        lastName?: string;
      }): Promise<ApiResult<CreateTeacherResponse>> {
        return apiFetch<CreateTeacherResponse>("/users/new/teacher", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
      platformAdmin(payload: {
        email: string;
        firstName?: string;
        lastName?: string;
      }): Promise<ApiResult<CreatePlatformAdminResponse>> {
        return apiFetch<CreatePlatformAdminResponse>(
          "/users/new/platform-admin",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
      schoolLicense(payload: {
        schoolId: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        status?: "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
        durationYears?: number;
        maxUsers?: number;
        features?: Record<string, any>;
        metadata?: Record<string, any>;
      }): Promise<ApiResult<CreateSchoolLicenseResponse>> {
        return apiFetch<CreateSchoolLicenseResponse>(
          "/users/new/school-license",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      },
    },
  },
  patch: {
    update(
      userId: string,
      payload: {
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    ): Promise<ApiResult<UpdateUserResponse>> {
      return apiFetch<UpdateUserResponse>(`/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
  },
};

