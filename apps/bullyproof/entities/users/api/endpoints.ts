import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

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

export const usersApi = {
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
};

