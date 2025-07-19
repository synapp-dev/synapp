import { useAuthFetch } from "@/hooks/useAuthFetch";

// Define all possible API endpoints
export type ApiEndpoint =
  | "organisations"
  | "organisations/[id]"
  | "organisations/id/[id]"
  | "organisations/slug/[slug]"
  | "users"
  | "users/[id]"
  | "users/[user_id]/organisations"
  | "users/[user_id]/app_roles"
  | "users/[user_id]/organisation_roles"
  | "users/[user_id]/platform_roles"
  | "apps"
  | "apps/[id]"
  | "modules"
  | "modules/[id]"
  | "packages"
  | "packages/[id]"
  | "permissions"
  | "permissions/[id]"
  | "app-roles"
  | "app-roles/[id]"
  | "organisation-roles"
  | "organisation-roles/[id]"
  | "platform-roles"
  | "platform-roles/[id]"
  | "system-users"
  | "system-users/[id]"
  | "action-types"
  | "action-types/[id]"
  | "actions"
  | "actions/[id]"
  | "app-module-role-access"
  | "app-module-role-access/[id]"
  | "app-templates"
  | "app-templates/[id]"
  | "app-template-package-exclusions"
  | "app-template-package-exclusions/[id]"
  | "permission-target-types"
  | "permission-target-types/[id]"
  | "scopes"
  | "scopes/[id]";

// Generic response type
export type ApiResponse<T = any> = {
  success: boolean;
  data: T;
  error?: string;
};

// Hook-based API client
export function useApiClient() {
  const authFetch = useAuthFetch();

  // Generic method to call any endpoint
  const call = async <T = any>(
    endpoint: ApiEndpoint,
    pathParams?: Record<string, string | number>,
    options?: RequestInit,
    queryParams?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    try {
      // Replace [id] placeholders with actual values
      let url = `/api/${endpoint}`;
      if (pathParams) {
        Object.entries(pathParams).forEach(([key, value]) => {
          url = url.replace(`[${key}]`, String(value));
        });
      }

      // Add query parameters
      if (queryParams) {
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
        url += `?${searchParams.toString()}`;
      }

      const response = await authFetch(url, options);

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // Convenience methods for common operations
  const get = async <T = any>(
    endpoint: ApiEndpoint,
    pathParams?: Record<string, string | number>,
    queryParams?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, pathParams, undefined, queryParams);
  };

  const post = async <T = any>(
    endpoint: ApiEndpoint,
    data: any,
    pathParams?: Record<string, string | number>,
    queryParams?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, pathParams, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }, queryParams);
  };

  const put = async <T = any>(
    endpoint: ApiEndpoint,
    data: any,
    pathParams?: Record<string, string | number>,
    queryParams?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, pathParams, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }, queryParams);
  };

  const del = async <T = any>(
    endpoint: ApiEndpoint,
    pathParams?: Record<string, string | number>,
    queryParams?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, pathParams, { method: "DELETE" }, queryParams);
  };

  return { call, get, post, put, delete: del };
}

// Convenience functions for common endpoints (these need to be used within components)
export function useDatabaseEndpoint() {
  const apiClient = useApiClient();


  return {
    // Organisations
    organisations: (params?: Record<string, string | number>) =>
      apiClient.get("organisations", undefined, params),
    organisationById: (id: string) =>
      apiClient.get("organisations/[id]", { id }),
    organisationBySlug: (slug: string) =>
      apiClient.get("organisations/[id]", { id: slug }, { slug: "true" }),
    createOrganisation: (data: any) => apiClient.post("organisations", data),
    updateOrganisation: (id: string | number, data: any) =>
      apiClient.put("organisations/[id]", data, { id }),
    deleteOrganisation: (id: string | number) =>
      apiClient.delete("organisations/[id]", { id }),

    // Users
    users: (params?: Record<string, string | number>) =>
      apiClient.get("users", undefined, params),
    user: (id: string | number) => apiClient.get("users/[id]", { id }),
    createUser: (data: any) => apiClient.post("users", data),
    updateUser: (id: string | number, data: any) =>
      apiClient.put("users/[id]", data, { id }),
    deleteUser: (id: string | number) => apiClient.delete("users/[id]", { id }),

    // Apps
    apps: (params?: Record<string, string | number>) =>
      apiClient.get("apps", undefined, params),
    app: (id: string | number) => apiClient.get("apps/[id]", { id }),
    createApp: (data: any) => apiClient.post("apps", data),
    updateApp: (id: string | number, data: any) =>
      apiClient.put("apps/[id]", data, { id }),
    deleteApp: (id: string | number) => apiClient.delete("apps/[id]", { id }),

    // Modules
    modules: (params?: Record<string, string | number>) =>
      apiClient.get("modules", undefined, params),
    module: (id: string | number) => apiClient.get("modules/[id]", { id }),
    createModule: (data: any) => apiClient.post("modules", data),
    updateModule: (id: string | number, data: any) =>
      apiClient.put("modules/[id]", data, { id }),
    deleteModule: (id: string | number) =>
      apiClient.delete("modules/[id]", { id }),

    // User Organisation Roles (nested under user)
    userOrganisations: (userId: string | number) =>
      apiClient.get("users/[user_id]/organisations", { user_id: userId }),
    userAppRoles: (userId: string | number, params?: Record<string, string | number>) =>
      apiClient.get("users/[user_id]/app_roles", { user_id: userId }, params),
    userOrganisationRoles: (userId: string | number, params?: Record<string, string | number>) =>
      apiClient.get("users/[user_id]/organisation_roles", { user_id: userId }, params),
    userPlatformRoles: (userId: string | number, params?: Record<string, string | number>) =>
      apiClient.get("users/[user_id]/platform_roles", { user_id: userId }, params),
    createUserAppRole: (userId: string | number, data: any) =>
      apiClient.post("users/[user_id]/app_roles", data, { user_id: userId }),
    createUserOrganisationRole: (userId: string | number, data: any) =>
      apiClient.post("users/[user_id]/organisation_roles", data, { user_id: userId }),
    createUserPlatformRole: (userId: string | number, data: any) =>
      apiClient.post("users/[user_id]/platform_roles", data, { user_id: userId }),

    // General Role Management
    appRoles: (params?: Record<string, string | number>) =>
      apiClient.get("app-roles", undefined, params),
    appRole: (id: string | number) =>
      apiClient.get("app-roles/[id]", { id }),
    createAppRole: (data: any) => apiClient.post("app-roles", data),
    updateAppRole: (id: string | number, data: any) =>
      apiClient.put("app-roles/[id]", data, { id }),
    deleteAppRole: (id: string | number) =>
      apiClient.delete("app-roles/[id]", { id }),

    organisationRoles: (params?: Record<string, string | number>) =>
      apiClient.get("organisation-roles", undefined, params),
    organisationRole: (id: string | number) =>
      apiClient.get("organisation-roles/[id]", { id }),
    createOrganisationRole: (data: any) => apiClient.post("organisation-roles", data),
    updateOrganisationRole: (id: string | number, data: any) =>
      apiClient.put("organisation-roles/[id]", data, { id }),
    deleteOrganisationRole: (id: string | number) =>
      apiClient.delete("organisation-roles/[id]", { id }),

    platformRoles: (params?: Record<string, string | number>) =>
      apiClient.get("platform-roles", undefined, params),
    platformRole: (id: string | number) =>
      apiClient.get("platform-roles/[id]", { id }),
    createPlatformRole: (data: any) => apiClient.post("platform-roles", data),
    updatePlatformRole: (id: string | number, data: any) =>
      apiClient.put("platform-roles/[id]", data, { id }),
    deletePlatformRole: (id: string | number) =>
      apiClient.delete("platform-roles/[id]", { id }),

    // Generic method for any endpoint
    call: <T = any>(
      endpoint: ApiEndpoint,
      pathParams?: Record<string, string | number>,
      queryParams?: Record<string, string | number>
    ) => apiClient.get<T>(endpoint, pathParams, queryParams),
  };
}
