import { useAuthFetch } from "@/hooks/useAuthFetch";

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
    endpoint: string,
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
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, params);
  };

  const post = async <T = any>(
    endpoint: string,
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
    endpoint: string,
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
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> => {
    return call<T>(endpoint, params, { method: "DELETE" });
  };

  return { call, get, post, put, delete: del };
}

// Example usage functions (replace with your actual endpoints)
export function useExampleApi() {
  const apiClient = useApiClient();

  return {
    // Example CRUD operations
    getItems: (params?: Record<string, string | number>) =>
      apiClient.get("items", params),
    getItem: (id: string | number) => apiClient.get("items/[id]", { id }),
    createItem: (data: any) => apiClient.post("items", data),
    updateItem: (id: string | number, data: any) =>
      apiClient.put("items/[id]", data, { id }),
    deleteItem: (id: string | number) => apiClient.delete("items/[id]", { id }),

    // Generic method for any endpoint
    call: <T = any>(
      endpoint: string,
      params?: Record<string, string | number>
    ) => apiClient.get<T>(endpoint, params),
  };
}
