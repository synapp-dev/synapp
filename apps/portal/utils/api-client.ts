import { useAuthFetch } from "@/hooks/useAuthFetch";

// Define all possible API endpoints
export type ApiEndpoint =
  | "organisations"
  | "organisations/[id]"
  | "users"
  | "users/[id]"
  | "apps"
  | "apps/[id]"
  | "modules"
  | "modules/[id]"
  | "packages"
  | "packages/[id]"
  | "permissions"
  | "permissions/[id]"
  | "roles"
  | "roles/[id]"
  | "user-organisation-roles"
  | "user-organisation-roles/[id]"
  | "user-app-roles"
  | "user-app-roles/[id]"
  | "user-platform-roles"
  | "user-platform-roles/[id]"
  | "system-users"
  | "system-users/[id]"
  | "action-types"
  | "action-types/[id]"
  | "actions"
  | "actions/[id]"
  | "app-roles"
  | "app-roles/[id]"
  | "app-module-role-access"
  | "app-module-role-access/[id]"
  | "app-templates"
  | "app-templates/[id]"
  | "app-template-package-exclusions"
  | "app-template-package-exclusions/[id]"
  | "organisation-roles"
  | "organisation-roles/[id]"
  | "platform-roles"
  | "platform-roles/[id]"
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
    params?: Record<string, string | number>,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    try {
      // Replace [id] placeholders with actual values
      let url = `/api/${endpoint}`;
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url = url.replace(`[${key}]`, String(value));
        });
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
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, params);
  };

  const post = async <T = any>(
    endpoint: ApiEndpoint,
    data: any,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, params, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const put = async <T = any>(
    endpoint: ApiEndpoint,
    data: any,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, params, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const del = async <T = any>(
    endpoint: ApiEndpoint,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, params, { method: "DELETE" });
  };

  return { call, get, post, put, delete: del };
}

// Convenience functions for common endpoints (these need to be used within components)
export function useDatabaseEndpoint() {
  const apiClient = useApiClient();

  return {
    // Organisations
    organisations: (params?: Record<string, string | number>) =>
      apiClient.get("organisations", params),
    organisation: (id: string | number) =>
      apiClient.get("organisations/[id]", { id }),
    createOrganisation: (data: any) => apiClient.post("organisations", data),
    updateOrganisation: (id: string | number, data: any) =>
      apiClient.put("organisations/[id]", data, { id }),
    deleteOrganisation: (id: string | number) =>
      apiClient.delete("organisations/[id]", { id }),

    // Users
    users: (params?: Record<string, string | number>) =>
      apiClient.get("users", params),
    user: (id: string | number) => apiClient.get("users/[id]", { id }),
    createUser: (data: any) => apiClient.post("users", data),
    updateUser: (id: string | number, data: any) =>
      apiClient.put("users/[id]", data, { id }),
    deleteUser: (id: string | number) => apiClient.delete("users/[id]", { id }),

    // Apps
    apps: (params?: Record<string, string | number>) =>
      apiClient.get("apps", params),
    app: (id: string | number) => apiClient.get("apps/[id]", { id }),
    createApp: (data: any) => apiClient.post("apps", data),
    updateApp: (id: string | number, data: any) =>
      apiClient.put("apps/[id]", data, { id }),
    deleteApp: (id: string | number) => apiClient.delete("apps/[id]", { id }),

    // Modules
    modules: (params?: Record<string, string | number>) =>
      apiClient.get("modules", params),
    module: (id: string | number) => apiClient.get("modules/[id]", { id }),
    createModule: (data: any) => apiClient.post("modules", data),
    updateModule: (id: string | number, data: any) =>
      apiClient.put("modules/[id]", data, { id }),
    deleteModule: (id: string | number) =>
      apiClient.delete("modules/[id]", { id }),

    // User Organisation Roles
    userOrganisationRoles: (params?: Record<string, string | number>) =>
      apiClient.get("user-organisation-roles", params),
    userOrganisationRole: (id: string | number) =>
      apiClient.get("user-organisation-roles/[id]", { id }),
    createUserOrganisationRole: (data: any) =>
      apiClient.post("user-organisation-roles", data),
    updateUserOrganisationRole: (id: string | number, data: any) =>
      apiClient.put("user-organisation-roles/[id]", data, { id }),
    deleteUserOrganisationRole: (id: string | number) =>
      apiClient.delete("user-organisation-roles/[id]", { id }),

    // Generic method for any endpoint
    call: <T = any>(
      endpoint: ApiEndpoint,
      params?: Record<string, string | number>
    ) => apiClient.get<T>(endpoint, params),
  };
}
